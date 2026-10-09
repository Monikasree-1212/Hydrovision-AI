import React, { useState } from 'react';
import { Box, RefreshCw, X, Sliders, Layers } from 'lucide-react';
import { DigitalTwinService } from '../../services/api';
import { DigitalTwinModel } from '../../types';

interface ParametricDamGeneratorModalProps {
  damId: number;
  damName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newModel: DigitalTwinModel) => void;
}

export const ParametricDamGeneratorModal: React.FC<ParametricDamGeneratorModalProps> = ({
  damId,
  damName,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [damType, setDamType] = useState<string>('CONCRETE_GRAVITY');
  const [heightMeters, setHeightMeters] = useState<number>(85);
  const [lengthMeters, setLengthMeters] = useState<number>(350);
  const [spillwayCount, setSpillwayCount] = useState<number>(4);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('dam_type', damType);
      formData.append('height_meters', heightMeters.toString());
      formData.append('length_meters', lengthMeters.toString());
      formData.append('spillway_count', spillwayCount.toString());

      const newModel = await DigitalTwinService.generateParametricModel(damId, formData);
      setLoading(false);
      onSuccess(newModel);
      onClose();
    } catch (err: any) {
      console.error('Failed to generate parametric 3D model:', err);
      setError(err.response?.data?.detail || 'Failed to generate 3D GLB dam model.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-6 text-slate-100 font-sans">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Generate Parametric 3D Dam Model</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 text-xs p-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Dam Structural Type
            </label>
            <select
              value={damType}
              onChange={(e) => setDamType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="CONCRETE_GRAVITY">Concrete Gravity Dam</option>
              <option value="ARCH">Concrete Double-Curvature Arch Dam</option>
              <option value="EMBANKMENT">Earthfill / Rockfill Embankment Dam</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Dam Height (meters)
              </label>
              <input
                type="number"
                min="15"
                max="350"
                value={heightMeters}
                onChange={(e) => setHeightMeters(parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Dam Length (meters)
              </label>
              <input
                type="number"
                min="50"
                max="1500"
                value={lengthMeters}
                onChange={(e) => setLengthMeters(parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Spillway Gate Bays
            </label>
            <input
              type="number"
              min="0"
              max="12"
              value={spillwayCount}
              onChange={(e) => setSpillwayCount(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="bg-slate-950 border border-slate-800 p-3 rounded text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>Target Asset Target: {damName}</span>
            </div>
            <p className="text-[11px]">
              Procedurally compiles binary GLB 2.0 3D geometry with crest road, piers, water basin, and concrete PBR materials.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium transition-colors shadow-lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Building 3D Mesh...</span>
                </>
              ) : (
                <>
                  <Box className="w-3.5 h-3.5" />
                  <span>Generate & Render 3D Model</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
