import React from 'react';
import { Shield, MapPin, Layers } from 'lucide-react';

export const MapLegend: React.FC = () => {
  return (
    <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-4 text-slate-200 text-xs shadow-xl space-y-3">
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <Layers className="w-4 h-4 text-cyan-400" />
        <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">GIS Map Legend</h4>
      </div>

      {/* Defect Classes */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Defect Class</span>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span>Crack</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span>Corrosion</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
            <span>Seepage</span>
          </div>
        </div>
      </div>

      {/* Severity */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Severity Level</span>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-purple-900 border border-purple-400 text-purple-200 font-bold flex items-center justify-center text-[9px]">C</span>
            <span>CRITICAL</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-rose-900 border border-rose-500 text-rose-200 font-bold flex items-center justify-center text-[9px]">H</span>
            <span>HIGH</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-amber-900 border border-amber-500 text-amber-200 font-bold flex items-center justify-center text-[9px]">M</span>
            <span>MEDIUM</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-emerald-900 border border-emerald-500 text-emerald-200 font-bold flex items-center justify-center text-[9px]">L</span>
            <span>LOW</span>
          </div>
        </div>
      </div>

      {/* Location Source */}
      <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Location Source Lineage</span>
        <div className="space-y-1 text-[11px] text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Media GPS:</span>
            <span className="font-mono text-cyan-400 font-semibold">MEDIA_REFERENCE</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Manual Georef:</span>
            <span className="font-mono text-purple-400 font-semibold">MANUAL_GEOREFERENCE</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Missing GPS:</span>
            <span className="font-mono text-amber-400 font-semibold">LOCATION UNAVAILABLE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
