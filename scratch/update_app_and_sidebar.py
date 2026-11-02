# 1. Update frontend/src/App.tsx
with open('frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    app_text = f.read()

target_lazy = "const RecibosHistorialPage = lazyComponent(() => import('./pages/facturacion/RecibosHistorialPage'), 'RecibosHistorialPage');"
new_lazy = target_lazy + "\nconst HonorariosMedicosPage = lazyComponent(() => import('./pages/facturacion/HonorariosMedicosPage'), 'HonorariosMedicosPage');"

if target_lazy in app_text and 'HonorariosMedicosPage' not in app_text:
    app_text = app_text.replace(target_lazy, new_lazy)

target_route = """              <Route
                path="facturacion/recibos"
                element={
                  <ProtectedRoute>
                    <RecibosHistorialPage />
                  </ProtectedRoute>
                }
              />"""

new_route = target_route + """
              <Route
                path="facturacion/honorarios"
                element={
                  <ProtectedRoute>
                    <HonorariosMedicosPage />
                  </ProtectedRoute>
                }
              />"""

if target_route in app_text and 'path="facturacion/honorarios"' not in app_text:
    app_text = app_text.replace(target_route, new_route)

with open('frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(app_text)
print("frontend/src/App.tsx updated!")

# 2. Update frontend/src/components/layout/AdminSidebar.tsx
with open('frontend/src/components/layout/AdminSidebar.tsx', 'r', encoding='utf-8') as f:
    sidebar_text = f.read()

target_nav = """        {
          title: 'Historial de Recibos y Ventas',
          href: '/facturacion/recibos',
          icon: Receipt,
        },"""

new_nav = target_nav + """
        {
          title: 'Honorarios Médicos & Comisiones',
          href: '/facturacion/honorarios',
          icon: Calculator,
        },"""

if target_nav in sidebar_text and '/facturacion/honorarios' not in sidebar_text:
    sidebar_text = sidebar_text.replace(target_nav, new_nav)

with open('frontend/src/components/layout/AdminSidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(sidebar_text)
print("frontend/src/components/layout/AdminSidebar.tsx updated!")

