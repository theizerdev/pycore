"""
Capa 1 del Agente Clínico Propio (MediCore AI Local):
Motor de Visión y Extracción Documental 100% Local ($0 APIs externas).

Capacidades:
- PDFs digitales con tablas: `pdfplumber` (preserva columnas Parámetro | Valor | Unidad | Referencia).
- PDFs digitales estándar: fallback con `pypdf`.
- PDFs escaneados (imagen dentro de PDF): renderizado nativo con `pypdfium2` + OCR neuronal `RapidOCR`.
- Fotografías de celular (WhatsApp / cámara): auto-orientación EXIF, corrección de contraste/iluminación
  con OpenCV/Pillow + `RapidOCR` (ONNX PaddleOCR v4) con reconstrucción espacial fila-por-fila.
- Análisis de calidad técnica de imagen para placas diagnósticas (Rx, Eco, Panorámicas) sin texto.
"""
from __future__ import annotations

import io
import logging
import math
import threading
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from PIL import Image, ImageEnhance, ImageOps

logger = logging.getLogger("medicore_document_vision")

# Singleton thread-safe para RapidOCR (carga los modelos ONNX una sola vez en memoria)
_OCR_ENGINE = None
_OCR_LOCK = threading.Lock()
_OCR_INIT_ERROR: Optional[str] = None


def get_rapidocr_engine():
    global _OCR_ENGINE, _OCR_INIT_ERROR
    if _OCR_ENGINE is not None:
        return _OCR_ENGINE
    if _OCR_INIT_ERROR is not None:
        return None
    with _OCR_LOCK:
        if _OCR_ENGINE is not None:
            return _OCR_ENGINE
        try:
            from rapidocr_onnxruntime import RapidOCR

            engine = RapidOCR()
            try:
                engine.text_score = 0.35
                if hasattr(engine, "text_detector") and hasattr(engine.text_detector, "postprocess_op"):
                    engine.text_detector.postprocess_op.box_thresh = 0.35
                    engine.text_detector.postprocess_op.unclip_ratio = 1.8
            except Exception:
                pass
            _OCR_ENGINE = engine
            logger.info("🧠 [MediCore Vision] Motor RapidOCR (ONNX) inicializado correctamente en CPU.")
            return _OCR_ENGINE
        except Exception as e:
            _OCR_INIT_ERROR = str(e)
            logger.warning(f"⚠️ [MediCore Vision] RapidOCR no disponible: {e}")
            return None


def is_ocr_available() -> bool:
    try:
        import rapidocr_onnxruntime  # noqa: F401
        return True
    except Exception:
        return False


def is_pdfplumber_available() -> bool:
    try:
        import pdfplumber  # noqa: F401
        return True
    except Exception:
        return False


@dataclass
class DocumentExtractionResult:
    text: str = ""
    table_rows: List[List[str]] = field(default_factory=list)
    method: str = "none"  # pdfplumber_tables | pdfplumber_text | pypdf_text | rapidocr_image | rapidocr_scanned_pdf | visual_image_only
    ocr_confidence: Optional[float] = None
    pages_processed: int = 0
    is_visual_only: bool = False
    image_quality: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)


def _clean_cell(val: Any) -> str:
    if val is None:
        return ""
    return " ".join(str(val).replace("\r", " ").replace("\n", " ").split()).strip()


def _extract_pdf_with_pdfplumber(file_bytes: bytes, max_pages: int = 8) -> Tuple[str, List[List[str]], int]:
    """Extrae tablas estructuradas y texto preservando alineación visual de PDFs digitales."""
    try:
        import pdfplumber
    except Exception:
        return "", [], 0

    text_chunks: List[str] = []
    table_rows: List[List[str]] = []
    pages_processed = 0

    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages[:max_pages]:
                pages_processed += 1
                # 1. Intentar extracción estructurada de tablas
                try:
                    tables = page.extract_tables() or []
                    for tbl in tables:
                        for row in tbl or []:
                            cleaned = [_clean_cell(c) for c in (row or [])]
                            if any(cleaned):
                                table_rows.append(cleaned)
                except Exception:
                    pass

                # 2. Extraer texto respetando layout horizontal (ideal para reportes sin bordes de tabla)
                page_text = ""
                try:
                    page_text = page.extract_text(layout=True, x_tolerance=2, y_tolerance=3) or ""
                except Exception:
                    try:
                        page_text = page.extract_text() or ""
                    except Exception:
                        page_text = ""

                if page_text.strip():
                    text_chunks.append(page_text.strip())
    except Exception as e:
        logger.debug(f"[MediCore Vision] pdfplumber fallback: {e}")

    return "\n\n".join(text_chunks).strip(), table_rows, pages_processed


def _extract_pdf_with_pypdf(file_bytes: bytes, max_pages: int = 8) -> Tuple[str, int]:
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(file_bytes))
        chunks = []
        pages = min(len(reader.pages), max_pages)
        for page in reader.pages[:pages]:
            txt = (page.extract_text() or "").strip()
            if txt:
                chunks.append(txt)
        return "\n\n".join(chunks).strip(), pages
    except Exception as e:
        logger.debug(f"[MediCore Vision] pypdf error: {e}")
        return "", 0


def _compute_image_quality(img_rgb: Image.Image) -> Dict[str, Any]:
    """Evalúa resolución, brillo, contraste y nitidez de una fotografía o placa médica."""
    w, h = img_rgb.size
    gray = np.array(img_rgb.convert("L"), dtype=np.float32)
    brightness = float(np.mean(gray))
    contrast = float(np.std(gray))

    # Varianza del Laplaciano (métrica clásica de nitidez/enfoque)
    sharpness = 0.0
    try:
        import cv2

        lap = cv2.Laplacian(gray.astype(np.uint8), cv2.CV_64F)
        sharpness = float(lap.var())
    except Exception:
        # Aproximación rápida por gradiente si cv2 no estuviera disponible
        gx = np.diff(gray, axis=1)
        gy = np.diff(gray, axis=0)
        sharpness = float(np.var(gx) + np.var(gy))

    issues = []
    if min(w, h) < 420:
        issues.append("resolución baja")
    if brightness < 35:
        issues.append("imagen muy oscura")
    elif brightness > 240:
        issues.append("imagen sobreexpuesta")
    if contrast < 22:
        issues.append("bajo contraste")
    if sharpness < 35:
        issues.append("posible desenfoque")

    if not issues and min(w, h) >= 800 and sharpness >= 80:
        label = "Óptima"
    elif len(issues) <= 1:
        label = "Adecuada"
    else:
        label = f"Limitada ({', '.join(issues)})"

    # Detectar si parece una imagen médica oscura (ecografía, radiografía, RMN, TAC)
    dark_pixel_ratio = float(np.mean(gray < 45))
    looks_like_medical_scan = dark_pixel_ratio > 0.42 and brightness < 95

    return {
        "width": w,
        "height": h,
        "megapixels": round((w * h) / 1_000_000.0, 2),
        "brightness": round(brightness, 1),
        "contrast": round(contrast, 1),
        "sharpness": round(sharpness, 1),
        "dark_pixel_ratio": round(dark_pixel_ratio, 2),
        "looks_like_medical_scan": looks_like_medical_scan,
        "calidad_label": label,
        "issues": issues,
    }


def _preprocess_image_for_ocr(img_rgb: Image.Image, enhance_clahe: bool = False) -> np.ndarray:
    """
    Prepara fotos tomadas con celular para máxima precisión de OCR:
    - Auto-rotación por EXIF.
    - Escalado inteligente (agranda imágenes pequeñas, limita fotos 4K para velocidad en CPU).
    - Mejora suave de contraste y nitidez (y CLAHE opcional para fotos con sombras/poca luz).
    """
    img = ImageOps.exif_transpose(img_rgb).convert("RGB")
    w, h = img.size
    max_dim = max(w, h)
    min_dim = min(w, h)

    if max_dim > 2200:
        scale = 2200.0 / max_dim
        img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)
    elif max_dim < 900 and min_dim > 100:
        scale = min(2.0, 1200.0 / max_dim)
        img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)

    if enhance_clahe:
        try:
            import cv2

            arr = np.array(img)
            lab = cv2.cvtColor(arr, cv2.COLOR_RGB2LAB)
            l_chan, a_chan, b_chan = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.4, tileGridSize=(8, 8))
            cl = clahe.apply(l_chan)
            merged = cv2.merge((cl, a_chan, b_chan))
            enhanced = cv2.cvtColor(merged, cv2.COLOR_LAB2RGB)
            return enhanced
        except Exception:
            pass

    img = ImageOps.autocontrast(img, cutoff=1)
    img = ImageEnhance.Sharpness(img).enhance(1.35)
    return np.array(img)


def _reconstruct_rows_from_ocr(ocr_items: List[Any]) -> Tuple[str, List[List[str]], float]:
    """
    Reconstruye el orden de lectura natural y las FILAS tabulares a partir de las cajas
    (bounding boxes) de RapidOCR. Crucial para fotos de hojas de laboratorio donde
    Parámetro, Resultado, Unidad y Referencia están en columnas separadas.
    """
    parsed_boxes: List[Dict[str, Any]] = []
    scores: List[float] = []

    for item in ocr_items or []:
        if not item or len(item) < 2:
            continue
        box = item[0]
        txt = _clean_cell(item[1])
        score = float(item[2]) if len(item) >= 3 and item[2] is not None else 0.85
        if not txt:
            continue
        scores.append(score)
        try:
            xs = [float(pt[0]) for pt in box]
            ys = [float(pt[1]) for pt in box]
            x_min, x_max = min(xs), max(xs)
            y_min, y_max = min(ys), max(ys)
            cy = (y_min + y_max) / 2.0
            h = max(y_max - y_min, 10.0)
        except Exception:
            x_min, x_max, cy, h = 0.0, 0.0, 0.0, 14.0

        parsed_boxes.append({
            "x_min": x_min,
            "x_max": x_max,
            "cy": cy,
            "h": h,
            "text": txt,
            "score": score,
        })

    if not parsed_boxes:
        return "", [], 0.0

    # Ordenar de arriba a abajo y agrupar elementos que comparten la misma línea horizontal
    parsed_boxes.sort(key=lambda b: (b["cy"], b["x_min"]))
    rows: List[List[Dict[str, Any]]] = []

    for b in parsed_boxes:
        placed = False
        for row in reversed(rows[-5:]):  # comparar con las últimas filas activas
            row_cy = sum(it["cy"] for it in row) / len(row)
            row_h = max(it["h"] for it in row)
            tolerance = max(min(row_h, b["h"]) * 0.62, 11.0)
            if abs(b["cy"] - row_cy) <= tolerance:
                row.append(b)
                placed = True
                break
        if not placed:
            rows.append([b])

    # Ordenar filas por posición vertical y columnas de izquierda a derecha
    rows.sort(key=lambda r: sum(it["cy"] for it in r) / len(r))

    text_lines: List[str] = []
    table_rows: List[List[str]] = []

    for row in rows:
        row.sort(key=lambda it: it["x_min"])
        # Fusionar palabras muy cercanas dentro de la misma celda y separar columnas distantes
        cells: List[str] = []
        current_cell = row[0]["text"]
        prev_x_max = row[0]["x_max"]
        avg_char_w = max(row[0]["h"] * 0.55, 8.0)

        for it in row[1:]:
            gap = it["x_min"] - prev_x_max
            if gap > avg_char_w * 2.2:
                cells.append(current_cell.strip())
                current_cell = it["text"]
            else:
                current_cell += " " + it["text"]
            prev_x_max = max(prev_x_max, it["x_max"])

        cells.append(current_cell.strip())
        table_rows.append(cells)
        text_lines.append("   ".join(cells))

    mean_conf = round(sum(scores) / max(len(scores), 1), 3)
    return "\n".join(text_lines).strip(), table_rows, mean_conf


def _run_ocr_on_pil_image(img_rgb: Image.Image) -> Tuple[str, List[List[str]], float]:
    engine = get_rapidocr_engine()
    if engine is None:
        return "", [], 0.0

    # Pasada 1: preprocesamiento balanceado
    arr1 = _preprocess_image_for_ocr(img_rgb, enhance_clahe=False)
    res1, _ = engine(arr1)
    text1, rows1, conf1 = _reconstruct_rows_from_ocr(res1 or [])

    # Si extrajo muy poco texto o confianza baja, intentar Pasada 2 con ecualización CLAHE (fotos oscuras/sombras)
    if len(text1) < 80 or conf1 < 0.68:
        arr2 = _preprocess_image_for_ocr(img_rgb, enhance_clahe=True)
        res2, _ = engine(arr2)
        text2, rows2, conf2 = _reconstruct_rows_from_ocr(res2 or [])
        if (len(text2) > len(text1) * 1.15) or (len(text2) >= len(text1) * 0.9 and conf2 > conf1 + 0.04):
            return text2, rows2, conf2

    return text1, rows1, conf1


def _render_pdf_pages_with_pypdfium2(file_bytes: bytes, max_pages: int = 5, scale: float = 2.2) -> List[Image.Image]:
    """Renderiza páginas de un PDF escaneado a imágenes PIL de alta nitidez sin dependencias externas."""
    images: List[Image.Image] = []
    try:
        import pypdfium2 as pdfium

        pdf = pdfium.PdfDocument(file_bytes)
        try:
            count = min(len(pdf), max_pages)
            for idx in range(count):
                page = pdf[idx]
                try:
                    bitmap = page.render(scale=scale)
                    pil_img = bitmap.to_pil().convert("RGB")
                    images.append(pil_img)
                finally:
                    page.close()
        finally:
            pdf.close()
    except Exception as e:
        logger.warning(f"[MediCore Vision] Error renderizando PDF con pypdfium2: {e}")
    return images


def extract_document_content(file_bytes: Optional[bytes], mime_type: str = "") -> DocumentExtractionResult:
    """
    Pipeline principal de extracción local de documentos clínicos:
    - PDFs digitales -> pdfplumber (tablas + layout) -> fallback pypdf.
    - PDFs escaneados (poco texto embebido) -> pypdfium2 + RapidOCR página por página.
    - Imágenes (JPG/PNG/WEBP) -> calidad técnica + RapidOCR con reconstrucción tabular.
    """
    result = DocumentExtractionResult()
    if not file_bytes:
        result.warnings.append("No se recibieron bytes del archivo.")
        return result

    mime = (mime_type or "").split(";")[0].strip().lower()
    is_pdf = "pdf" in mime or file_bytes[:5] == b"%PDF-"

    if is_pdf:
        # Paso 1: Intentar extracción directa con pdfplumber (tablas + layout)
        txt, rows, pages = _extract_pdf_with_pdfplumber(file_bytes, max_pages=8)
        result.pages_processed = pages

        # Fallback a pypdf si pdfplumber devolvió vacío
        if len(txt.strip()) < 30:
            txt_pypdf, pages_pypdf = _extract_pdf_with_pypdf(file_bytes, max_pages=8)
            if len(txt_pypdf) > len(txt):
                txt = txt_pypdf
                result.pages_processed = max(result.pages_processed, pages_pypdf)
                result.method = "pypdf_text"
        else:
            result.method = "pdfplumber_tables" if rows else "pdfplumber_text"

        # Paso 2: Si es un PDF escaneado (muy poco texto real embebido), activar pypdfium2 + RapidOCR
        alnum_chars = sum(1 for c in txt if c.isalnum())
        if alnum_chars < 65:
            logger.info("[MediCore Vision] PDF con poco texto embebido (escaneado). Ejecutando pypdfium2 + RapidOCR...")
            rendered_pages = _render_pdf_pages_with_pypdfium2(file_bytes, max_pages=5, scale=2.2)
            if rendered_pages:
                ocr_texts: List[str] = []
                ocr_rows: List[List[str]] = []
                confs: List[float] = []
                for p_img in rendered_pages:
                    p_txt, p_rows, p_conf = _run_ocr_on_pil_image(p_img)
                    if p_txt:
                        ocr_texts.append(p_txt)
                    ocr_rows.extend(p_rows)
                    if p_conf > 0:
                        confs.append(p_conf)
                combined_ocr = "\n\n".join(ocr_texts).strip()
                if len(combined_ocr) > len(txt):
                    result.text = combined_ocr
                    result.table_rows = ocr_rows
                    result.method = "rapidocr_scanned_pdf"
                    result.pages_processed = len(rendered_pages)
                    result.ocr_confidence = round(sum(confs) / max(len(confs), 1), 3) if confs else None
                    if len(combined_ocr) < 60:
                        result.is_visual_only = True
                        result.image_quality = _compute_image_quality(rendered_pages[0])
                    return result

        result.text = txt
        result.table_rows = rows
        result.ocr_confidence = 1.0 if alnum_chars >= 65 else None
        if alnum_chars < 40:
            result.is_visual_only = True
        return result

    # --- Caso Imagen (JPG / PNG / WEBP / BMP / TIFF) ---
    try:
        pil_img = Image.open(io.BytesIO(file_bytes))
        pil_img = ImageOps.exif_transpose(pil_img).convert("RGB")
    except Exception as e:
        result.warnings.append(f"No se pudo decodificar la imagen: {e}")
        return result

    result.pages_processed = 1
    quality = _compute_image_quality(pil_img)
    result.image_quality = quality

    ocr_text, ocr_rows, ocr_conf = _run_ocr_on_pil_image(pil_img)
    result.text = ocr_text
    result.table_rows = ocr_rows
    result.ocr_confidence = ocr_conf if ocr_text else None

    alnum_chars = sum(1 for c in ocr_text if c.isalnum())
    words = [w for w in ocr_text.split() if len(w) >= 2]

    # Determinar si es una placa diagnóstica visual (Rx, Eco, TAC, RMN) sin informe textual impreso
    if alnum_chars < 75 or (quality.get("looks_like_medical_scan") and len(words) < 30):
        result.is_visual_only = True
        result.method = "visual_image_only"
    else:
        result.is_visual_only = False
        result.method = "rapidocr_image"

    return result
