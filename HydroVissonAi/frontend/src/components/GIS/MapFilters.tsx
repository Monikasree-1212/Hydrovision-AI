import React from 'react';
import { Filter, Layers, MapPin } from 'lucide-react';
import { Dam } from '../../types';

interface MapFiltersProps {
  dams: Dam[];
  selectedDamId: number | 'ALL';
  onSelectDam: (damId: number | 'ALL') => void;
  defectType: string;
  onSelectDefectType: (val: string) => void;
  severity: string;
  onSelectSeverity: (val: string) => void;
  locationSource: string;
  onSelectLocationSource: (val: string) => void;
  tileProvider: 'osm' | 'satellite';
  onSelectTileProvider: (val: 'osm' | 'satellite') => void;
}

export const MapFilters: React.FC<MapFiltersProps> = ({
  dams,
  selectedDamId,
  onSelectDam,
  defectType,
  onSelectDefectType,
  severity,
  onSelectSeverity,
  locationSource,
  onSelectLocationSource,
  tileProvider,
  onSelectTileProvider,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h4 className="font-bold text-white flex items-center space-x-2">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span>GIS Spatial Filters</span>
        </h4>
        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono uppercase">
          Live Query
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Dam Facility Filter */}
        <div>
          <label className="text-slate-400 block mb-1 font-medium">Dam Facility</label>
          <select
            value={selectedDamId}
            onChange={(e) => onSelectDam(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value, 10))}
            className="w-full bg-slate-950 border border-slate-700 text-white rounded p-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Dams ({dams.length})</option>
            {dams.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>

        {/* Defect Class Filter */}
        <div>
          <label className="text-slate-400 block mb-1 font-medium">Defect Class</label>
          <select
            value={defectType}
            onChange={(e) => onSelectDefectType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-white rounded p-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Classes</option>
            <option value="CRACK">CRACK</option>
            <option value="CORROSION">CORROSION</option>
            <option value="SEEPAGE">SEEPAGE</option>
          </select>
        </div>

        {/* Severity Filter */}
        <div>
          <label className="text-slate-400 block mb-1 font-medium">Severity Level</label>
          <select
            value={severity}
            onChange={(e) => onSelectSeverity(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-white rounded p-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>

        {/* Location Source Filter */}
        <div>
          <label className="text-slate-400 block mb-1 font-medium">Location Source</label>
          <select
            value={locationSource}
            onChange={(e) => onSelectLocationSource(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-white rounded p-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Sources</option>
            <option value="MEDIA_GPS">MEDIA_GPS (Drone EXIF)</option>
            <option value="MANUAL">MANUAL (Engineer Georef)</option>
            <option value="PRECISE_SURVEY">PRECISE_SURVEY</option>
            <option value="UNAVAILABLE">UNAVAILABLE (Missing GPS)</option>
          </select>
        </div>

        {/* Tile Layer Toggle */}
        <div>
          <label className="text-slate-400 block mb-1 font-medium">Basemap Tile Layer</label>
          <div className="flex rounded border border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => onSelectTileProvider('osm')}
              className={`flex-1 py-1.5 px-2 text-[11px] font-semibold transition-all ${
                tileProvider === 'osm' ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              OpenStreetMap
            </button>
            <button
              type="button"
              onClick={() => onSelectTileProvider('satellite')}
              className={`flex-1 py-1.5 px-2 text-[11px] font-semibold transition-all ${
                tileProvider === 'satellite' ? 'bg-cyan-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
