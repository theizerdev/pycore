from pathlib import Path

path = Path("backend/app/models/honorario.py")
content = path.read_text(encoding="utf-8")

crlf = "\r\n" in content
nl = "\r\n" if crlf else "\n"

old_block = f"    motivo_deduccion = Column(String(255), nullable=True){nl}"
new_block = (
    f"    motivo_deduccion = Column(String(255), nullable=True){nl}{nl}"
    f"    # Retención de ISLR según normativa venezolana (Decreto N° 1.808){nl}"
    f"    porcentaje_retencion_islr = Column(Numeric(5, 2), default=3.00, nullable=False)  # 3% Persona Natural, 5% Persona Jurídica{nl}"
    f"    monto_retencion_islr_usd = Column(Numeric(12, 2), default=0.00, nullable=False){nl}"
    f"    monto_retencion_islr_ves = Column(Numeric(12, 2), default=0.00, nullable=False){nl}"
    f"    numero_comprobante_islr = Column(String(50), nullable=True)  # Ej: '20261100000001'{nl}"
)

if old_block in content:
    content = content.replace(old_block, new_block)
    print("Added ISLR columns to LiquidacionHonorario model")
else:
    print("WARNING: old_block not found")

path.write_text(content, encoding="utf-8")
print("Done updating honorario.py")

