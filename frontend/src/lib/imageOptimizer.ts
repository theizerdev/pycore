export interface OptimizeImageResult {
  dataUrl: string;
  wasOptimized: boolean;
  originalSizeMB: string;
  newSizeKB: string;
}

/**
 * Optimiza y redimensiona un archivo de imagen en el navegador usando Canvas.
 */
export async function optimizeImageFile(
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.85
): Promise<OptimizeImageResult> {
  const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        const needsResize = width > maxWidth || height > maxHeight;

        if (needsResize) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const fallbackUrl = e.target?.result as string;
          const fallbackKB = Math.round(file.size / 1024).toString();
          return resolve({
            dataUrl: fallbackUrl,
            wasOptimized: false,
            originalSizeMB,
            newSizeKB: fallbackKB,
          });
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);

        // Calcular tamaño aproximado del dataUrl resultante
        const head = `data:${mimeType};base64,`;
        const base64Len = dataUrl.length - head.length;
        const estimatedBytes = (base64Len * 3) / 4;
        const newSizeKB = Math.round(estimatedBytes / 1024).toString();

        const wasOptimized = needsResize || estimatedBytes < file.size;

        resolve({
          dataUrl,
          wasOptimized,
          originalSizeMB,
          newSizeKB,
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
