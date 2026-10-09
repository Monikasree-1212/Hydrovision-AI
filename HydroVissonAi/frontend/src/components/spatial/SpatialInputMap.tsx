import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Dam, DefectSeverity } from '../../types';
import { MapPin, Globe, Layers, AlertCircle, Crosshair, Camera, Compass } from 'lucide-react';

export interface SpatialMarker {
  id: string | number;
  lat: number;
  lng: number;
  label: string;
  type: string;
  severity: DefectSeverity | 'INFO';
  confidence?: number;
  imageUrl?: string;
  isNew?: boolean;
}

export interface FlightTrajectoryPoint {
  photo_id: number;
  filename: string;
  latitude: number;
  longitude: number;
  altitude_meters: number;
  gimbal_pitch_deg: number;
  gimbal_yaw_deg: number;
  gimbal_roll_deg: number;
  quality_score?: number;
}

interface SpatialInputMapProps {
  dam: Dam | null;
  tileProvider: 'satellite' | 'osm';
  markers: SpatialMarker[];
  trajectory?: FlightTrajectoryPoint[];
  showFlightPath?: boolean;
  isPinDropActive: boolean;
  onPinDropped: (lat: number, lng: number) => void;
  onMarkerSelected?: (marker: SpatialMarker) => void;
  selectedMarkerId?: string | number | null;
}

const createSpatialMarkerIcon = (severity: string, isSelected: boolean, isNew?: boolean) => {
  let colorClass = 'bg-blue-600 border-blue-200';
  if (severity === 'CRITICAL') colorClass = 'bg-rose-700 border-rose-300 ring-2 ring-rose-400';
  else if (severity === 'HIGH') colorClass = 'bg-red-600 border-red-300 ring-2 ring-red-400';
  else if (severity === 'MEDIUM') colorClass = 'bg-amber-500 border-amber-200';
  else if (severity === 'INFO') colorClass = 'bg-cyan-600 border-cyan-200';

  const pulseEffect = isNew ? 'animate-bounce ring-4 ring-yellow-300' : '';
  const selectedRing = isSelected ? 'scale-125 z-50 border-white ring-4 ring-cyan-400' : '';

  const htmlStr = `
    <div class="relative group cursor-pointer">
      <div class="w-7 h-7 rounded-full ${colorClass} ${pulseEffect} ${selectedRing} shadow-xl flex items-center justify-center text-white font-extrabold text-[11px] transition-all transform hover:scale-125">
        ${severity === 'INFO' ? '📍' : severity.charAt(0)}
      </div>
    </div>
  `;

  return L.divIcon({
    html: htmlStr,
    className: 'custom-spatial-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const createCameraPinIcon = (photoId: number) => {
  const htmlStr = `
    <div class="w-5 h-5 rounded-full bg-amber-400 border-2 border-slate-900 shadow-md flex items-center justify-center text-slate-950 font-mono font-extrabold text-[9px] hover:scale-125 transition-transform">
      ${photoId}
    </div>
  `;
  return L.divIcon({
    html: htmlStr,
    className: 'custom-camera-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

const createDamCenterIcon = (name: string) => {
  const htmlStr = `
    <div class="w-9 h-9 rounded-xl bg-govt-navy border-2 border-amber-400 shadow-2xl flex items-center justify-center text-amber-300 font-bold text-sm transform hover:scale-110 transition-transform">
      🏛️
    </div>
  `;
  return L.divIcon({
    html: htmlStr,
    className: 'custom-dam-center-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

export const SpatialInputMap: React.FC<SpatialInputMapProps> = ({
  dam,
  tileProvider,
  markers,
  trajectory = [],
  showFlightPath = true,
  isPinDropActive,
  onPinDropped,
  onMarkerSelected,
  selectedMarkerId,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const droneOrthomosaicLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const zonesLayerRef = useRef<L.LayerGroup | null>(null);
  const trajectoryLayerRef = useRef<L.LayerGroup | null>(null);

  const [currentZoom, setCurrentZoom] = useState<number>(15);
  const isHighResRooftopActive = currentZoom >= 16;

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = dam?.latitude || 30.3751;
    const initialLng = dam?.longitude || 78.4852;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Zoom listener for Drone Rooftop Orthomosaic View
    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    markersLayerRef.current = L.layerGroup().addTo(map);
    zonesLayerRef.current = L.layerGroup().addTo(map);
    trajectoryLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

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

  // 2. Fly-To Camera Animation on Dam Selection
  useEffect(() => {
    if (!mapInstanceRef.current || !dam) return;
    const map = mapInstanceRef.current;

    if (dam.latitude && dam.longitude) {
      map.flyTo([dam.latitude, dam.longitude], 15, {
        animate: true,
        duration: 1.5,
      });
    }
  }, [dam?.id]);

  // 3. Basemap Tiles & High-Res Drone Rooftop Layer Toggle
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    if (droneOrthomosaicLayerRef.current) {
      map.removeLayer(droneOrthomosaicLayerRef.current);
    }

    const tileUrl = tileProvider === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution = '&copy; Esri World Imagery &mdash; National Dam Safety Spatial Intelligence';
    const newTileLayer = L.tileLayer(tileUrl, { attribution, maxZoom: 19 });
    newTileLayer.addTo(map);
    tileLayerRef.current = newTileLayer;

    // When Zoom Level >= 16, overlay High-Res Clarity Tile Layer for Rooftop / Drone View
    if (isHighResRooftopActive) {
      const droneClarityTileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      const droneLayer = L.tileLayer(droneClarityTileUrl, {
        maxZoom: 20,
        opacity: 0.95,
      });
      droneLayer.addTo(map);
      droneOrthomosaicLayerRef.current = droneLayer;
    }
  }, [tileProvider, isHighResRooftopActive]);

  // 4. Pin Drop Handler
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isPinDropActive) {
        onPinDropped(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isPinDropActive, onPinDropped]);

  // 5. Render Flight Trajectory Polyline & 100+ Camera Position Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !trajectoryLayerRef.current) return;
    const trajectoryLayer = trajectoryLayerRef.current;
    trajectoryLayer.clearLayers();

    if (showFlightPath && trajectory.length > 0) {
      const latLngs: L.LatLngExpression[] = trajectory.map(t => [t.latitude, t.longitude]);

      // Flight Path Polyline Line
      const flightPolyline = L.polyline(latLngs, {
        color: '#f59e0b',
        weight: 2.5,
        dashArray: '4, 8',
        opacity: 0.85,
      });
      trajectoryLayer.addLayer(flightPolyline);

      // Camera Pin Markers
      trajectory.forEach(t => {
        const camMarker = L.marker([t.latitude, t.longitude], {
          icon: createCameraPinIcon(t.photo_id),
        });

        camMarker.bindPopup(`
          <div class="p-2 text-xs font-sans text-slate-900 space-y-1">
            <div class="font-bold text-govt-navy text-xs">📷 Drone Photo #${t.photo_id}: ${t.filename}</div>
            <div class="text-[10px] text-slate-600 font-mono">Lat: ${t.latitude.toFixed(5)}, Lng: ${t.longitude.toFixed(5)}</div>
            <div class="text-[10px] text-amber-700 font-bold">Altitude: ${t.altitude_meters}m &bull; Pitch: ${t.gimbal_pitch_deg}°</div>
            ${t.quality_score ? `<div class="text-[10px] text-emerald-700 font-bold">Image Quality Score: ${t.quality_score}%</div>` : ''}
          </div>
        `);
        trajectoryLayer.addLayer(camMarker);
      });
    }
  }, [trajectory, showFlightPath]);

  // 6. Render Dam Zones & Defect Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !zonesLayerRef.current) return;
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const zonesLayer = zonesLayerRef.current;

    markersLayer.clearLayers();
    zonesLayer.clearLayers();

    if (dam && dam.latitude && dam.longitude) {
      const centerMarker = L.marker([dam.latitude, dam.longitude], {
        icon: createDamCenterIcon(dam.name),
      });

      centerMarker.bindPopup(`
        <div class="p-2 text-xs font-sans">
          <div class="font-bold text-sm text-govt-navy">${dam.name}</div>
          <div class="text-[10px] text-slate-500 font-mono">${dam.code} &bull; ${dam.dam_type}</div>
          <div class="text-[11px] mt-1">Height: <strong>${dam.height_meters}m</strong></div>
        </div>
      `);
      markersLayer.addLayer(centerMarker);

      // Structural Zone Polygons
      const dLat = 0.0015;
      const dLng = 0.0020;

      const crestCoords: L.LatLngExpression[] = [
        [dam.latitude - dLat, dam.longitude - dLng],
        [dam.latitude + dLat, dam.longitude - dLng],
        [dam.latitude + dLat, dam.longitude - dLng * 0.5],
        [dam.latitude - dLat, dam.longitude - dLng * 0.5],
      ];

      const spillwayCoords: L.LatLngExpression[] = [
        [dam.latitude - dLat * 0.5, dam.longitude - dLng * 0.5],
        [dam.latitude + dLat * 0.5, dam.longitude - dLng * 0.5],
        [dam.latitude + dLat * 0.5, dam.longitude + dLng * 0.5],
        [dam.latitude - dLat * 0.5, dam.longitude + dLng * 0.5],
      ];

      L.polygon(crestCoords, { color: '#0284c7', weight: 2, fillColor: '#38bdf8', fillOpacity: 0.25 })
        .bindTooltip("Zone 1: Crest & Parapet Wall", { permanent: false })
        .addTo(zonesLayer);

      L.polygon(spillwayCoords, { color: '#eab308', weight: 2, fillColor: '#fef08a', fillOpacity: 0.3 })
        .bindTooltip("Zone 2: Spillway & Stilling Basin", { permanent: false })
        .addTo(zonesLayer);
    }

    markers.forEach((m) => {
      if (isNaN(m.lat) || isNaN(m.lng)) return;

      const isSelected = selectedMarkerId === m.id;
      const marker = L.marker([m.lat, m.lng], {
        icon: createSpatialMarkerIcon(m.severity, isSelected, m.isNew),
      });

      marker.on('click', () => {
        if (onMarkerSelected) onMarkerSelected(m);
      });

      marker.bindPopup(`
        <div class="p-2 text-xs font-sans space-y-1">
          <div class="font-bold text-govt-navy">${m.type} (${m.severity})</div>
          <div class="text-[11px]">${m.label}</div>
          ${m.confidence ? `<div class="text-[10px] text-emerald-700 font-bold">AI Confidence: ${(m.confidence * 100).toFixed(0)}%</div>` : ''}
        </div>
      `);

      markersLayer.addLayer(marker);
    });

  }, [dam, markers, selectedMarkerId]);

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 ${isPinDropActive ? 'cursor-crosshair ring-2 ring-cyan-400' : ''}`}>
      {/* Leaflet DOM container */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* High-Res Rooftop Drone View Zoom Status Badge */}
      {isHighResRooftopActive && (
        <div className="absolute top-4 right-4 z-20 px-3 py-1.5 bg-emerald-950/90 border border-emerald-400 text-emerald-200 rounded-xl text-xs font-bold shadow-2xl backdrop-blur flex items-center space-x-2 animate-pulse">
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>🚁 DRONE ORTHOMOSAIC / ROOFTOP VIEW (ZOOM LEVEL {currentZoom})</span>
        </div>
      )}

      {/* Pin Drop Banner */}
      {isPinDropActive && (
        <div className="absolute top-4 left-4 right-4 z-20 p-3 bg-cyan-950/90 border border-cyan-400 text-cyan-100 rounded-xl text-xs font-medium shadow-2xl backdrop-blur flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-2">
            <Crosshair className="w-4 h-4 text-cyan-300 animate-spin" />
            <span>Click anywhere on the satellite tile to pin geotag coordinates...</span>
          </div>
          <span className="bg-cyan-800 text-cyan-200 px-2 py-0.5 rounded font-mono text-[10px]">POINT & CLICK MODE</span>
        </div>
      )}
    </div>
  );
};
