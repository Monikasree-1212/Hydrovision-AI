import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Layers, Info } from 'lucide-react';

interface DigitalTwinLegendProps {
  totalDefects: number;
  spatiallyLocated: number;
  missingLocation: number;
}

export const DigitalTwinLegend: React.FC<DigitalTwinLegendProps> = ({
  totalDefects,
  spatiallyLocated,
  missingLocation,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 text-xs text-slate-300 space-y-2.5 shadow-2xl transition-all w-64">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-white uppercase tracking-wider text-[10px]">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>Defect Overlay Legend</span>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Spatial Mapping</span>
            <span className="font-bold text-emerald-400">
              {spatiallyLocated} / {totalDefects} Pins
            </span>
          </div>

          {/* Severity Color Indicators */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 animate-pulse" />
              <span className="text-slate-200 font-medium">Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
              <span className="text-slate-200 font-medium">High</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
              <span className="text-slate-200 font-medium">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              <span className="text-slate-200 font-medium">Low</span>
            </div>
          </div>

          {/* Location Precision Badges */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[10px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-amber-400 font-mono font-medium">MEDIA_REF</span>
              <span>Drone Imaging</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-emerald-400 font-mono font-medium">GEOREF</span>
              <span>Engineer Georef</span>
            </div>
            {missingLocation > 0 && (
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-slate-500 font-mono">UNMAPPED</span>
                <span className="text-amber-400 font-bold">{missingLocation} Unmapped</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
