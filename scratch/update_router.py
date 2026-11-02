with open('backend/app/api/router.py', 'r', encoding='utf-8') as f:
    text = f.read()

if 'honorarios_router' not in text:
    text = text.replace(
        'from app.api.v1.cajas import router as cajas_router',
        'from app.api.v1.cajas import router as cajas_router\nfrom app.api.v1.honorarios import router as honorarios_router'
    )
    text = text.replace(
        'api_router.include_router(cajas_router)',
        'api_router.include_router(cajas_router)\napi_router.include_router(honorarios_router)'
    )
    with open('backend/app/api/router.py', 'w', encoding='utf-8') as f:
        f.write(text)
    print('router.py updated with honorarios_router')

