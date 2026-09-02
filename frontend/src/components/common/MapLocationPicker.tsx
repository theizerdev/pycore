import React, { useEffect, useRef, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { MapPin, Navigation, Compass, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

// API Key por defecto de MapTiler para desarrollo / demo o personalizada
const DEFAULT_MAPTILER_KEY = 'get_your_own_OpIi9ZULNHzrESv6T2vL';

interface MapLocationPickerProps {
  lat?: number | string | null;
  lng?: number | string | null;
  onChange: (lat: number, lng: number) => void;
  onAddressFound?: (address: string, city: string) => void;
  countryLat?: number | null;
  countryLng?: number | null;
  countryName?: string | null;
  apiKey?: string | null;
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
  apiKey,
  height = '320px',
  disabled = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maptilersdk.Map | null>(null);
  const markerRef = useRef<maptilersdk.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);

  const numLat = lat !== '' && lat !== null && lat !== undefined ? Number(lat) : null;
  const numLng = lng !== '' && lng !== null && lng !== undefined ? Number(lng) : null;

  // Centro inicial: coordenadas dadas -> coordenadas del país -> default Caracas/LatAm
  const initialLat = numLat ?? countryLat ?? 10.4806;
  const initialLng = numLng ?? countryLng ?? -66.9036;
  const initialZoom = numLat !== null && numLng !== null ? 14 : countryLat !== null ? 5 : 4;

  const performReverseGeocode = async (targetLat: number, targetLng: number) => {
    if (!onAddressFound) return;
    setGeocoding(true);
    try {
      const effectiveKey = apiKey && apiKey.trim().length > 5 && !apiKey.includes('get_your_own') ? apiKey.trim() : null;
      let foundAddress = '';
      let foundCity = '';

      // 1. Intentar con MapTiler Geocoding si hay apiKey
      if (effectiveKey) {
        try {
          const res = await fetch(`https://api.maptiler.com/geocoding/${targetLng},${targetLat}.json?key=${effectiveKey}&language=es`);
          if (res.ok) {
            const data = await res.json();
            if (data.features && data.features.length > 0) {
              const mainFeature = data.features[0];
              foundAddress = mainFeature.place_name || mainFeature.text || '';
              
              const cityContext = mainFeature.context?.find((c: any) => 
                c.id?.startsWith('municipality') || c.id?.startsWith('place') || c.id?.startsWith('city') || c.id?.startsWith('locality')
              );
              if (cityContext) {
                foundCity = cityContext.text;
              } else if (mainFeature.place_type?.includes('city') || mainFeature.place_type?.includes('municipality')) {
                foundCity = mainFeature.text;
              }
            }
          }
        } catch (err) {
          console.warn('MapTiler geocode fallback:', err);
        }
      }

      // 2. Fallback con OpenStreetMap Nominatim
      if (!foundAddress && !foundCity) {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${targetLat}&lon=${targetLng}&accept-language=es`,
          { headers: { 'Accept': 'application/json' } }
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

          foundAddress = parts.length > 0 ? parts.join(', ') : (data.display_name?.split(',').slice(0, 3).join(', ') || '');
          foundCity = addr.city || addr.town || addr.municipality || addr.village || addr.county || state || '';
        }
      }

      if (foundAddress || foundCity) {
        setDetectedAddress([foundCity, foundAddress].filter(Boolean).join(' - '));
        onAddressFound(foundAddress, foundCity);
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

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Configurar API Key de MapTiler
    maptilersdk.config.apiKey = apiKey && apiKey.trim().length > 5 ? apiKey.trim() : DEFAULT_MAPTILER_KEY;

    // Crear mapa
    const map = new maptilersdk.Map({
      container: mapContainerRef.current,
      style: maptilersdk.MapStyle.STREETS,
      center: [initialLng, initialLat],
      zoom: initialZoom,
      navigationControl: 'top-right',
      geolocateControl: false,
    });

    mapInstanceRef.current = map;

    map.on('load', () => {
      setMapLoaded(true);

      // Si ya hay coordenadas, poner el marcador
      if (numLat !== null && numLng !== null) {
        const marker = new maptilersdk.Marker({
          draggable: !disabled,
          color: '#0d9488', // Teal 600
        })
          .setLngLat([numLng, numLat])
          .addTo(map);

        marker.on('dragend', () => {
          const coords = marker.getLngLat();
          const dLat = Number(coords.lat.toFixed(6));
          const dLng = Number(coords.lng.toFixed(6));
          handleUpdateCoordinates(dLat, dLng);
        });

        markerRef.current = marker;
      }
    });

    // Evento de clic en el mapa para capturar coordenadas
    map.on('click', (e) => {
      if (disabled) return;
      const clickedLng = Number(e.lngLat.lng.toFixed(6));
      const clickedLat = Number(e.lngLat.lat.toFixed(6));

      if (markerRef.current) {
        markerRef.current.setLngLat([clickedLng, clickedLat]);
      } else {
        const marker = new maptilersdk.Marker({
          draggable: !disabled,
          color: '#0d9488',
        })
          .setLngLat([clickedLng, clickedLat])
          .addTo(map);

        marker.on('dragend', () => {
          const coords = marker.getLngLat();
          const dLat = Number(coords.lat.toFixed(6));
          const dLng = Number(coords.lng.toFixed(6));
          handleUpdateCoordinates(dLat, dLng);
        });

        markerRef.current = marker;
      }

      handleUpdateCoordinates(clickedLat, clickedLng);
    });

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Actualizar posición del marcador si cambian lat/lng externamente
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    if (numLat !== null && numLng !== null) {
      if (markerRef.current) {
        markerRef.current.setLngLat([numLng, numLat]);
      } else {
        const marker = new maptilersdk.Marker({
          draggable: !disabled,
          color: '#0d9488',
        })
          .setLngLat([numLng, numLat])
          .addTo(mapInstanceRef.current);

        marker.on('dragend', () => {
          const coords = marker.getLngLat();
          onChange(Number(coords.lat.toFixed(6)), Number(coords.lng.toFixed(6)));
        });

        markerRef.current = marker;
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [numLat, numLng, mapLoaded, disabled]);

  // Si cambia el país seleccionado y no hay marcador fijado, volar hacia las coordenadas del país
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;
    if (countryLat !== null && countryLat !== undefined && countryLng !== null && countryLng !== undefined) {
      // Si no tiene coordenadas aún, vuela hacia el país
      if (numLat === null || numLng === null) {
        mapInstanceRef.current.flyTo({
          center: [countryLng, countryLat],
          zoom: 5.5,
          speed: 1.2,
        });
      }
    }
  }, [countryLat, countryLng, mapLoaded]);

  // Obtener geolocalización actual del navegador
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const userLat = Number(pos.coords.latitude.toFixed(6));
        const userLng = Number(pos.coords.longitude.toFixed(6));

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo({
            center: [userLng, userLat],
            zoom: 15,
            speed: 1.4,
          });
        }
        handleUpdateCoordinates(userLat, userLng);
      },
      (err) => {
        setLocating(false);
        console.warn('Error en geolocalización:', err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleCenterOnCountry = () => {
    if (countryLat && countryLng && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [countryLng, countryLat],
        zoom: 6,
        speed: 1.2,
      });
    }
  };

  return (
    <div className="space-y-2">
      {/* Contenedor del Mapa */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs bg-slate-100 dark:bg-slate-900">
        <div
          ref={mapContainerRef}
          style={{ height }}
          className="w-full h-full cursor-crosshair"
        />

        {/* Barra flotante de acciones rápidas */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-slate-200/80 dark:border-slate-800/80 shadow-md">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLocateMe}
            disabled={locating || disabled}
            className="h-7 px-2 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Usar mi ubicación actual"
          >
            <Navigation className={`w-3.5 h-3.5 mr-1 text-teal-600 dark:text-teal-400 ${locating ? 'animate-spin' : ''}`} />
            <span>{locating ? 'Ubicando...' : 'Mi Ubicación'}</span>
          </Button>

          {countryName && countryLat && countryLng && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCenterOnCountry}
              className="h-7 px-2 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={`Centrar en ${countryName}`}
            >
              <Compass className="w-3.5 h-3.5 mr-1 text-blue-500" />
              <span>Centrar en {countryName}</span>
            </Button>
          )}
        </div>

        {/* Badge inferior de instrucciones */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-none">
          <div className="bg-slate-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-[10px] font-medium flex items-center gap-1.5 shadow-sm">
            <MapPin className="w-3 h-3 text-teal-400 shrink-0" />
            <span>Haz clic o arrastra el pin en el mapa para fijar la ubicación exacta</span>
          </div>

          <div className="bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-200/60 dark:border-slate-800/60 shadow-xs hidden sm:block">
            MapTiler SDK
          </div>
        </div>
      </div>

      {/* Visualización de coordenadas capturadas y estado de geocodificación */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200/60 dark:border-slate-800/60 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Latitud:</span>
            <Badge variant="outline" className="font-mono bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800">
              {numLat !== null ? numLat.toFixed(6) : 'No definida'}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Longitud:</span>
            <Badge variant="outline" className="font-mono bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800">
              {numLng !== null ? numLng.toFixed(6) : 'No definida'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {geocoding && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 animate-pulse">
              <Compass className="w-3.5 h-3.5 animate-spin" />
              Detectando dirección...
            </span>
          )}

          {!geocoding && numLat !== null && numLng !== null && (
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {detectedAddress ? 'Dirección autocompletada' : 'Coordenadas fijadas'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
