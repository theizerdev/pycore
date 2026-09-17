import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  Compass,
  CheckCircle2,
  Search,
  Layers,
  Loader2,
  Globe2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

// Icono personalizado para Leaflet con SVG dinámico en verde/teal médico y efecto de pulso
const createCustomMarkerIcon = () => {
  return L.divIcon({
    className: 'custom-map-pin-container',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); pointer-events: auto;">
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 9999px; background-color: rgba(13, 148, 136, 0.28); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(15, 118, 110, 0.45); border: 2.5px solid #ffffff;">
          <div style="width: 10px; height: 10px; border-radius: 9999px; background-color: #ffffff; transform: rotate(45deg);"></div>
        </div>
        <div style="width: 12px; height: 4px; background: rgba(0,0,0,0.35); border-radius: 50%; filter: blur(1.5px); margin-top: 2px;"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

interface MapLocationPickerProps {
  lat?: number | string | null;
  lng?: number | string | null;
  onChange: (lat: number, lng: number) => void;
  onAddressFound?: (address: string, city: string) => void;
  countryLat?: number | null;
  countryLng?: number | null;
  countryName?: string | null;
  apiKey?: string | null; // Mantenido por compatibilidad de interfaz
  height?: string;
  disabled?: boolean;
}

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  lat,
  lng,
  onChange,
  onAddressFound,
  countryLat,
  countryLng,
  countryName,
  height = '320px',
  disabled = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);
  const [mapLayerType, setMapLayerType] = useState<'streets' | 'satellite'>('streets');

  const numLat = lat !== '' && lat !== null && lat !== undefined ? Number(lat) : null;
  const numLng = lng !== '' && lng !== null && lng !== undefined ? Number(lng) : null;

  // Centro inicial: coordenadas dadas -> coordenadas del país -> default Caracas/LatAm
  const initialLat = numLat ?? countryLat ?? 10.4806;
  const initialLng = numLng ?? countryLng ?? -66.9036;
  const initialZoom = numLat !== null && numLng !== null ? 15 : countryLat !== null ? 6 : 5;

  // Capas de teselas disponibles (100% gratuitas, sin API Key)
  const TILE_LAYERS = {
    streets: {
      // MapTiler Streets tile layer using the provided API key
      url: 'https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=3XriOPIZJfdJthJKqjPX',
      attribution: '&copy; <a href="https://www.maptiler.com/" target="_blank" rel="noopener noreferrer">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      subdomains: 'abc',
      maxZoom: 20,
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      subdomains: 'abcd',
      maxZoom: 19,
    },
  };

  // Geocodificación Inversa con OpenStreetMap Nominatim
  const performReverseGeocode = async (targetLat: number, targetLng: number) => {
    if (!onAddressFound) return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${targetLat}&lon=${targetLng}&accept-language=es`,
        { headers: { Accept: 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const street = addr.road || addr.pedestrian || addr.footway || addr.path || addr.street || '';
        const houseNumber = addr.house_number || '';
        const neighbourhood = addr.neighbourhood || addr.suburb || addr.quarter || addr.city_district || '';
        const state = addr.state || '';

        const parts = [];
        if (street) parts.push(houseNumber ? `${street} #${houseNumber}` : street);
        if (neighbourhood) parts.push(neighbourhood);

        const foundAddress =
          parts.length > 0
            ? parts.join(', ')
            : data.display_name?.split(',').slice(0, 3).join(', ') || '';
        const foundCity =
          addr.city || addr.town || addr.municipality || addr.village || addr.county || state || '';

        if (foundAddress || foundCity) {
          setDetectedAddress([foundCity, foundAddress].filter(Boolean).join(' - '));
          onAddressFound(foundAddress, foundCity);
        }
      }
    } catch (err) {
      console.warn('Error en reverse geocoding:', err);
    } finally {
      setGeocoding(false);
    }
  };

  const handleUpdateCoordinates = (newLat: number, newLng: number) => {
    onChange(newLat, newLng);
    performReverseGeocode(newLat, newLng);
  };

  // Inicialización de Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Crear mapa Leaflet
    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false,
    });

    // Añadir control de zoom en la esquina superior derecha
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Añadir capa de teselas
    const layerConfig = TILE_LAYERS.streets;
    const tileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      subdomains: layerConfig.subdomains,
      maxZoom: layerConfig.maxZoom,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Crear marcador si hay coordenadas
    if (numLat !== null && numLng !== null) {
      const marker = L.marker([numLat, numLng], {
        draggable: !disabled,
        icon: createCustomMarkerIcon(),
      }).addTo(map);

      marker.on('dragend', () => {
        const coords = marker.getLatLng();
        const dLat = Number(coords.lat.toFixed(6));
        const dLng = Number(coords.lng.toFixed(6));
        handleUpdateCoordinates(dLat, dLng);
      });

      markerRef.current = marker;
    }

    // Evento clic en el mapa para colocar el pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (disabled) return;
      const clickedLat = Number(e.latlng.lat.toFixed(6));
      const clickedLng = Number(e.latlng.lng.toFixed(6));

      if (markerRef.current) {
        markerRef.current.setLatLng([clickedLat, clickedLng]);
      } else {
        const marker = L.marker([clickedLat, clickedLng], {
          draggable: !disabled,
          icon: createCustomMarkerIcon(),
        }).addTo(map);

        marker.on('dragend', () => {
          const coords = marker.getLatLng();
          const dLat = Number(coords.lat.toFixed(6));
          const dLng = Number(coords.lng.toFixed(6));
          handleUpdateCoordinates(dLat, dLng);
        });

        markerRef.current = marker;
      }

      handleUpdateCoordinates(clickedLat, clickedLng);
    });

    setMapLoaded(true);

    // Forzar reajuste de tamaño tras renderizado
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Cambiar entre estilo Estándar y Satélite
  const handleToggleLayer = (type: 'streets' | 'satellite') => {
    if (!mapInstanceRef.current || type === mapLayerType) return;
    setMapLayerType(type);

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const config = TILE_LAYERS[type];
    const newLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      subdomains: config.subdomains,
      maxZoom: config.maxZoom,
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;
  };

  // Actualizar posición del marcador si cambian lat/lng externamente
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    if (numLat !== null && numLng !== null) {
      if (markerRef.current) {
        markerRef.current.setLatLng([numLat, numLng]);
      } else {
        const marker = L.marker([numLat, numLng], {
          draggable: !disabled,
          icon: createCustomMarkerIcon(),
        }).addTo(mapInstanceRef.current);

        marker.on('dragend', () => {
          const coords = marker.getLatLng();
          onChange(Number(coords.lat.toFixed(6)), Number(coords.lng.toFixed(6)));
        });

        markerRef.current = marker;
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [numLat, numLng, mapLoaded, disabled]);

  // Si cambia el país seleccionado y no hay marcador fijado, centrar hacia el país
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;
    if (countryLat !== null && countryLat !== undefined && countryLng !== null && countryLng !== undefined) {
      if (numLat === null || numLng === null) {
        mapInstanceRef.current.flyTo([countryLat, countryLng], 6, {
          duration: 1.2,
        });
      }
    }
  }, [countryLat, countryLng, mapLoaded]);

  // Estrategia de Geolocalización Robusta: Navegador -> IP Fallback
  const handleLocateMe = async () => {
    setLocating(true);
    const toastId = toast.loading('Detectando tu ubicación geográfica...');

    // 1. Intentar geolocalización por hardware / navegador
    const tryBrowserLocation = (): Promise<{ lat: number; lng: number }> => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          return reject(new Error('Navegador no soporta geolocalización'));
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      });
    };

    // 2. Intentar geolocalización por IP si el navegador falla o está denegado
    const tryIpLocation = async (): Promise<{ lat: number; lng: number; city?: string } | null> => {
      try {
        const res = await fetch('https://ipwho.is/');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.latitude && data.longitude) {
            return {
              lat: Number(data.latitude),
              lng: Number(data.longitude),
              city: data.city || data.region,
            };
          }
        }
      } catch {}

      try {
        const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
        if (res.ok) {
          const data = await res.json();
          if (data && data.latitude && data.longitude) {
            return {
              lat: Number(data.latitude),
              lng: Number(data.longitude),
              city: data.city,
            };
          }
        }
      } catch {}

      return null;
    };

    try {
      let finalLat: number | null = null;
      let finalLng: number | null = null;
      let locationSource = 'GPS';
      let cityName: string | undefined;

      try {
        const browserPos = await tryBrowserLocation();
        finalLat = Number(browserPos.lat.toFixed(6));
        finalLng = Number(browserPos.lng.toFixed(6));
      } catch (browserErr: any) {
        console.warn('Geolocalización por navegador no disponible, usando fallback IP:', browserErr.message);
        const ipPos = await tryIpLocation();
        if (ipPos) {
          finalLat = Number(ipPos.lat.toFixed(6));
          finalLng = Number(ipPos.lng.toFixed(6));
          locationSource = 'Red';
          cityName = ipPos.city;
        }
      }

      if (finalLat !== null && finalLng !== null) {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([finalLat, finalLng], 16, { duration: 1.2 });
        }

        if (markerRef.current) {
          markerRef.current.setLatLng([finalLat, finalLng]);
        } else if (mapInstanceRef.current) {
          const marker = L.marker([finalLat, finalLng], {
            draggable: !disabled,
            icon: createCustomMarkerIcon(),
          }).addTo(mapInstanceRef.current);

          marker.on('dragend', () => {
            const coords = marker.getLatLng();
            handleUpdateCoordinates(Number(coords.lat.toFixed(6)), Number(coords.lng.toFixed(6)));
          });

          markerRef.current = marker;
        }

        handleUpdateCoordinates(finalLat, finalLng);

        toast.success(
          cityName
            ? `Ubicación encontrada: ${cityName} (${locationSource}) - [${finalLat}, ${finalLng}]`
            : `Ubicación detectada (${locationSource}): ${finalLat}, ${finalLng}`,
          { id: toastId }
        );
      } else {
        toast.error(
          'No se pudo detectar tu ubicación automáticamente. Por favor haz clic en el mapa para marcarla.',
          { id: toastId }
        );
      }
    } catch (err: any) {
      console.error('Error general de geolocalización:', err);
      toast.error('No fue posible detectar la ubicación. Selecciona el punto en el mapa.', {
        id: toastId,
      });
    } finally {
      setLocating(false);
    }
  };

  // Búsqueda Rápida de Direcciones / Lugares con Nominatim
  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const query = countryName ? `${searchQuery.trim()}, ${countryName}` : searchQuery.trim();
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=es`
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const item = results[0];
          const newLat = Number(Number(item.lat).toFixed(6));
          const newLng = Number(Number(item.lon).toFixed(6));

          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([newLat, newLng], 16, { duration: 1.2 });
          }

          if (markerRef.current) {
            markerRef.current.setLatLng([newLat, newLng]);
          } else if (mapInstanceRef.current) {
            const marker = L.marker([newLat, newLng], {
              draggable: !disabled,
              icon: createCustomMarkerIcon(),
            }).addTo(mapInstanceRef.current);

            marker.on('dragend', () => {
              const coords = marker.getLatLng();
              handleUpdateCoordinates(Number(coords.lat.toFixed(6)), Number(coords.lng.toFixed(6)));
            });

            markerRef.current = marker;
          }

          handleUpdateCoordinates(newLat, newLng);
          toast.success(`Lugar encontrado: ${item.display_name.split(',')[0]}`);
        } else {
          toast.info('No se encontraron coincidencias para esa dirección o lugar.');
        }
      }
    } catch (err) {
      console.error('Error buscando dirección:', err);
      toast.error('Error al consultar el servicio de búsqueda.');
    } finally {
      setSearching(false);
    }
  };

  const handleCenterOnCountry = () => {
    if (countryLat && countryLng && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([countryLat, countryLng], 6, { duration: 1.2 });
    }
  };

  return (
    <div className="space-y-2">
      {/* Contenedor del Mapa Leaflet */}
      <div className="relative rounded-xl overflow-hidden border border-border/80 shadow-xs bg-muted/40">
        <div ref={mapContainerRef} style={{ height }} className="w-full h-full cursor-crosshair z-0" />

        {/* Barra superior flotante de Búsqueda y Herramientas */}
        <div className="absolute top-2.5 left-2.5 right-12 z-[500] flex flex-wrap items-center gap-1.5 pointer-events-auto">
          {/* Buscador de Dirección Integrado */}
          <form onSubmit={handleSearchAddress} className="flex-1 min-w-[200px] max-w-sm flex items-center">
            <div className="relative w-full flex items-center shadow-md rounded-lg overflow-hidden border border-border/80 bg-background/95 backdrop-blur-md">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 shrink-0" />
              <Input
                type="text"
                placeholder={countryName ? `Buscar lugar en ${countryName}...` : 'Buscar dirección o ciudad...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={searching || disabled}
                className="h-7 pl-8 pr-7 text-[11px] border-0 bg-transparent focus-visible:ring-0 shadow-none"
              />
              {searching ? (
                <Loader2 className="w-3 h-3 text-teal-600 animate-spin absolute right-2.5" />
              ) : (
                <button
                  type="submit"
                  disabled={!searchQuery.trim()}
                  className="absolute right-2 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                  title="Buscar"
                >
                  <Search className="w-3 h-3" />
                </button>
              )}
            </div>
          </form>

          {/* Botón Mi Ubicación */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleLocateMe}
            disabled={locating || disabled}
            className="h-7 px-2.5 text-[11px] font-semibold bg-background/95 hover:bg-background backdrop-blur-md border border-border/80 shadow-md cursor-pointer text-teal-700 dark:text-teal-300"
            title="Ubicarme mediante GPS o Red"
          >
            {locating ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 text-teal-600 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5 mr-1 text-teal-600 dark:text-teal-400" />
            )}
            <span>{locating ? 'Ubicando...' : 'Mi Ubicación'}</span>
          </Button>

          {/* Centrar en País */}
          {countryName && countryLat && countryLng && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCenterOnCountry}
              className="h-7 px-2 text-[11px] font-medium bg-background/95 hover:bg-background backdrop-blur-md border border-border/80 shadow-md cursor-pointer text-muted-foreground hover:text-foreground hidden sm:flex"
              title={`Centrar en ${countryName}`}
            >
              <Compass className="w-3.5 h-3.5 mr-1 text-blue-500" />
              <span>{countryName}</span>
            </Button>
          )}
        </div>

        {/* Selector de Capa (Mapa / Satélite) en la esquina superior derecha */}
        <div className="absolute bottom-10 right-2.5 z-[500] flex flex-col gap-1 bg-background/90 backdrop-blur-md p-1 rounded-lg border border-border/80 shadow-md">
          <button
            type="button"
            onClick={() => handleToggleLayer('streets')}
            className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer transition-all flex items-center gap-1 ${
              mapLayerType === 'streets'
                ? 'bg-teal-600 text-white shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Vista Estándar"
          >
            <Globe2 className="w-3 h-3" />
            <span>Mapa</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleLayer('satellite')}
            className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer transition-all flex items-center gap-1 ${
              mapLayerType === 'satellite'
                ? 'bg-teal-600 text-white shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Vista Satelital"
          >
            <Layers className="w-3 h-3" />
            <span>Satélite</span>
          </button>
        </div>

        {/* Badge inferior de instrucciones */}
        <div className="absolute bottom-2.5 left-2.5 right-24 z-[500] flex items-center justify-between pointer-events-none">
          <div className="bg-slate-900/85 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-[10px] font-medium flex items-center gap-1.5 shadow-sm truncate">
            <MapPin className="w-3 h-3 text-teal-400 shrink-0" />
            <span className="truncate">Haz clic o arrastra el pin para fijar la ubicación exacta</span>
          </div>
        </div>
      </div>

      {/* Barra de Coordenadas Capturadas y Estado */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-muted/40 rounded-xl border border-border/70 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-medium text-[11px]">Latitud:</span>
            <Badge variant="outline" className="font-mono text-xs bg-card text-teal-700 dark:text-teal-300 border-teal-500/30">
              {numLat !== null ? numLat.toFixed(6) : 'No fijada'}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-medium text-[11px]">Longitud:</span>
            <Badge variant="outline" className="font-mono text-xs bg-card text-teal-700 dark:text-teal-300 border-teal-500/30">
              {numLng !== null ? numLng.toFixed(6) : 'No fijada'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {geocoding && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 animate-pulse font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Detectando dirección...
            </span>
          )}

          {!geocoding && numLat !== null && numLng !== null && (
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[240px]">
                {detectedAddress || 'Coordenadas fijadas correctamente'}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapLocationPicker;
