with open('frontend/src/pages/facturacion/HonorariosMedicosPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Imports
target_import = "import { useAuth } from '../../context/AuthContext';"
new_import = """import { useAuth } from '../../context/AuthContext';
import { ModuleHeader } from '../../components/common/ModuleHeader';
import { cn } from '../../lib/utils';"""

if target_import in text and 'ModuleHeader' not in text:
    text = text.replace(target_import, new_import)

# 2. Header and outer container
target_header = """  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Cabecera Principal ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-teal-600 text-white shadow-md">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                Honorarios Médicos & Comisiones
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Liquidación, cálculo automático de porcentajes y emisión de comprobantes contables
              </p>
            </div>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('calculadora')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'calculadora'
                ? 'bg-background text-teal-700 dark:text-teal-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calculator className="h-4 w-4" />
            <span>Calcular & Liquidar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('historial');
              fetchHistorial();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'historial'
                ? 'bg-background text-teal-700 dark:text-teal-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Historial Liquidaciones</span>
          </button>
        </div>
      </div>"""

new_header = """  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ── Cabecera Principal con ModuleHeader Institucional ── */}
      <ModuleHeader
        title="Honorarios Médicos & Comisiones"
        description="Liquidación, cálculo automático de porcentajes y emisión de comprobantes contables a especialistas."
        icon={<Calculator className="h-6 w-6 text-white" />}
      >
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/15 border border-white/20">
          <button
            type="button"
            onClick={() => setActiveTab('calculadora')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
              activeTab === 'calculadora'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            )}
          >
            <Calculator className="h-4 w-4" />
            <span>Calcular & Liquidar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('historial');
              fetchHistorial();
            }}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
              activeTab === 'historial'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            )}
          >
            <FileText className="h-4 w-4" />
            <span>Historial Liquidaciones</span>
          </button>
        </div>
      </ModuleHeader>"""

if target_header in text:
    text = text.replace(target_header, new_header)
elif target_header.replace('\n', '\r\n') in text:
    text = text.replace(target_header.replace('\n', '\r\n'), new_header.replace('\n', '\r\n'))

with open('frontend/src/pages/facturacion/HonorariosMedicosPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("HonorariosMedicosPage.tsx layout updated successfully!")

