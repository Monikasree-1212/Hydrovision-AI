import React, { useState, useEffect, useRef } from 'react';
import { DamService } from '../../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Sliders, AlertTriangle, ShieldAlert, Waves, Users, Clock, Compass } from 'lucide-react';

interface SpillwayInundationSimulatorProps {
  damId: number;
}

export const SpillwayInundationSimulator: React.FC<SpillwayInundationSimulatorProps> = ({ damId }) => {
  const [waterLevel, setWaterLevel] = useState(825.0);
  const [discharge, setDischarge] = useState(30000);
  const [gateOpen, setGateOpen] = useState(60);
  const [rainIntensity, setRainIntensity] = useState(35);
  const [simResult, setSimResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const result = await DamService.simulateInundation(damId, {
        water_level_m: waterLevel,
        discharge_cusecs: discharge,
        gate_open_percent: gateOpen,
        rainfall_intensity_mm_hr: rainIntensity
      });
      setSimResult(result);
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [damId]);

  // Leaflet Map Initialization & Polygon Rendering
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([30.3751, 78.4852], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    if (layerGroup) {
      layerGroup.clearLayers();
    }

    if (simResult && simResult.inundation_zones && layerGroup) {
      const damLat = simResult.inundation_zones[0]?.coordinates[0][0] || 30.3751;
      const damLng = simResult.inundation_zones[0]?.coordinates[0][1] || 78.4852;

      map.setView([damLat - 0.05, damLng + 0.03], 11);

      // Dam Marker
      const damMarker = L.circleMarker([damLat, damLng], {
        radius: 10,
        color: '#12355B',
        fillColor: '#FF9933',
        fillOpacity: 0.9,
        weight: 3
      });
      damMarker.bindPopup(`<b>${simResult.dam_name}</b><br/>Discharge: ${simResult.simulation_parameters.discharge_cusecs} cusecs`);
      layerGroup.addLayer(damMarker);

      // Inundation Zone Polygons
      simResult.inundation_zones.forEach((zone: any) => {
        const poly = L.polygon(zone.coordinates, {
          color: zone.color,
          fillColor: zone.color,
          fillOpacity: 0.35,
          weight: 2
        });
        poly.bindPopup(`
          <div style="font-size:12px;">
            <b>${zone.name}</b><br/>
            Wave Arrival: <b>${zone.arrival_time_min} mins</b><br/>
            Max Depth: <b>${zone.max_water_depth_meters} m</b>
          </div>
        `);
        layerGroup.addLayer(poly);
      });
    }
  }, [simResult]);

  return (
    <div className="bg-white rounded-lg border border-govt-border p-5 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-govt-border pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-rose-900 text-white font-bold text-[10px] px-2 py-0.5 rounded uppercase flex items-center space-x-1">
              <Waves className="w-3 h-3 text-amber-300" />
              <span>HYDROMODELING ENGINE</span>
            </span>
            <span className="text-xs font-bold text-govt-navy">Spillway Discharge Simulator</span>
          </div>
          <h3 className="text-base font-bold text-govt-navy mt-1">
            Downstream Inundation & Hydrodynamic Risk Simulator
          </h3>
        </div>

        {simResult && (
          <div className="mt-2 md:mt-0">
            <span className={`text-xs font-extrabold px-3 py-1.5 rounded border uppercase ${
              simResult.inundation_risk_level === 'CRITICAL_RED_ALERT' ? 'bg-rose-100 text-rose-900 border-rose-400' :
              simResult.inundation_risk_level === 'HIGH_AMBER_ADVISORY' ? 'bg-amber-100 text-amber-900 border-amber-400' :
              'bg-emerald-100 text-emerald-900 border-emerald-400'
            }`}>
              {simResult.inundation_risk_level}
            </span>
          </div>
        )}
      </div>

      {/* Control Sliders & Live Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sliders Panel */}
        <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-4 text-xs">
          <div className="font-bold text-govt-navy uppercase border-b border-slate-200 pb-1 flex items-center justify-between">
            <span>Simulation Parameters</span>
            <Sliders className="w-3.5 h-3.5 text-govt-blue" />
          </div>

          <div>
            <div className="flex justify-between font-semibold text-slate-700 mb-1">
              <span>Reservoir Water Level</span>
              <span className="font-bold text-govt-navy">{waterLevel} m MSL</span>
            </div>
            <input
              type="range"
              min="780"
              max="850"
              step="0.5"
              value={waterLevel}
              onChange={(e) => setWaterLevel(Number(e.target.value))}
              className="w-full accent-govt-blue"
            />
          </div>

          <div>
            <div className="flex justify-between font-semibold text-slate-700 mb-1">
              <span>Discharge Rate</span>
              <span className="font-bold text-rose-800">{discharge.toLocaleString()} cusecs</span>
            </div>
            <input
              type="range"
              min="5000"
              max="60000"
              step="1000"
              value={discharge}
              onChange={(e) => setDischarge(Number(e.target.value))}
              className="w-full accent-rose-600"
            />
          </div>

          <div>
            <div className="flex justify-between font-semibold text-slate-700 mb-1">
              <span>Spillway Gate Opening</span>
              <span className="font-bold text-amber-800">{gateOpen}% Open</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={gateOpen}
              onChange={(e) => setGateOpen(Number(e.target.value))}
              className="w-full accent-amber-600"
            />
          </div>

          <div>
            <div className="flex justify-between font-semibold text-slate-700 mb-1">
              <span>Rainfall Intensity</span>
              <span className="font-bold text-slate-800">{rainIntensity} mm / hr</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={rainIntensity}
              onChange={(e) => setRainIntensity(Number(e.target.value))}
              className="w-full accent-slate-700"
            />
          </div>

          <button
            onClick={runSimulation}
            disabled={simulating}
            className="w-full py-2 bg-govt-navy hover:bg-govt-blue text-white font-bold rounded shadow transition disabled:opacity-50"
          >
            {simulating ? 'Computing Hydrodynamics...' : 'Recalculate Inundation Model'}
          </button>
        </div>

        {/* Live Hydrodynamic Metrics & Map */}
        {simResult && (
          <div className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Wave Velocity</div>
                <div className="text-lg font-extrabold text-govt-navy mt-0.5">{simResult.wave_velocity_ms} m/s</div>
                <div className="text-[10px] text-slate-500">Hydrodynamic Speed</div>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Peak Release Volume</div>
                <div className="text-lg font-extrabold text-govt-navy mt-0.5">{simResult.simulation_parameters.peak_discharge_m3s} m³/s</div>
                <div className="text-[10px] text-slate-500">Metric Discharge</div>
              </div>
              <div className="bg-rose-50 p-3 rounded border border-rose-200">
                <div className="text-[10px] text-rose-800 font-bold uppercase">Zone 1 Arrival</div>
                <div className="text-lg font-extrabold text-rose-900 mt-0.5">{simResult.arrival_times.zone_1_5km_min} mins</div>
                <div className="text-[10px] text-rose-700">0 - 5 km Wave Front</div>
              </div>
              <div className="bg-amber-50 p-3 rounded border border-amber-200">
                <div className="text-[10px] text-amber-800 font-bold uppercase">Population at Risk</div>
                <div className="text-lg font-extrabold text-amber-900 mt-0.5">{simResult.estimated_population_at_risk.toLocaleString()}</div>
                <div className="text-[10px] text-amber-700">{simResult.affected_villages_count} Settlements</div>
              </div>
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-xs text-amber-900 rounded-r">
              <div className="font-bold flex items-center space-x-1">
                <ShieldAlert className="w-4 h-4 text-amber-600 inline" />
                <span>CDSO Recommended Protocol Action</span>
              </div>
              <div className="mt-1 font-semibold">{simResult.recommended_action}</div>
            </div>

            {/* Interactive Leaflet Inundation Map Container */}
            <div ref={mapContainerRef} className="h-64 rounded overflow-hidden border border-govt-border shadow-inner relative z-0" />
          </div>
        )}
      </div>
    </div>
  );
};
