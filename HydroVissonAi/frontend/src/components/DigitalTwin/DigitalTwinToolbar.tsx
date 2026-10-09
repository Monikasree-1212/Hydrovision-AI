import React from 'react';
import { Box, Eye, EyeOff, Upload, MapPin, CheckCircle, Camera, Layers, Activity, Flame, Ghost, Ruler, Scissors, Filter } from 'lucide-react';
import { DigitalTwinModel, UserRole } from '../../types';
import { CAMERA_PRESETS, RenderMode } from './DigitalTwinViewer';

interface DigitalTwinToolbarProps {
  models: DigitalTwinModel[];
  activeModel: DigitalTwinModel | null;
  selectedModel: DigitalTwinModel | null;
  onSelectModel: (model: DigitalTwinModel) => void;
  showDefects: boolean;
  onToggleShowDefects: () => void;
  onOpenUploadModal: () => void;
  onOpenParametricModal: () => void;
  onActivateModel: (modelId: number) => void;
  userRole?: UserRole;
  damId: number;
  activePreset: string;
  onSelectPreset: (presetId: string) => void;
  renderMode: RenderMode;
  onSelectRenderMode: (mode: RenderMode) => void;
  isMeasuringMode?: boolean;
  onToggleMeasuringMode?: () => void;
  onClearMeasurement?: () => void;
  clippingAxis?: 'NONE' | 'X' | 'Y' | 'Z';
  onSelectClippingAxis?: (axis: 'NONE' | 'X' | 'Y' | 'Z') => void;
  clippingOffset?: number;
  onChangeClippingOffset?: (val: number) => void;
  severityFilter?: string;
  onSelectSeverityFilter?: (sev: string) => void;
}

export const DigitalTwinToolbar: React.FC<DigitalTwinToolbarProps> = ({
  models,
  activeModel,
  selectedModel,
  onSelectModel,
  showDefects,
  onToggleShowDefects,
  onOpenUploadModal,
  onOpenParametricModal,
  onActivateModel,
  userRole,
  damId,
  activePreset,
  onSelectPreset,
  renderMode,
  onSelectRenderMode,
  isMeasuringMode = false,
  onToggleMeasuringMode,
  onClearMeasurement,
  clippingAxis = 'NONE',
  onSelectClippingAxis,
  clippingOffset = 0,
  onChangeClippingOffset,
  severityFilter = 'ALL',
  onSelectSeverityFilter,
}) => {
  const isEngineer = userRole === 'INSPECTION_ENGINEER';
  const isSelectedActive = selectedModel && selectedModel.is_active;

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300 shadow-xl">
      {/* Left Section: Model Selection & Version Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Box className="w-5 h-5 text-blue-400" />
          <span className="text-xs uppercase tracking-wider text-slate-400">3D Asset:</span>
        </div>

        {models.length > 0 ? (
          <select
            value={selectedModel?.id || ''}
            onChange={(e) => {
              const id = parseInt(e.target.value, 10);
              const found = models.find((m) => m.id === id);
              if (found) onSelectModel(found);
            }}
            className="bg-slate-950 text-slate-100 border border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 font-mono text-xs font-medium"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.version} ({m.model_format}) {m.is_active ? '★ ACTIVE' : ''} — {m.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-slate-500 italic text-xs">Procedural 3D Dam Engine Active</span>
        )}

        {selectedModel && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
              isSelectedActive
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                : 'bg-amber-950/80 text-amber-400 border border-amber-800'
            }`}
          >
            {isSelectedActive ? 'ACTIVE' : 'HISTORICAL'}
          </span>
        )}
      </div>

      {/* Middle Section: Camera Presets & Render Modes */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Camera Presets */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 space-x-1">
          <span className="text-[10px] text-slate-500 font-bold px-2 flex items-center gap-1 uppercase tracking-wider">
            <Camera className="w-3 h-3 text-blue-400" />
            Views
          </span>
          {CAMERA_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectPreset(p.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                activePreset === p.id
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {p.label.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* 5 3D Render Modes */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 space-x-1">
          <button
            onClick={() => onSelectRenderMode('REALISTIC')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1 ${
              renderMode === 'REALISTIC'
                ? 'bg-emerald-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Photorealistic PBR Textures & Water Animation"
          >
            <Layers className="w-3 h-3" />
            Realistic
          </button>
          <button
            onClick={() => onSelectRenderMode('WIREFRAME')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
              renderMode === 'WIREFRAME'
                ? 'bg-blue-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Structural Wireframe Geometry Grid"
          >
            Wireframe
          </button>
          <button
            onClick={() => onSelectRenderMode('STRESS')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1 ${
              renderMode === 'STRESS'
                ? 'bg-rose-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="FEA Structural Stress Gradient"
          >
            <Activity className="w-3 h-3" />
            Stress
          </button>
          <button
            onClick={() => onSelectRenderMode('HEATMAP')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1 ${
              renderMode === 'HEATMAP'
                ? 'bg-amber-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Thermal Defect Density Field"
          >
            <Flame className="w-3 h-3 text-amber-300" />
            Heatmap
          </button>
          <button
            onClick={() => onSelectRenderMode('XRAY_GHOST')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1 ${
              renderMode === 'XRAY_GHOST'
                ? 'bg-sky-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Translucent X-Ray Concrete Shell"
          >
            <Ghost className="w-3 h-3 text-sky-200" />
            X-Ray Shell
          </button>
        </div>

        {/* 3D Distance Measurement Tool */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 space-x-1">
          <button
            onClick={onToggleMeasuringMode}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1.5 ${
              isMeasuringMode
                ? 'bg-cyan-600 text-white shadow-md font-bold animate-pulse'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Click two 3D coordinates on dam face to measure Euclidean distance"
          >
            <Ruler className="w-3 h-3 text-cyan-300" />
            <span>Measure 3D</span>
          </button>
          {isMeasuringMode && onClearMeasurement && (
            <button
              onClick={onClearMeasurement}
              className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-rose-400 font-mono"
            >
              Reset
            </button>
          )}
        </div>

        {/* Section Cut Clipping Plane Controls */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 space-x-1.5">
          <span className="text-[10px] text-slate-500 font-bold px-1.5 flex items-center gap-1 uppercase tracking-wider">
            <Scissors className="w-3 h-3 text-amber-400" />
            Cut:
          </span>
          {(['NONE', 'X', 'Y', 'Z'] as const).map((axis) => (
            <button
              key={axis}
              onClick={() => onSelectClippingAxis && onSelectClippingAxis(axis)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                clippingAxis === axis
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {axis}
            </button>
          ))}
          {clippingAxis !== 'NONE' && onChangeClippingOffset && (
            <input
              type="range"
              min="-150"
              max="150"
              value={clippingOffset}
              onChange={(e) => onChangeClippingOffset(parseFloat(e.target.value))}
              className="w-16 accent-amber-500 cursor-pointer h-1"
              title="Adjust cut plane depth"
            />
          )}
        </div>

        {/* Severity Filter Dropdown */}
        {onSelectSeverityFilter && (
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <Filter className="w-3 h-3 text-slate-400 ml-1.5" />
            <select
              value={severityFilter}
              onChange={(e) => onSelectSeverityFilter(e.target.value)}
              className="bg-transparent text-slate-200 text-[11px] font-medium px-2 py-0.5 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Only</option>
              <option value="MEDIUM">Medium Only</option>
              <option value="LOW">Low Only</option>
            </select>
          </div>
        )}
      </div>

      {/* Right Section: Actions & Upload */}
      <div className="flex items-center gap-2">
        {/* Toggle Defects */}
        <button
          onClick={onToggleShowDefects}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            showDefects
              ? 'bg-blue-950/80 border-blue-700 text-blue-300 hover:bg-blue-900'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
          }`}
        >
          {showDefects ? <Eye className="w-3.5 h-3.5 text-blue-400" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{showDefects ? 'Hide Defects' : 'Show Defects'}</span>
        </button>

        {/* Activate Model (Engineer Only) */}
        {isEngineer && selectedModel && !isSelectedActive && (
          <button
            onClick={() => onActivateModel(selectedModel.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 transition-colors shadow-lg"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Set Active</span>
          </button>
        )}

        {/* Parametric 3D Generator Button */}
        <button
          onClick={onOpenParametricModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 transition-colors shadow-lg"
          title="Generates dynamic 3D dam model matching structural dimensions"
        >
          <Box className="w-3.5 h-3.5 text-indigo-200" />
          <span>Generate 3D Dam</span>
        </button>

        {/* Upload Custom GLB (Engineer Only) */}
        {isEngineer && (
          <button
            onClick={onOpenUploadModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 transition-colors shadow-lg"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload GLB</span>
          </button>
        )}

        {/* Link to GIS Map */}
        <a
          href={`/gis?damId=${damId}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
        >
          <MapPin className="w-3.5 h-3.5 text-rose-400" />
          <span>GIS Map</span>
        </a>
      </div>
    </div>
  );
};

