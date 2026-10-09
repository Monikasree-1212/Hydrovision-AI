import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DamGIS, DefectGeoJSONFeature, DefectGeoJSONFeatureCollection } from '../../types';
import { AlertCircle, MapPin } from 'lucide-react';

interface GISMapProps {
  dam: DamGIS | null;
  defectsFC: DefectGeoJSONFeatureCollection | null;
  tileProvider: 'osm' | 'satellite';
  selectedFeature: DefectGeoJSONFeature | null;
  onSelectFeature: (feature: DefectGeoJSONFeature) => void;
}

// Custom Leaflet DivIcons styled for Government GIS aesthetic
const createSeverityMarkerIcon = (severity: string, isSelected: boolean) => {
  let colorClass = 'bg-blue-600 border-blue-300';
  if (severity === 'CRITICAL') colorClass = 'bg-purple-700 border-purple-300 ring-2 ring-purple-400';
  else if (severity === 'HIGH') colorClass = 'bg-rose-600 border-rose-300 ring-2 ring-rose-400';
  else if (severity === 'MEDIUM') colorClass = 'bg-amber-500 border-amber-200';

  const selectedRing = isSelected ? 'scale-125 z-50 border-white ring-4 ring-cyan-400' : '';

  const htmlStr = `
    <div className="relative group cursor-pointer">
      <div class="w-6 h-6 rounded-full ${colorClass} ${selectedRing} shadow-lg flex items-center justify-center text-white font-bold text-[10px] transition-all transform hover:scale-110">
        ${severity.charAt(0)}
      </div>
    </div>
  `;

  return L.divIcon({
    html: htmlStr,
    className: 'custom-leaflet-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const createDamMarkerIcon = () => {
  const htmlStr = `
    <div class="w-8 h-8 rounded-lg bg-govt-navy border-2 border-amber-400 shadow-xl flex items-center justify-center text-amber-300 font-bold text-xs">
      🏛️
    </div>
  `;
  return L.divIcon({
    html: htmlStr,
    className: 'custom-dam-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

export const GISMap: React.FC<GISMapProps> = ({
  dam,
  defectsFC,
  tileProvider,
  selectedFeature,
  onSelectFeature,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center: India / Dam location (default 30.3751, 78.4852)
    const initialLat = dam?.latitude || 30.3751;
    const initialLng = dam?.longitude || 78.4852;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 12,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Guarantee smooth OpenStreetMap tile loading without DOM container size clipping
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Basemap Tiles
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl = tileProvider === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution = tileProvider === 'satellite'
      ? '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    const newTileLayer = L.tileLayer(tileUrl, { attribution, maxZoom: 19 });
    newTileLayer.addTo(map);
    tileLayerRef.current = newTileLayer;
  }, [tileProvider]);

  // Update Markers & Bounds
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;

    markersLayer.clearLayers();
    const bounds: L.LatLngExpression[] = [];

    // 1. Dam Marker
    if (dam && dam.latitude != null && dam.longitude != null) {
      if (-90 <= dam.latitude && dam.latitude <= 90 && -180 <= dam.longitude && dam.longitude <= 180) {
        const damLatLng: L.LatLngExpression = [dam.latitude, dam.longitude];
        bounds.push(damLatLng);

        const damMarker = L.marker(damLatLng, { icon: createDamMarkerIcon() });
        damMarker.bindPopup(`
          <div class="p-2 text-xs font-sans text-slate-900">
            <div class="font-bold text-sm text-govt-navy">${dam.name}</div>
            <div class="text-[10px] text-slate-600 font-mono">${dam.code} &bull; ${dam.dam_type}</div>
            <div class="text-[11px] mt-1">Height: <strong>${dam.height_meters}m</strong></div>
            <div class="text-[10px] text-amber-700 font-semibold mt-1">${dam.location_label}</div>
          </div>
        `);
        markersLayer.addLayer(damMarker);
      }
    }

    // 2. Verified Defect Markers
    if (defectsFC && defectsFC.features) {
      defectsFC.features.forEach((feature) => {
        if (!feature.geometry || !feature.geometry.coordinates || feature.geometry.coordinates.length < 2) {
          return;
        }

        const [lng, lat] = feature.geometry.coordinates;
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return;
        }

        const defectLatLng: L.LatLngExpression = [lat, lng];
        bounds.push(defectLatLng);

        const isSelected = selectedFeature?.id === feature.id;
        const p = feature.properties;

        const marker = L.marker(defectLatLng, {
          icon: createSeverityMarkerIcon(p.severity, isSelected),
        });

        marker.on('click', () => {
          onSelectFeature(feature);
        });

        marker.bindPopup(`
          <div class="p-2 text-xs font-sans text-slate-900 space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-bold text-govt-navy">${p.defect_code}</span>
              <span class="font-bold px-1.5 py-0.5 rounded text-[10px] bg-slate-100">${p.severity}</span>
            </div>
            <div class="text-[11px] font-bold text-slate-800">${p.defect_type}</div>
            <div class="text-[10px] text-emerald-800 font-semibold">AI Detection Confidence: ${(p.confidence * 100).toFixed(0)}%</div>
            <div class="text-[10px] text-slate-600">Location Source: <strong class="font-mono">${p.location_source}</strong></div>
          </div>
        `);

        markersLayer.addLayer(marker);
      });
    }

    // Fit map bounds if points exist
    if (bounds.length > 0) {
      const featureBounds = L.latLngBounds(bounds);
      map.fitBounds(featureBounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [dam, defectsFC, selectedFeature]);

  // Check if any spatially mapped features exist
  const mappedCount = (defectsFC?.features || []).filter(f => f.geometry && f.geometry.coordinates).length;
  const hasDamLocation = dam?.latitude != null && dam?.longitude != null;

  return (
    <div className="relative w-full h-[540px] rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
      {/* Leaflet container */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* No Location Overlay Notice */}
      {!hasDamLocation && mappedCount === 0 && (
        <div className="absolute top-4 left-4 z-20 max-w-sm p-4 bg-slate-900/90 backdrop-blur border border-amber-500/30 rounded-xl text-amber-200 text-xs shadow-2xl flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-300">NO SPATIALLY MAPPED DEFECTS AVAILABLE</h4>
            <p className="text-[11px] text-amber-200/80 mt-1">
              Verified defects exist for this inspection, but spatial coordinates are unavailable. 
              No fake map coordinates have been generated.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
