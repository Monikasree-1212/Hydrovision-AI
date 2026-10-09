import React, { useEffect, useState } from 'react';
import { Inspection, DroneImage, AIDetection, ModelStatus } from '../types';
import { AIService, InspectionService, UploadService } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { Cpu, AlertTriangle, Play, CheckCircle, RefreshCw, Eye, ShieldAlert } from 'lucide-react';

export const AIAnalysisPage: React.FC = () => {
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<number | ''>('');
  const [mediaList, setMediaList] = useState<DroneImage[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null);
  const [detections, setDetections] = useState<AIDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningJob, setRunningJob] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);

  const fetchModelAndInspections = async () => {
    setLoading(true);
    setJobError(null);
    try {
      const status = await AIService.getModelStatus();
      setModelStatus(status);

      const insps = await InspectionService.getInspections();
      setInspections(insps);

      const targetInspId = selectedInspection ? Number(selectedInspection) : (insps.length > 0 ? insps[0].id : null);
      if (targetInspId) {
        const media = await UploadService.getInspectionMedia(targetInspId);
        setMediaList(media);

        const results = await AIService.getInspectionResults(targetInspId);
        setDetections(results);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelAndInspections();
  }, [selectedInspection]);

  const handleRunInference = async () => {
    const targetInspId = selectedInspection ? Number(selectedInspection) : (inspections.length > 0 ? inspections[0].id : null);
    if (!targetInspId) return;

    setRunningJob(true);
    setJobError(null);
    try {
      await AIService.analyzeInspection(targetInspId);
      await fetchModelAndInspections();
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'AI inference failed or model weights are unconfigured.';
      setJobError(detail);
    } finally {
      setRunningJob(false);
    }
  };

  const activeMedia = mediaList.find((m) => m.id === selectedMediaId) || mediaList[0];
  const activeDetections = activeMedia ? detections.filter((d) => d.media_id === activeMedia.id) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="YOLO11 AI Defect Analysis Workspace"
        description="Deep learning automated inference pipeline detecting concrete cracks, steel rebar corrosion, and water seepage from high-resolution drone imagery and video frames."
        category="MODULE 06 — AI ANALYSIS"
        breadcrumbs={[{ name: 'Dashboard', path: '/' }, { name: 'AI Analysis' }]}
        actions={
          <button
            onClick={fetchModelAndInspections}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh AI State</span>
          </button>
        }
      />

      {/* Model Operational Status Banner */}
      <div className="bg-white p-4 rounded-lg border border-govt-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-govt-light rounded-lg border border-govt-border">
            <Cpu className="w-6 h-6 text-govt-blue" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Inference Engine Model Status</div>
            <div className="text-base font-bold text-govt-navy flex items-center space-x-2">
              <span>{modelStatus?.model_name || 'YOLO11 Concrete Safety Model'}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                modelStatus?.status === 'LOADED' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}>
                {modelStatus?.status === 'LOADED' ? 'MODEL WEIGHTS LOADED' : 'WEIGHTS UNCONFIGURED'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <select
            value={selectedInspection}
            onChange={(e) => setSelectedInspection(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2 border border-govt-border rounded-md text-sm outline-none focus:border-govt-blue bg-white"
          >
            <option value="">Select Inspection</option>
            {inspections.map((insp) => (
              <option key={insp.id} value={insp.id}>
                {insp.inspection_code} — Dam #{insp.dam_id}
              </option>
            ))}
          </select>

          <button
            onClick={handleRunInference}
            disabled={runningJob || !selectedInspection}
            className="flex items-center space-x-1.5 bg-govt-blue hover:bg-blue-900 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded transition shadow-sm whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{runningJob ? 'Executing Inference...' : 'Run YOLO11 Inference'}</span>
          </button>
        </div>
      </div>

      {/* Model Unavailable Infrastructure Warning */}
      {jobError && (
        <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-r-lg shadow-sm flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-rose-900 text-sm">AI Inference Unavailable</div>
            <div className="text-xs text-rose-800 mt-0.5 leading-relaxed">{jobError}</div>
          </div>
        </div>
      )}

      {/* Visual Bounding Box Analysis Canvas & Detections */}
      {loading ? (
        <div className="text-center py-12 text-sm text-slate-500 font-medium">Querying AI detection results...</div>
      ) : mediaList.length === 0 ? (
        <EmptyState
          title="No drone media available for AI analysis"
          description="Upload drone visual or thermal imagery in the Drone Data module before triggering YOLO11 defect analysis."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Media Selector & Image Viewer with Bounding Boxes */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-govt-border shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-govt-border pb-3">
              <h2 className="text-base font-bold text-govt-navy">Drone Media Frame Inspection</h2>
              <span className="text-xs font-mono text-slate-500">{activeMedia?.filename}</span>
            </div>

            {/* Thumbnail Selector */}
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {mediaList.map((media) => (
                <button
                  key={media.id}
                  onClick={() => setSelectedMediaId(media.id)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap border transition ${
                    activeMedia?.id === media.id
                      ? 'bg-govt-navy text-white border-govt-navy shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-govt-border hover:bg-slate-100'
                  }`}
                >
                  {media.filename}
                </button>
              ))}
            </div>

            {/* Image Canvas with Real Bounding Boxes */}
            {activeMedia && (
              <div className="relative border border-slate-300 rounded-lg overflow-hidden bg-slate-900 flex justify-center items-center min-h-[360px]">
                <ImageWithFallback
                  src={activeMedia.storage_key ? `/api/v1/uploads/storage/${activeMedia.storage_key}` : `/api/v1/uploads/media/${activeMedia.id}/file`}
                  alt={activeMedia.filename}
                  className="max-h-[500px] w-auto object-contain"
                />

                {/* Overlay Bounding Boxes */}
                {activeDetections.map((det) => {
                  const width = ((det.bbox_x_max - det.bbox_x_min) * 100).toFixed(1);
                  const height = ((det.bbox_y_max - det.bbox_y_min) * 100).toFixed(1);
                  const left = (det.bbox_x_min * 100).toFixed(1);
                  const top = (det.bbox_y_min * 100).toFixed(1);

                  return (
                    <div
                      key={det.id}
                      style={{
                        position: 'absolute',
                        left: `${left}%`,
                        top: `${top}%`,
                        width: `${width}%`,
                        height: `${height}%`,
                      }}
                      className="border-2 border-rose-500 bg-rose-500/20 rounded pointer-events-none"
                    >
                      <span className="absolute -top-6 left-0 bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                        {det.defect_type} ({(det.confidence * 100).toFixed(0)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Detailed Detections List */}
          <div className="bg-white rounded-lg border border-govt-border shadow-sm p-5 space-y-4">
            <h2 className="text-base font-bold text-govt-navy border-b border-govt-border pb-3">
              YOLO11 Model Detections ({activeDetections.length})
            </h2>

            {activeDetections.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No structural defect bounding boxes detected on this specific frame.
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {activeDetections.map((det) => (
                  <div key={det.id} className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>{det.detection_code}</span>
                      <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                        {det.defect_type}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Model Confidence:</span>
                      <span className="font-mono font-bold text-emerald-800">{(det.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-slate-600 font-mono text-[11px]">
                      <span>BBox Coordinates:</span>
                      <span>
                        [{det.bbox_x_min.toFixed(2)}, {det.bbox_y_min.toFixed(2)}, {det.bbox_x_max.toFixed(2)}, {det.bbox_y_max.toFixed(2)}]
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px] border-t border-slate-200 pt-1 mt-1">
                      <span>Inference Model:</span>
                      <span>{det.model_name || 'YOLO11-Seg'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
