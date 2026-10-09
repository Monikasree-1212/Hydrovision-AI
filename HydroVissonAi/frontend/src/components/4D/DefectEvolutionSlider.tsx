import React, { useEffect, useState } from 'react';
import { DefectService } from '../../services/api';
import { 
  History, TrendingUp, Calendar, ArrowRight, ShieldAlert, Layers, Activity, Info
} from 'lucide-react';

interface DefectEvolutionSliderProps {
  defectId: number;
}

export const DefectEvolutionSlider: React.FC<DefectEvolutionSliderProps> = ({ defectId }) => {
  const [evolutionData, setEvolutionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sliderPos, setSliderPos] = useState(50); // 0 to 100 % for image split
  const [activeSnapshotIdx, setActiveSnapshotIdx] = useState(0);

  useEffect(() => {
    const fetchEvolution = async () => {
      setLoading(true);
      try {
        const data = await DefectService.getEvolution(defectId);
        setEvolutionData(data);
        if (data.timeline && data.timeline.length > 0) {
          setActiveSnapshotIdx(data.timeline.length - 1);
        }
      } catch (err) {
        console.error("Failed to load defect evolution data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvolution();
  }, [defectId]);

  if (loading) return <div className="text-center py-8 text-xs text-slate-500 font-semibold">Loading 4D Defect Evolution timeline...</div>;
  if (!evolutionData) return <div className="text-center py-8 text-xs text-rose-600 font-bold">Failed to load defect evolution history.</div>;

  const baseline = evolutionData.timeline[0] || {};
  const current = evolutionData.timeline[activeSnapshotIdx] || evolutionData.timeline[evolutionData.timeline.length - 1] || {};

  return (
    <div className="bg-white rounded-lg border border-govt-border p-5 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-govt-border pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-govt-navy text-amber-300 font-bold text-[10px] px-2 py-0.5 rounded uppercase">
              4D SPATIOTEMPORAL ENGINE
            </span>
            <span className="text-xs font-bold text-govt-navy">{evolutionData.defect_code}</span>
          </div>
          <h3 className="text-base font-bold text-govt-navy mt-1">
            Defect Propagation & Volumetric Deterioration Analysis
          </h3>
        </div>

        <div className="flex items-center space-x-3 text-xs mt-2 md:mt-0">
          <div className="bg-amber-50 border border-amber-300 px-3 py-1.5 rounded">
            <div className="text-[10px] text-amber-800 font-bold uppercase">Growth Velocity</div>
            <div className="text-sm font-extrabold text-amber-900 mt-0.5">
              +{evolutionData.growth_velocity_mm_month} mm / month
            </div>
          </div>
          <div className="bg-rose-50 border border-rose-300 px-3 py-1.5 rounded">
            <div className="text-[10px] text-rose-800 font-bold uppercase">Volumetric Loss</div>
            <div className="text-sm font-extrabold text-rose-900 mt-0.5">
              {evolutionData.estimated_volumetric_loss_cm3} cm³
            </div>
          </div>
        </div>
      </div>

      {/* 4D Image Split-Screen Comparison Slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs font-bold text-govt-navy">
          <span>Baseline Snapshot ({baseline.period || '2024'})</span>
          <span className="text-slate-500">Drag Slider to Compare ({sliderPos}% Split)</span>
          <span className="text-amber-800 font-bold">{current.period || 'Current Inspection'}</span>
        </div>

        <div 
          className="relative w-full h-64 md:h-80 bg-slate-900 rounded overflow-hidden select-none cursor-ew-resize border border-govt-border shadow-inner"
          onMouseMove={(e) => {
            if (e.buttons === 1) {
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
              setSliderPos(pos);
            }
          }}
        >
          {/* Base Image (2024 Baseline) */}
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-800 to-slate-900 flex items-center justify-center text-slate-300 text-xs font-mono">
            <div className="text-center space-y-2">
              <div className="text-amber-400 font-bold text-sm">2024 BASELINE INSPECTION</div>
              <div className="text-xs">Est Length: {baseline.length_mm} mm | Depth: {baseline.depth_mm} mm</div>
              <div className="w-32 h-16 border-2 border-dashed border-amber-400/60 mx-auto flex items-center justify-center text-[10px]">
                Defect Area: {baseline.area_cm2} cm²
              </div>
            </div>
          </div>

          {/* Overlay Image (Current 2026 Inspection) */}
          <div 
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-tr from-govt-navy to-slate-950 border-r-2 border-amber-400 overflow-hidden"
            style={{ width: `${sliderPos}%` }}
          >
            <div className="absolute inset-0 w-full h-full flex items-center justify-center text-white text-xs font-mono min-w-[300px]">
              <div className="text-center space-y-2">
                <div className="text-rose-400 font-bold text-sm">2026 CURRENT INSPECTION</div>
                <div className="text-xs">Est Length: {current.length_mm} mm | Depth: {current.depth_mm} mm</div>
                <div className="w-44 h-24 border-2 border-rose-500 bg-rose-500/20 mx-auto flex items-center justify-center text-[10px] font-bold">
                  Defect Area: {current.area_cm2} cm² (+{evolutionData.percentage_expansion}%)
                </div>
              </div>
            </div>
          </div>

          {/* Slider Divider Handle */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-amber-400 cursor-ew-resize flex items-center justify-center shadow-lg"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="w-6 h-6 rounded-full bg-amber-400 text-govt-navy font-bold text-[10px] flex items-center justify-center shadow">
              ↔
            </div>
          </div>
        </div>

        <input 
          type="range" 
          min="0" 
          max="100" 
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-amber-500"
        />
      </div>

      {/* Spatiotemporal Timeline Milestones */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-govt-navy uppercase tracking-wider border-b border-govt-border pb-1">
          Inspection History & Deterioration Milestones
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {evolutionData.timeline.map((snap: any, idx: number) => (
            <button
              key={idx}
              onClick={() => setActiveSnapshotIdx(idx)}
              className={`p-3 rounded border text-left transition ${
                activeSnapshotIdx === idx
                  ? 'bg-govt-navy text-white border-amber-400 shadow'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="text-[10px] font-bold uppercase text-amber-300">{snap.period}</div>
              <div className="text-xs font-extrabold mt-1">{snap.length_mm} mm</div>
              <div className="text-[10px] opacity-80 mt-0.5">Date: {snap.date}</div>
              <div className="text-[10px] font-semibold mt-1 text-emerald-300">Area: {snap.area_cm2} cm²</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
