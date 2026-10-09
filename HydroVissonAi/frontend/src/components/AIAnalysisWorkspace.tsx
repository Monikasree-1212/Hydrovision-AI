import React, { useEffect, useState } from 'react';
import { 
  ModelStatus, AIDetection, BatchAnalysisSummary, DefectSeverity, DroneImage 
} from '../types';
import { AIService, UploadService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Cpu, AlertTriangle, CheckCircle, XCircle, Edit3, ShieldAlert, 
  RefreshCw, Filter, Eye, Layers, FileCheck, Image as ImageIcon,
  CheckCircle2, AlertCircle, X, Sparkles, ChevronRight, Maximize2
} from 'lucide-react';
import { ImageWithFallback } from './common/ImageWithFallback';

interface AIAnalysisWorkspaceProps {
  inspectionId: number;
  onDefectsUpdated?: () => void;
}

export const AIAnalysisWorkspace: React.FC<AIAnalysisWorkspaceProps> = ({ inspectionId, onDefectsUpdated }) => {
  const { role } = useAuth();
  const isEngineer = role === 'INSPECTION_ENGINEER';

  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [detections, setDetections] = useState<AIDetection[]>([]);
  const [mediaList, setMediaList] = useState<DroneImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [batchSummary, setBatchSummary] = useState<BatchAnalysisSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 1 State: Media Quality Category Tab
  const [mediaCategoryTab, setMediaCategoryTab] = useState<'VALID' | 'WARNING' | 'REJECTED'>('VALID');

  // Step 2 State: Defect Filters
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterMinConfidence, setFilterMinConfidence] = useState<number>(0.0);

  // Step 3 State: Active Detection for Review
  const [activeDetection, setActiveDetection] = useState<AIDetection | null>(null);
  const [viewAnnotated, setViewAnnotated] = useState<boolean>(true);

  // Review Form State
  const [reviewAction, setReviewAction] = useState<'ACCEPT' | 'REJECT' | 'EDIT'>('ACCEPT');
  const [editDefectType, setEditDefectType] = useState<string>('CRACK');
  const [editSeverity, setEditSeverity] = useState<DefectSeverity>('MEDIUM');
  const [editComments, setEditComments] = useState<string>('');
  const [editBboxXMin, setEditBboxXMin] = useState<number>(0);
  const [editBboxYMin, setEditBboxYMin] = useState<number>(0);
  const [editBboxXMax, setEditBboxXMax] = useState<number>(0);
  const [editBboxYMax, setEditBboxYMax] = useState<number>(0);
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadWorkspace = async () => {
    setLoading(true);
    setError(null);
    try {
      const statusData = await AIService.getModelStatus();
      setModelStatus(statusData);

      const results = await AIService.getInspectionResults(inspectionId);
      setDetections(results);

      try {
        const media = await UploadService.getInspectionMedia(inspectionId);
        setMediaList(media);
      } catch (err) {
        console.warn("Failed to load inspection media:", err);
      }
    } catch (err: any) {
      console.error("Workspace load error:", err);
      setError(err.response?.data?.detail || "Failed to load AI workspace status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, [inspectionId]);

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    setBatchSummary(null);
    try {
      const summary = await AIService.analyzeInspectionBatch(inspectionId);
      setBatchSummary(summary);
      await loadWorkspace();
      if (onDefectsUpdated) onDefectsUpdated();
    } catch (err: any) {
      setError(err.response?.data?.detail || "AI Batch Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectDetection = (det: AIDetection) => {
    setActiveDetection(det);
    setReviewAction('ACCEPT');
    setEditDefectType(det.final_defect_type || det.defect_type);
    setEditSeverity(det.final_severity || 'MEDIUM');
    setEditComments(det.review_comment || '');
    setEditBboxXMin(det.bbox_x_min);
    setEditBboxYMin(det.bbox_y_min);
    setEditBboxXMax(det.bbox_x_max);
    setEditBboxYMax(det.bbox_y_max);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDetection) return;
    setSubmittingReview(true);
    try {
      const updated = await AIService.reviewDetection(activeDetection.id, {
        action: reviewAction,
        defect_type: reviewAction === 'EDIT' ? editDefectType : undefined,
        severity: editSeverity,
        bbox_x_min: reviewAction === 'EDIT' ? editBboxXMin : undefined,
        bbox_y_min: reviewAction === 'EDIT' ? editBboxYMin : undefined,
        bbox_x_max: reviewAction === 'EDIT' ? editBboxXMax : undefined,
        bbox_y_max: reviewAction === 'EDIT' ? editBboxYMax : undefined,
        engineer_comments: editComments,
      });

      setActiveDetection(null);
      await loadWorkspace();
      if (onDefectsUpdated) onDefectsUpdated();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to submit review decision.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Filter Media for Step 1
  const validMedia = mediaList.filter(m => m.quality_status === 'VALID' || !m.quality_status);
  const warningMedia = mediaList.filter(m => m.quality_status === 'WARNING');
  const rejectedMedia = mediaList.filter(m => m.quality_status === 'REJECTED');

  const displayedMedia = mediaCategoryTab === 'VALID' ? validMedia :
                         mediaCategoryTab === 'WARNING' ? warningMedia : rejectedMedia;

  // Filter Detections for Step 2
  const filteredDetections = detections.filter(d => {
    if (filterType !== 'ALL' && d.defect_type !== filterType) return false;
    if (filterStatus !== 'ALL' && d.review_status !== filterStatus) return false;
    if (d.confidence < filterMinConfidence) return false;
    return true;
  });

  const getMediaForDetection = (mediaId: number) => {
    return mediaList.find(m => m.id === mediaId);
  };

  const isModelUnavailable = !modelStatus || modelStatus.status === 'UNAVAILABLE' || modelStatus.status === 'LOAD_FAILED';

  return (
    <div className="space-y-8 font-sans text-slate-100">
      
      {/* ========================================================================= */}
      {/* TOP HEADER: YOLO11 Model Status & Single-Click Scanner Launcher */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-xl ${isModelUnavailable ? 'bg-amber-500/10 text-amber-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-extrabold text-white">YOLO11 AI Defect Detection Engine</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  modelStatus?.status === 'LOADED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  modelStatus?.status === 'CONFIGURED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {modelStatus?.status || 'UNAVAILABLE'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Real-time neural network inference for concrete cracks, seepage, corrosion, spalling, and erosion.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {modelStatus && (
              <div className="hidden lg:flex items-center space-x-4 text-xs text-slate-400 border-r border-slate-800 pr-4">
                <div><span className="text-slate-500">Model:</span> <span className="text-slate-200 font-mono font-bold">{modelStatus.model_name || 'yolo11_dam_defects.pt'}</span></div>
                <div><span className="text-slate-500">Version:</span> <span className="text-slate-200 font-mono">{modelStatus.model_version || '1.0.0'}</span></div>
                <div><span className="text-slate-500">Device:</span> <span className="text-slate-200 font-mono uppercase font-bold">{modelStatus.device}</span></div>
                <div><span className="text-slate-500">Threshold:</span> <span className="text-amber-400 font-mono font-bold">{(modelStatus.confidence_threshold * 100).toFixed(0)}%</span></div>
              </div>
            )}

            <button
              onClick={handleRunAnalysis}
              disabled={analyzing || isModelUnavailable}
              className={`flex items-center space-x-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg ${
                analyzing ? 'bg-cyan-600/50 text-white cursor-wait' :
                isModelUnavailable ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' :
                'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
              <span>{analyzing ? 'Scanning Drone Imagery...' : '⚡ Run YOLO11 AI Defect Scanner'}</span>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mt-4 p-3 bg-rose-900/30 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Batch Job Execution Summary */}
        {batchSummary && (
          <div className="mt-4 p-4 rounded-xl bg-cyan-950/50 border border-cyan-500/40 text-cyan-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-white flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>YOLO11 AI Scan Completed — Job #{batchSummary.job_code}</span>
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold">
                {batchSummary.created_detections} Defect Detections Generated
              </span>
            </div>
            <p className="text-slate-300">{batchSummary.message}</p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: Uploaded Drone Inspection Images (Quality Triage Gallery) */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded tracking-wider">
                STEP 1
              </span>
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Uploaded Inspection Images (Quality Triage Gallery)
              </h4>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Review quality-certified drone imagery grouped by image sharpness and EXIF integrity.
            </p>
          </div>

          {/* Quality Category Selector Tabs */}
          <div className="flex items-center space-x-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setMediaCategoryTab('VALID')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center space-x-1.5 ${
                mediaCategoryTab === 'VALID'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Clear / Valid ({validMedia.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setMediaCategoryTab('WARNING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center space-x-1.5 ${
                mediaCategoryTab === 'WARNING'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Warning ({warningMedia.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setMediaCategoryTab('REJECTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center space-x-1.5 ${
                mediaCategoryTab === 'REJECTED'
                  ? 'bg-rose-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Rejected ({rejectedMedia.length})</span>
            </button>
          </div>
        </div>

        {/* Media Grid */}
        {displayedMedia.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No drone inspection images in the <strong className="text-slate-300">{mediaCategoryTab}</strong> category.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {displayedMedia.map((m) => {
              const imageSrc = m.storage_key
                ? `/api/v1/uploads/storage/${m.storage_key}`
                : `/api/v1/uploads/media/${m.id}/file`;
              return (
                <div key={m.id} className="bg-slate-950 border border-slate-800/80 rounded-xl overflow-hidden group hover:border-slate-700 transition shadow">
                  <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                    <ImageWithFallback
                      src={imageSrc}
                      fallbackSrc={`/api/v1/uploads/media/${m.id}/file`}
                      alt={m.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <span className={`absolute top-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${
                      m.quality_status === 'VALID' || !m.quality_status ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50' :
                      m.quality_status === 'WARNING' ? 'bg-amber-500/30 text-amber-300 border-amber-500/50' :
                      'bg-rose-500/30 text-rose-300 border-rose-500/50'
                    }`}>
                      {m.quality_status || 'VALID'}
                    </span>
                  </div>
                  <div className="p-2 text-[11px] space-y-0.5">
                    <div className="font-bold text-slate-200 truncate" title={m.filename}>{m.filename}</div>
                    <div className="text-slate-400 text-[10px] flex justify-between">
                      <span>{m.width || 1024}x{m.height || 768}</span>
                      <span className="text-amber-400 font-mono">{m.latitude != null || m.gps_status === 'EXIF_EXTRACTED' || m.gps_status === 'MANUALLY_GEOREFERENCED' ? '📍 GPS' : 'No GPS'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STEP 2: YOLO11 AI Defect Scanner & Visual Results Gallery (% Confidence) */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-cyan-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded tracking-wider">
                STEP 2
              </span>
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                YOLO11 AI Defect Scanner & Visual Results Gallery
              </h4>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Identified structural defects with AI confidence percentage scores & bounding box annotations.
            </p>
          </div>

          {/* Defect Filters Bar */}
          <div className="flex flex-wrap gap-2.5 items-center">
            {/* Defect Class Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none font-bold"
              >
                <option value="ALL">All Defect Classes</option>
                <option value="CRACK">🧱 Crack</option>
                <option value="CORROSION">🧪 Corrosion</option>
                <option value="SEEPAGE">💧 Seepage</option>
                <option value="SPALLING">🔨 Spalling</option>
                <option value="EROSION">🌊 Erosion</option>
                <option value="VEGETATION">🌿 Vegetation</option>
              </select>
            </div>

            {/* Review Status Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none font-bold"
              >
                <option value="ALL">All Review Statuses</option>
                <option value="AI_DETECTED">AI Detected</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="EDITED">Edited</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* Confidence Slider */}
            <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-slate-400 shrink-0">Min Conf: <strong className="text-amber-400 font-mono">{(filterMinConfidence * 100).toFixed(0)}%</strong></span>
              <input
                type="range"
                min="0.0"
                max="0.95"
                step="0.05"
                value={filterMinConfidence}
                onChange={(e) => setFilterMinConfidence(parseFloat(e.target.value))}
                className="w-20 accent-cyan-500 bg-slate-800 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Defect Cards Grid */}
        {filteredDetections.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <Eye className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="font-bold text-slate-300">
              {detections.length === 0 ? "No AI defect detections generated yet for this inspection." : "No detections matching active filter criteria."}
            </p>
            {detections.length === 0 && (
              <button
                type="button"
                onClick={handleRunAnalysis}
                disabled={analyzing || isModelUnavailable}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs rounded-xl shadow-lg transition cursor-pointer"
              >
                ⚡ Run YOLO11 AI Defect Scanner Now
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredDetections.map((det) => {
              const media = getMediaForDetection(det.media_id);
              const imageSrc = det.annotated_image_key 
                ? `/api/v1/uploads/storage/${det.annotated_image_key}`
                : media?.storage_key 
                  ? `/api/v1/uploads/storage/${media.storage_key}` 
                  : det.media_id ? `/api/v1/uploads/media/${det.media_id}/file` : '';

              const confPct = Math.round(det.confidence * 100);

              return (
                <div
                  key={det.id}
                  onClick={() => handleSelectDetection(det)}
                  className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden hover:border-cyan-500/70 transition duration-300 cursor-pointer group shadow-xl flex flex-col justify-between"
                >
                  {/* Card Image Header */}
                  <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
                    <ImageWithFallback
                      src={imageSrc}
                      fallbackSrc={det.media_id ? `/api/v1/uploads/media/${det.media_id}/file` : undefined}
                      alt={det.detection_code}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />

                    {/* Defect Class Badge Top Left */}
                    <span className="absolute top-2 left-2 bg-slate-900/90 backdrop-blur text-white text-[10px] font-black px-2.5 py-1 rounded-lg border border-slate-700 uppercase tracking-wider flex items-center space-x-1">
                      <span>{det.final_defect_type || det.defect_type}</span>
                    </span>

                    {/* Confidence % Badge Top Right */}
                    <span className="absolute top-2 right-2 bg-cyan-500 text-slate-950 text-[11px] font-black px-2.5 py-1 rounded-lg shadow-md tracking-wider font-mono">
                      {confPct}% AI Conf
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-extrabold text-amber-400">{det.detection_code}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                        det.review_status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        det.review_status === 'EDITED' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                        det.review_status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {det.review_status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-400">
                      <span>Image #{det.media_id}</span>
                      <span className="font-mono text-[10px]">BBox: [{det.bbox_x_min.toFixed(0)}, {det.bbox_y_min.toFixed(0)}]</span>
                    </div>

                    <button
                      type="button"
                      className="w-full mt-2 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 font-extrabold text-xs rounded-xl border border-slate-800 group-hover:border-cyan-500/40 flex items-center justify-center space-x-1.5 transition"
                    >
                      <span>Review & Confirm</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STEP 3: Human-in-the-Loop Engineer Review & Decision Studio (Modal) */}
      {/* ========================================================================= */}
      {activeDetection && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-6 shadow-2xl relative my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded tracking-wider">
                    STEP 3
                  </span>
                  <span className="font-mono text-base font-black text-amber-400">{activeDetection.detection_code}</span>
                  <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded font-bold">
                    YOLO11 v{activeDetection.model_version || '1.0.0'}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-white mt-1">Human-in-the-Loop Engineer Verification Studio</h3>
              </div>

              <button
                type="button"
                onClick={() => setActiveDetection(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toggle Image View Buttons */}
            <div className="flex justify-between items-center bg-slate-950 p-2 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-400 pl-1">Selected Drone Inspection Photo:</span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setViewAnnotated(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                    !viewAnnotated ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Original Drone Photo
                </button>
                <button
                  type="button"
                  onClick={() => setViewAnnotated(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                    viewAnnotated ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Annotated AI Derivative
                </button>
              </div>
            </div>

            {/* Image Preview Canvas */}
            <div className="relative bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center min-h-[320px] max-h-[460px]">
              {(() => {
                const media = getMediaForDetection(activeDetection.media_id);
                const imageSrc = viewAnnotated && activeDetection.annotated_image_key
                  ? `/api/v1/uploads/storage/${activeDetection.annotated_image_key}`
                  : media?.storage_key 
                    ? `/api/v1/uploads/storage/${media.storage_key}` 
                    : activeDetection.media_id ? `/api/v1/uploads/media/${activeDetection.media_id}/file` : '';

                return (
                  <div className="relative w-full h-full flex items-center justify-center p-2">
                    <ImageWithFallback
                      src={imageSrc}
                      fallbackSrc={activeDetection.media_id ? `/api/v1/uploads/media/${activeDetection.media_id}/file` : undefined}
                      alt="Defect Inspection"
                      className="max-h-[440px] w-auto object-contain rounded-xl"
                    />

                    {/* Bounding box detail overlay info badge */}
                    <div className="absolute top-4 left-4 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl p-3 text-xs shadow-2xl space-y-1 text-slate-200 z-10">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
                        <span className="text-slate-400">Class:</span> 
                        <span className="font-extrabold text-amber-400 uppercase tracking-wider">{activeDetection.final_defect_type || activeDetection.defect_type}</span>
                      </div>
                      <div><span className="text-slate-400">AI Confidence:</span> <span className="font-mono text-cyan-400 font-extrabold">{Math.round(activeDetection.confidence * 100)}%</span></div>
                      <div><span className="text-slate-400">Coordinates:</span> <span className="font-mono text-[11px] text-slate-300">[{activeDetection.bbox_x_min.toFixed(0)}, {activeDetection.bbox_y_min.toFixed(0)}, {activeDetection.bbox_x_max.toFixed(0)}, {activeDetection.bbox_y_max.toFixed(0)}]</span></div>
                      <div className="text-[10px] text-slate-400 pt-0.5 font-semibold">
                        {viewAnnotated ? 'Showing: YOLO11 Derivative with Burnt BBoxes' : 'Showing: Original Drone Raw Photo + Detection Overlay'}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Engineer Review Decision Form */}
            <form onSubmit={handleSubmitReview} className="space-y-4 bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800">
              <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                Official Engineering Verification Protocol
              </h4>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setReviewAction('ACCEPT')}
                  className={`flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-extrabold transition cursor-pointer border ${
                    reviewAction === 'ACCEPT'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>ACCEPT</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewAction('EDIT')}
                  className={`flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-extrabold transition cursor-pointer border ${
                    reviewAction === 'EDIT'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300 ring-1 ring-blue-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>EDIT & ACCEPT</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewAction('REJECT')}
                  className={`flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-extrabold transition cursor-pointer border ${
                    reviewAction === 'REJECT'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-1 ring-rose-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>REJECT (False Pos.)</span>
                </button>
              </div>

              {/* Edit Controls */}
              {reviewAction !== 'REJECT' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Verified Defect Class</label>
                    <select
                      value={editDefectType}
                      onChange={(e) => setEditDefectType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    >
                      <option value="CRACK">🧱 CRACK</option>
                      <option value="CORROSION">🧪 CORROSION</option>
                      <option value="SEEPAGE">💧 SEEPAGE</option>
                      <option value="SPALLING">🔨 SPALLING</option>
                      <option value="EROSION">🌊 EROSION</option>
                      <option value="VEGETATION">🌿 VEGETATION</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Assigned Severity Level</label>
                    <select
                      value={editSeverity}
                      onChange={(e) => setEditSeverity(e.target.value as DefectSeverity)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Engineer Remarks */}
              <div>
                <label className="text-slate-400 block mb-1 text-xs">Engineer Verification Comments</label>
                <textarea
                  rows={2}
                  value={editComments}
                  onChange={(e) => setEditComments(e.target.value)}
                  placeholder="Enter technical verification remarks or maintenance priority notes..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Submit Review */}
              <button
                type="submit"
                disabled={submittingReview}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                {submittingReview ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    <span>Confirm Engineering Verification Decision</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
