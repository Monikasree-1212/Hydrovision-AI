import React, { useEffect, useState } from 'react';
import { Dam, DamGIS, DefectGeoJSONFeature, DefectGeoJSONFeatureCollection } from '../types';
import { DamService, GISService } from '../services/api';
import { GISMap } from '../components/GIS/GISMap';
import { MapFilters } from '../components/GIS/MapFilters';
import { MapLegend } from '../components/GIS/MapLegend';
import { DefectDetailDrawer } from '../components/GIS/DefectDetailDrawer';
import { MapPin, Globe, Layers, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

export const GISPage: React.FC = () => {
  const [dams, setDams] = useState<Dam[]>([]);
  const [selectedDamId, setSelectedDamId] = useState<number | 'ALL'>('ALL');
  const [damGIS, setDamGIS] = useState<DamGIS | null>(null);

  // Filters
  const [defectType, setDefectType] = useState<string>('ALL');
  const [severity, setSeverity] = useState<string>('ALL');
  const [locationSource, setLocationSource] = useState<string>('ALL');
  const [tileProvider, setTileProvider] = useState<'osm' | 'satellite'>('osm');

  // Data state
  const [defectsFC, setDefectsFC] = useState<DefectGeoJSONFeatureCollection | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<DefectGeoJSONFeature | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInitialData = async () => {
    try {
      const damsData = await DamService.getDams();
      setDams(damsData);
    } catch (err: any) {
      console.error("Failed to load dams for GIS:", err);
    }
  };

  const loadGISData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Dam GIS if a specific dam is selected
      if (selectedDamId !== 'ALL') {
        try {
          const damData = await GISService.getDamGIS(selectedDamId);
          setDamGIS(damData);
        } catch (err) {
          setDamGIS(null);
        }
      } else {
        setDamGIS(null);
      }

      // 2. Fetch Defect GeoJSON FeatureCollection with active filters
      const params: any = {};
      if (selectedDamId !== 'ALL') params.dam_id = selectedDamId;
      if (defectType !== 'ALL') params.defect_type = defectType;
      if (severity !== 'ALL') params.severity = severity;
      if (locationSource !== 'ALL') params.coordinate_source = locationSource;

      const geojsonFC = await GISService.getDefectsGIS(params);
      setDefectsFC(geojsonFC);
    } catch (err: any) {
      console.error("GIS data fetch error:", err);
      setError(err.response?.data?.detail || "Failed to load GIS spatial data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadGISData();
  }, [selectedDamId, defectType, severity, locationSource]);

  const features = defectsFC?.features || [];
  const totalVerifiedDefects = features.length;
  const spatiallyMappedCount = features.filter(f => f.geometry && f.geometry.coordinates).length;
  const locationUnavailableCount = totalVerifiedDefects - spatiallyMappedCount;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-govt-navy text-white p-5 rounded-xl shadow-lg border-b-2 border-amber-400 flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
        <div>
          <div className="text-[10px] font-bold text-amber-300 uppercase tracking-widest flex items-center space-x-1.5">
            <Globe className="w-3.5 h-3.5" />
            <span>NATIONAL DAM SAFETY AUTHORITY — SPATIAL DEFECT INTELLIGENCE</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight mt-1">Geographic Information System (GIS) GIS Dashboard</h1>
          <p className="text-xs text-slate-300 mt-1">
            Real PostGIS-backed spatial defect mapping, coordinate lineage tracking, and source media auditability.
          </p>
        </div>

        <button
          onClick={loadGISData}
          disabled={loading}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-lg transition flex items-center space-x-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Spatial Layer</span>
        </button>
      </div>

      {/* 2. Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm text-xs">
          <span className="text-slate-400 font-medium block mb-1">Target Dam Facility</span>
          <span className="text-sm font-bold text-white font-mono">
            {selectedDamId === 'ALL' ? 'ALL DAMS' : damGIS?.name || `DAM #${selectedDamId}`}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm text-xs">
          <span className="text-slate-400 font-medium block mb-1">Verified Defect Records</span>
          <span className="text-sm font-bold text-cyan-400 font-mono">{totalVerifiedDefects}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm text-xs">
          <span className="text-slate-400 font-medium block mb-1">Spatially Mapped Points</span>
          <span className="text-sm font-bold text-emerald-400 font-mono">{spatiallyMappedCount}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm text-xs">
          <span className="text-slate-400 font-medium block mb-1">Location Unavailable</span>
          <span className="text-sm font-bold text-amber-400 font-mono">{locationUnavailableCount}</span>
        </div>
      </div>

      {/* 3. GIS Map Filters */}
      <MapFilters
        dams={dams}
        selectedDamId={selectedDamId}
        onSelectDam={setSelectedDamId}
        defectType={defectType}
        onSelectDefectType={setDefectType}
        severity={severity}
        onSelectSeverity={setSeverity}
        locationSource={locationSource}
        onSelectLocationSource={setLocationSource}
        tileProvider={tileProvider}
        onSelectTileProvider={setTileProvider}
      />

      {/* 4. GIS Map & Legend Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Map (9 Cols) */}
        <div className="lg:col-span-9 relative">
          <GISMap
            dam={damGIS}
            defectsFC={defectsFC}
            tileProvider={tileProvider}
            selectedFeature={selectedFeature}
            onSelectFeature={setSelectedFeature}
          />
        </div>

        {/* Legend & Details Column (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          <MapLegend />

          {locationUnavailableCount > 0 && (
            <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-xl text-amber-200 text-xs space-y-1">
              <div className="font-bold flex items-center space-x-1.5 text-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Notice: Location Unavailable</span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed mt-1">
                {locationUnavailableCount} verified defects exist in the database without GPS coordinates. 
                No fake locations are placed on the map.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 5. Defect Detail Side Drawer */}
      <DefectDetailDrawer
        feature={selectedFeature}
        onClose={() => setSelectedFeature(null)}
        onLocationUpdated={loadGISData}
      />
    </div>
  );
};
