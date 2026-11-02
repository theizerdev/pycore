with open('backend/app/api/v1/honorarios.py', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''async def _get_tasa_bcv(db: AsyncSession, empresa_id: int) -> float:
    res = await db.execute(
        select(TasaCambio)
        .where(
            TasaCambio.empresa_id == empresa_id,
            TasaCambio.moneda_origen == "USD",
            TasaCambio.moneda_destino == "VES",
            TasaCambio.activa == True,
        )
        .order_by(desc(TasaCambio.fecha_actualizacion))
        .limit(1)
    )
    tasa = res.scalar_one_or_none()
    if tasa and tasa.tasa:
        return float(tasa.tasa)
    return 1.0'''

replacement = '''async def _get_tasa_bcv(db: AsyncSession, empresa_id: int) -> float:
    res = await db.execute(
        select(TasaCambio)
        .where(
            TasaCambio.empresa_id == empresa_id,
            TasaCambio.moneda_origen == "USD",
        )
        .order_by(desc(TasaCambio.created_at))
        .limit(1)
    )
    tasa = res.scalar_one_or_none()
    if tasa and tasa.tasa:
        return float(tasa.tasa)
    return 1.0'''

if target in text:
    text = text.replace(target, replacement)
elif target.replace('\n', '\r\n') in text:
    text = text.replace(target.replace('\n', '\r\n'), replacement.replace('\n', '\r\n'))

with open('backend/app/api/v1/honorarios.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated _get_tasa_bcv in honorarios.py")

