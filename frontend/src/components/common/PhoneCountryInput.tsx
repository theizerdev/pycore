import React, { useEffect, useState } from 'react';
import { paisesApi } from '../../api/paises';
import type { Pais } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useRegional, getCountryFlagEmoji } from '../../context/RegionalContext';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Phone } from 'lucide-react';

interface PhoneCountryInputProps {
  paisId?: number | null;
  telefono: string;
  onPaisChange: (paisId: number) => void;
  onTelefonoChange: (telefono: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const PhoneCountryInput: React.FC<PhoneCountryInputProps> = ({
  paisId,
  telefono,
  onPaisChange,
  onTelefonoChange,
  disabled = false,
  placeholder = '412 1234567',
  className = '',
  required = false,
}) => {
  const { user } = useAuth();
  const regional = useRegional();
  const [paises, setPaises] = useState<Pais[]>([]);
  const [loadingPaises, setLoadingPaises] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchPaises = async () => {
      try {
        setLoadingPaises(true);
        const data = await paisesApi.list({ activo: true });
        if (mounted) {
          setPaises(data);
          // Si no hay país seleccionado, autoseleccionar el país de la empresa
          if (!paisId && data.length > 0) {
            const empresaPaisId = user?.empresa?.pais_id || regional.pais?.id;
            const match = data.find((p) => p.id === empresaPaisId) || data[0];
            if (match) {
              onPaisChange(match.id);
            }
          }
        }
      } catch (err) {
        console.error('Error cargando países para teléfono:', err);
      } finally {
        if (mounted) setLoadingPaises(false);
      }
    };
    fetchPaises();
    return () => {
      mounted = false;
    };
  }, [paisId, user?.empresa?.pais_id, regional.pais?.id]);

  const selectedPais = paises.find((p) => p.id === paisId);

  return (
    <div className={`flex items-center rounded-lg shadow-2xs ${className}`}>
      {/* Selector de País con Bandera y Prefijo */}
      <Select
        value={paisId ? String(paisId) : undefined}
        onValueChange={(val) => onPaisChange(Number(val))}
        disabled={disabled || loadingPaises}
      >
        <SelectTrigger className="w-[110px] sm:w-[130px] rounded-r-none border-r-0 bg-muted/30 focus:ring-0 focus:ring-offset-0 text-xs h-9 px-2 font-medium">
          <SelectValue placeholder="País">
            {selectedPais ? (
              <span className="flex items-center gap-1.5 truncate">
                <span className="text-base leading-none">
                  {getCountryFlagEmoji(selectedPais.codigo_iso2)}
                </span>
                <span className="font-semibold text-foreground">
                  {selectedPais.codigo_telefonico || '+58'}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Phone className="size-3.5" />
                <span>+Pref</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {paises.map((p) => (
            <SelectItem key={p.id} value={String(p.id)} className="text-xs">
              <span className="flex items-center gap-2">
                <span className="text-base leading-none">
                  {getCountryFlagEmoji(p.codigo_iso2)}
                </span>
                <span className="font-medium text-foreground">{p.nombre}</span>
                <span className="text-muted-foreground font-mono">
                  ({p.codigo_telefonico})
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Input de Número Telefónico */}
      <div className="relative flex-1">
        <Input
          type="tel"
          value={telefono || ''}
          onChange={(e) => onTelefonoChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="rounded-l-none h-9 text-xs font-mono focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>
    </div>
  );
};

export default PhoneCountryInput;
