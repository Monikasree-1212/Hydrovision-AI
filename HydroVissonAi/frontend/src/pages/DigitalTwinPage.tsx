import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Upload, AlertCircle, Layers, CheckCircle, RefreshCw, 
  MapPin, ShieldAlert, Cpu, Tag, Info, AlertTriangle, Sparkles 
} from 'lucide-react';
import { DigitalTwinService, DamService, AuthService } from '../services/api';
import { 
  DigitalTwinSummary, DigitalTwinModel, DigitalTwinDefectOverlay, 
  Dam, User 
} from '../types';
import { DigitalTwinViewer, RenderMode } from '../components/DigitalTwin/DigitalTwinViewer';
import { DigitalTwinToolbar } from '../components/DigitalTwin/DigitalTwinToolbar';
import { DigitalTwinLegend } from '../components/DigitalTwin/DigitalTwinLegend';
import { DigitalTwinDefectDrawer } from '../components/DigitalTwin/DigitalTwinDefectDrawer';
import { DigitalTwinModelUpload } from '../components/DigitalTwin/DigitalTwinModelUpload';
import { ParametricDamGeneratorModal } from '../components/DigitalTwin/ParametricDamGeneratorModal';

export const DigitalTwinPage: React.FC = () => {
  const { damId: urlDamId } = useParams<{ damId: string }>();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dams, setDams] = useState<Dam[]>([]);
  const [selectedDamId, setSelectedDamId] = useState<number>(urlDamId ? parseInt(urlDamId, 10) : 1);
  const [summary, setSummary] = useState<DigitalTwinSummary | null>(null);
  const [models, setModels] = useState<DigitalTwinModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<DigitalTwinModel | null>(null);
  const [selectedDefect, setSelectedDefect] = useState<DigitalTwinDefectOverlay | null>(null);
  const [showDefects, setShowDefects] = useState<boolean>(true);
  const [activePreset, setActivePreset] = useState<string>('OVERVIEW');
  const [renderMode, setRenderMode] = useState<RenderMode>('REALISTIC');
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isParametricOpen, setIsParametricOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Advanced 3D Twin state
  const [isMeasuringMode, setIsMeasuringMode] = useState<boolean>(false);
  const [measurementPoints, setMeasurementPoints] = useState<{ x: number; y: number; z: number }[]>([]);
  const [clippingAxis, setClippingAxis] = useState<'NONE' | 'X' | 'Y' | 'Z'>('NONE');
  const [clippingOffset, setClippingOffset] = useState<number>(0);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const handleAddMeasurementPoint = (pt: { x: number; y: number; z: number }) => {
    setMeasurementPoints((prev) => (prev.length >= 2 ? [pt] : [...prev, pt]));
  };

  const calculateDistance = () => {
    if (measurementPoints.length < 2) return null;
    const p1 = measurementPoints[0];
    const p2 = measurementPoints[1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    const distMeters = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const distFeet = distMeters * 3.28084;
    return { meters: distMeters.toFixed(2), feet: distFeet.toFixed(2) };
  };

  const distResult = calculateDistance();

  // Fetch current user and dams list
  useEffect(() => {
    AuthService.getMe()
      .then(setCurrentUser)
      .catch(console.error);

    DamService.getDams()
      .then((data) => {
        setDams(data);
        if (data.length > 0 && !urlDamId) {
          setSelectedDamId(data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch digital twin summary and models whenever selectedDamId changes
  useEffect(() => {
    if (!selectedDamId) return;

    setLoading(true);
    setSelectedDefect(null);

    Promise.all([
      DigitalTwinService.getDamSummary(selectedDamId),
      DigitalTwinService.getModels(selectedDamId),
    ])
      .then(([sumData, modelList]) => {
        setSummary(sumData);
        setModels(modelList);

        if (sumData.active_model) {
          setSelectedModel(sumData.active_model);
        } else if (modelList.length > 0) {
          setSelectedModel(modelList[0]);
        } else {
          setSelectedModel(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load Digital Twin data:', err);
        setLoading(false);
      });
  }, [selectedDamId]);

  const handleDamChange = (newId: number) => {
    setSelectedDamId(newId);
    navigate(`/digital-twin/${newId}`, { replace: true });
  };

  const handleActivateModel = async (modelId: number) => {
    try {
      await DigitalTwinService.activateModel(modelId);
      const [sumData, modelList] = await Promise.all([
        DigitalTwinService.getDamSummary(selectedDamId),
        DigitalTwinService.getModels(selectedDamId),
      ]);
      setSummary(sumData);
      setModels(modelList);
      const active = modelList.find((m: DigitalTwinModel) => m.id === modelId);
      if (active) setSelectedModel(active);
    } catch (err: any) {
      console.error('Model activation failed:', err);
      alert(err.response?.data?.detail || 'Failed to activate 3D Digital Twin model.');
    }
  };

  const isEngineer = currentUser?.role === 'INSPECTION_ENGINEER';
  const modelUrl = selectedModel ? selectedModel.download_url || null : null;

  return (
    <div className="p-4 sm:p-6 max-w-[1700px] mx-auto space-y-5 text-slate-100 font-sans">
      {/* Top Glass Header & Dam Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-4 rounded-xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Box className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>3D Digital Twin Engine & Spatial Viewer</span>
              <span className="text-[11px] font-mono font-bold bg-blue-950 text-blue-400 border border-blue-800 px-2 py-0.5 rounded-md">
                PBR Real-Time WebGL
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real spatial representation of dam infrastructure overlaying AI-inspected defect records in high-fidelity 3D.
          </p>
        </div>

        {/* Dam Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Select Dam:</label>
          <select
            value={selectedDamId}
            onChange={(e) => handleDamChange(parseInt(e.target.value, 10))}
            className="bg-slate-950 text-slate-100 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 shadow-sm"
          >
            {dams.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code}) — {d.state}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-[650px] bg-slate-950 border border-slate-800 rounded-xl flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-9 h-9 text-blue-400 animate-spin" />
          <p className="text-sm font-semibold text-slate-300 font-mono uppercase tracking-wider">
            Loading Spatial Assets & Defect Overlays...
          </p>
        </div>
      ) : (
        /* 3D Digital Twin Viewer & Glass Overlay Layout */
        <div className="space-y-4">
          <DigitalTwinToolbar
            models={models}
            activeModel={summary?.active_model || null}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            showDefects={showDefects}
            onToggleShowDefects={() => setShowDefects(!showDefects)}
            onOpenUploadModal={() => setIsUploadOpen(true)}
            onOpenParametricModal={() => setIsParametricOpen(true)}
            onActivateModel={handleActivateModel}
            userRole={currentUser?.role}
            damId={selectedDamId}
            activePreset={activePreset}
            onSelectPreset={setActivePreset}
            renderMode={renderMode}
            onSelectRenderMode={setRenderMode}
            isMeasuringMode={isMeasuringMode}
            onToggleMeasuringMode={() => setIsMeasuringMode(!isMeasuringMode)}
            onClearMeasurement={() => setMeasurementPoints([])}
            clippingAxis={clippingAxis}
            onSelectClippingAxis={setClippingAxis}
            clippingOffset={clippingOffset}
            onChangeClippingOffset={setClippingOffset}
            severityFilter={severityFilter}
            onSelectSeverityFilter={setSeverityFilter}
          />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {/* Main 3D Canvas Viewport with Floating Glass Overlays */}
            <div className="lg:col-span-3 h-[720px] relative rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
              <DigitalTwinViewer
                modelUrl={modelUrl}
                defects={summary?.defects || []}
                selectedDefectId={selectedDefect?.defect_id}
                onSelectDefect={setSelectedDefect}
                showDefects={showDefects}
                activePreset={activePreset}
                renderMode={renderMode}
                damName={summary?.dam_name}
                isMeasuringMode={isMeasuringMode}
                measurementPoints={measurementPoints}
                onAddMeasurementPoint={handleAddMeasurementPoint}
                clippingAxis={clippingAxis}
                clippingOffset={clippingOffset}
                severityFilter={severityFilter}
              />

              {/* Floating Legend Overlay */}
              <div className="absolute top-4 left-4 z-10">
                <DigitalTwinLegend
                  totalDefects={summary?.total_defects || 0}
                  spatiallyLocated={summary?.spatially_located_defects || 0}
                  missingLocation={summary?.missing_location_defects || 0}
                />
              </div>

              {/* Floating 3D Measurement Readout HUD Overlay */}
              {isMeasuringMode && (
                <div className="absolute top-4 right-4 z-20 bg-slate-900/95 border border-cyan-800/80 backdrop-blur-md p-3.5 rounded-xl shadow-2xl space-y-2 max-w-xs text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-semibold text-cyan-300">
                    <span className="flex items-center gap-1.5 uppercase font-mono tracking-wider text-[11px]">
                      <span>3D Spatial Dimension Tool</span>
                    </span>
                    <button
                      onClick={() => setMeasurementPoints([])}
                      className="text-[10px] text-slate-400 hover:text-white font-mono"
                    >
                      Clear
                    </button>
                  </div>

                  {measurementPoints.length === 0 && (
                    <p className="text-slate-400 text-[11px]">
                      Click first 3D coordinate on dam structure...
                    </p>
                  )}

                  {measurementPoints.length === 1 && (
                    <p className="text-cyan-400 text-[11px] animate-pulse">
                      Point A logged: ({measurementPoints[0].x}, {measurementPoints[0].y}, {measurementPoints[0].z}). Click Point B...
                    </p>
                  )}

                  {distResult && (
                    <div className="space-y-1 bg-slate-950 p-2.5 rounded-lg border border-cyan-900">
                      <div className="flex justify-between items-center text-slate-300">
                        <span>3D Euclidean Distance:</span>
                        <span className="font-mono font-bold text-cyan-400 text-sm">{distResult.meters} m</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400 text-[10px]">
                        <span>Imperial Feet:</span>
                        <span className="font-mono">{distResult.feet} ft</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Technical Information & Metadata Panel */}
            <div className="space-y-4">
              <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl">
                <h3 className="font-semibold text-slate-100 text-sm border-b border-slate-800 pb-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-400" />
                    <span>Digital Twin Metadata</span>
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dam Target</span>
                    <span className="font-semibold text-slate-100">{summary?.dam_name || 'Hydro Asset'}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Model Name</span>
                    <span className="text-slate-200">{selectedModel?.name || 'Photorealistic Procedural Dam Twin'}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Version</span>
                    <span className="font-mono text-blue-400 font-bold">{selectedModel?.version || 'v2.0-Engine'}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Format</span>
                    <span className="font-mono text-slate-200">{selectedModel?.model_format || 'GLTF 2.0 Binary'}</span>
                  </div>

                  {selectedModel && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">File Size</span>
                      <span className="text-slate-200">
                        {(selectedModel.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between pt-2 border-t border-slate-800">
                    <span className="text-slate-400">Active Engine Status</span>
                    <span className="font-semibold font-mono text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      READY
                    </span>
                  </div>
                </div>
              </div>

              {/* Spatial Overlay Summary */}
              <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-4 space-y-3 text-xs shadow-xl">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-400">
                  3D Spatial Mapping Stats
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block font-semibold uppercase">SPATIALLY MAPPED</span>
                    <span className="text-xl font-bold text-emerald-400 font-mono">
                      {summary?.spatially_located_defects || 0}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block font-semibold uppercase">UNMAPPED DEFECTS</span>
                    <span className="text-xl font-bold text-slate-400 font-mono">
                      {summary?.missing_location_defects || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Unmapped Defects List */}
              {summary && summary.missing_location_defects > 0 && (
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-4 space-y-2 text-xs shadow-xl">
                  <h4 className="font-semibold text-slate-300 flex items-center gap-1.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Unmapped Defects ({summary.missing_location_defects})</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Defects without spatial coordinates are logged below:
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1 pt-1">
                    {summary.defects
                      .filter((d) => !d.position_available)
                      .map((d) => (
                        <div
                          key={d.defect_id}
                          onClick={() => setSelectedDefect(d)}
                          className="p-2 bg-slate-950 hover:bg-slate-800 rounded-lg border border-slate-800 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <span className="font-mono text-slate-200 text-[11px]">{d.defect_code}</span>
                          <span className="text-[10px] text-amber-400 font-mono">NO 3D COORDS</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Defect Detail Drawer */}
      <DigitalTwinDefectDrawer
        defect={selectedDefect}
        onClose={() => setSelectedDefect(null)}
        damId={selectedDamId}
      />

      {/* Model Upload Modal */}
      <DigitalTwinModelUpload
        damId={selectedDamId}
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(newModel) => {
          setSelectedModel(newModel);
          DigitalTwinService.getDamSummary(selectedDamId).then(setSummary);
          DigitalTwinService.getModels(selectedDamId).then(setModels);
        }}
      />

      {/* Parametric 3D Model Generator Modal */}
      <ParametricDamGeneratorModal
        damId={selectedDamId}
        damName={summary?.dam_name || 'Dam Structure'}
        isOpen={isParametricOpen}
        onClose={() => setIsParametricOpen(false)}
        onSuccess={(newModel) => {
          setSelectedModel(newModel);
          DigitalTwinService.getDamSummary(selectedDamId).then(setSummary);
          DigitalTwinService.getModels(selectedDamId).then(setModels);
        }}
      />
    </div>
  );
};
