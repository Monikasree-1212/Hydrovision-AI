import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Inspection, DroneDataset, DroneImage, Defect } from '../types';
import { InspectionService, UploadService, AIService, DefectService, ReportService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AIAnalysisWorkspace } from '../components/AIAnalysisWorkspace';
import { 
  Upload, Cpu, CheckSquare, Box,
  FileText, ShieldCheck, MapPin, Eye, Hash, Info, X
} from 'lucide-react';

export const InspectionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [dataset, setDataset] = useState<DroneDataset | null>(null);
  const [mediaItems, setMediaItems] = useState<DroneImage[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Manual Georeferencing Modal State
  const [georefMedia, setGeorefMedia] = useState<DroneImage | null>(null);
  const [geoLat, setGeoLat] = useState<string>('');
  const [geoLng, setGeoLng] = useState<string>('');
  const [geoAlt, setGeoAlt] = useState<string>('');
  const [savingGeoref, setSavingGeoref] = useState(false);

  const { role } = useAuth();

  const loadData = async () => {
    if (!id) return;
    const inspId = parseInt(id, 10);
    try {
      const insp = await InspectionService.getInspection(inspId);
      setInspection(insp);
      
      const defcs = await DefectService.getDefects({ inspection_id: inspId });
      setDefects(defcs);

      // Load media list for inspection
      try {
        const media = await UploadService.getInspectionMedia(inspId);
        setMediaItems(media);
      } catch (err) {
        console.error("Failed to load inspection media:", err);
      }

      // Attempt to load attached drone datasets
      try {
        const ds = await UploadService.getDataset(inspId);
        setDataset(ds);
      } catch (err) {
        // dataset might not exist yet
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUploadFiles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspection || selectedFiles.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const ds = await UploadService.uploadDroneData(inspection.id, selectedFiles);
      setDataset(ds);
      setSelectedFiles([]);
      loadData();
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      let msg = 'Upload failed.';
      if (detail) {
        msg = typeof detail === 'string' ? detail : JSON.stringify(detail);
      } else if (err.message) {
        msg = err.message;
      }
      if (status) {
        msg = `HTTP ${status} — ${msg}`;
      }
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleRunAIAnalysis = async () => {
    if (!inspection) return;
    setAnalyzing(true);
    try {
      const createdDefects = await AIService.analyzeInspection(inspection.id);
      setDefects(createdDefects);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'AI processing failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!inspection) return;
    try {
      const updated = await InspectionService.updateInspectionStatus(inspection.id, newStatus);
      setInspection(updated);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update inspection status.');
    }
  };

  const handleGeneratePDF = async () => {
    if (!inspection) return;
    setGeneratingReport(true);
    try {
      const rep = await ReportService.generateReport(inspection.dam_id, inspection.id);
      setReportUrl(`/api/v1/reports/download/${rep.id}`);
      await loadData();
      alert(`Report generated & Inspection status marked COMPLETED: ${rep.report_code}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Report generation failed.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const openGeorefModal = (media: DroneImage) => {
    setGeorefMedia(media);
    setGeoLat(media.latitude ? media.latitude.toString() : '');
    setGeoLng(media.longitude ? media.longitude.toString() : '');
    setGeoAlt(media.altitude ? media.altitude.toString() : '45.0');
  };

  const handleSaveGeoreference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!georefMedia) return;
    const lat = parseFloat(geoLat);
    const lng = parseFloat(geoLng);
    const alt = geoAlt ? parseFloat(geoAlt) : undefined;

    if (isNaN(lat) || lat < -90 || lat > 90) {
      alert('Latitude must be a valid number between -90 and 90');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      alert('Longitude must be a valid number between -180 and 180');
      return;
    }

    setSavingGeoref(true);
    try {
      await UploadService.georeferenceMedia(georefMedia.id, {
        latitude: lat,
        longitude: lng,
        altitude: alt
      });
      setGeorefMedia(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Georeferencing update failed.');
    } finally {
      setSavingGeoref(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-xs text-slate-500">Loading inspection workspace...</div>;
  if (!inspection) return <div className="text-center py-12 text-xs text-rose-600 font-bold">Inspection record not found.</div>;

  const canUpload = role === 'INSPECTION_ENGINEER' || role === 'DAM_OPERATOR';
  const canRunAI = role === 'INSPECTION_ENGINEER';
  const canGeoreference = role === 'INSPECTION_ENGINEER';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-govt-navy text-white p-5 rounded shadow border-b-2 border-amber-400 flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
        <div>
          <div className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
            INSPECTION WORKSPACE — {inspection.inspection_type}
          </div>
          <h1 className="text-xl font-bold tracking-tight mt-1">{inspection.inspection_code}</h1>
          <div className="text-xs text-slate-300 mt-1">
            Target Dam: <strong>{inspection.dam_name || 'Dam Facility'}</strong> — Weather: {inspection.weather_conditions}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 3D GLB Model Twin Button */}
          <Link
            to={`/digital-twin/${inspection.dam_id}`}
            className="bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs px-3 py-1.5 rounded transition flex items-center space-x-1 shadow-sm"
            title="Open interactive 3D GLB Dam Twin with mapped defect overlays"
          >
            <Box className="w-3.5 h-3.5 text-cyan-200" />
            <span>View 3D GLB Model</span>
          </Link>

          {/* Manual Status Selector Dropdown */}
          <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded border border-slate-600 text-xs">
            <span className="text-[11px] font-bold text-slate-300">Status:</span>
            <select
              value={
                inspection.status === 'COMPLETED' ? 'COMPLETED' :
                inspection.status === 'ENGINEER_REVIEW' ? 'ENGINEER_REVIEW' : 'AI_PROCESSING'
              }
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-slate-900 text-amber-300 font-bold px-2 py-1 rounded border border-slate-700 outline-none cursor-pointer text-xs"
            >
              <option value="AI_PROCESSING">⏳ On Progress</option>
              <option value="ENGINEER_REVIEW">🔍 Under Review</option>
              <option value="COMPLETED">✅ Completed</option>
            </select>
          </div>

          {/* Quick Mark as Completed button */}
          {inspection.status !== 'COMPLETED' && (
            <button
              onClick={() => handleStatusChange('COMPLETED')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded transition flex items-center space-x-1 shadow-sm"
              title="Manually mark inspection as COMPLETED"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Mark Completed</span>
            </button>
          )}

          {reportUrl ? (
            <a
              href={reportUrl}
              target="_blank"
              rel="noreferrer"
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-1.5 rounded transition flex items-center space-x-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Download PDF Report</span>
            </a>
          ) : (
            <button
              onClick={handleGeneratePDF}
              disabled={generatingReport}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-3.5 py-1.5 rounded transition flex items-center space-x-1 disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{generatingReport ? 'Generating Report...' : 'Generate PDF Report'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Operational Lifecycle Pipeline Indicator */}
      <div className="bg-white p-4 rounded border border-govt-border shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-govt-border pb-2.5">
          <div>
            <div className="text-xs font-bold text-govt-navy uppercase">Inspection Lifecycle State</div>
            <div className="text-[11px] text-slate-500">Manually select operational status or follow automated steps</div>
          </div>

          {/* 3 Main Quick Status Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStatusChange('AI_PROCESSING')}
              className={`px-3 py-1.5 rounded text-xs font-bold border transition-all cursor-pointer ${
                inspection.status === 'AI_PROCESSING' || inspection.status === 'DATA_UPLOADED'
                  ? 'bg-amber-400 text-govt-navy border-amber-500 shadow-md font-bold'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-amber-100'
              }`}
            >
              ⏳ On Progress
            </button>
            <button
              onClick={() => handleStatusChange('ENGINEER_REVIEW')}
              className={`px-3 py-1.5 rounded text-xs font-bold border transition-all cursor-pointer ${
                inspection.status === 'ENGINEER_REVIEW'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-md font-bold'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-blue-50'
              }`}
            >
              🔍 Under Review
            </button>
            <button
              onClick={() => handleStatusChange('COMPLETED')}
              className={`px-3 py-1.5 rounded text-xs font-bold border transition-all cursor-pointer ${
                inspection.status === 'COMPLETED'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-md font-bold'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-emerald-50'
              }`}
            >
              ✅ Completed
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs font-semibold overflow-x-auto gap-2 pt-1">
          {['PLANNED', 'DATA_UPLOADED', 'AI_PROCESSING', 'ENGINEER_REVIEW', 'COMPLETED'].map((st, idx) => (
            <button
              key={st}
              onClick={() => handleStatusChange(st)}
              title={`Switch state to ${idx + 1}. ${st}`}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded border transition-all cursor-pointer ${
                inspection.status === st
                  ? 'bg-amber-400 text-govt-navy border-amber-500 shadow-md font-bold scale-[1.02]'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
              }`}
            >
              <span>{idx + 1}. {st}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 1 & 2: Data Ingestion & Quality Validation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload Form */}
        <div className="bg-white p-5 rounded border border-govt-border shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-govt-navy uppercase tracking-wider flex items-center space-x-1.5 border-b border-govt-border pb-2">
            <Upload className="w-4 h-4 text-govt-blue" />
            <span>Step 1: Drone Dataset Upload</span>
          </h2>

          {canUpload ? (
            <form onSubmit={handleUploadFiles} className="space-y-3 text-xs">
              {uploadError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded text-xs space-y-1">
                  <div className="font-bold flex items-center space-x-1 text-rose-900">
                    <X className="w-4 h-4 text-rose-600 inline" />
                    <span>UPLOAD FAILED</span>
                  </div>
                  <div>Reason: {uploadError}</div>
                </div>
              )}

              <div className="border-2 border-dashed border-slate-300 rounded p-6 text-center hover:border-govt-blue transition bg-slate-50">
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.mp4"
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                  className="hidden"
                  id="drone-file-input"
                />
                <label htmlFor="drone-file-input" className="cursor-pointer space-y-1 block">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="font-bold text-govt-navy">Click to select drone imagery & video files</div>
                  <div className="text-[11px] text-slate-500">Supports JPG, PNG, MP4. File hashing & quality analysis automatically applied.</div>
                </label>
                {selectedFiles.length > 0 && (
                  <div className="mt-2 font-semibold text-emerald-800 text-xs">
                    {selectedFiles.length} file(s) selected for upload.
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={uploading || selectedFiles.length === 0}
                className="w-full py-2 bg-govt-navy hover:bg-govt-blue text-white font-bold rounded shadow-sm disabled:opacity-50"
              >
                {uploading ? 'Processing SHA-256 & Running Quality Engine...' : 'Upload & Validate Drone Dataset'}
              </button>
            </form>
          ) : (
            <div className="text-xs text-slate-500">Only authorized Engineers and Operators can upload drone datasets.</div>
          )}
        </div>

        {/* Quality Validation Summary Module */}
        <div className="bg-white p-5 rounded border border-govt-border shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-govt-navy uppercase tracking-wider flex items-center space-x-1.5 border-b border-govt-border pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-800" />
            <span>Step 2: Data Quality & SHA-256 Engine Summary</span>
          </h2>

          {!dataset ? (
            <div className="text-xs text-slate-500 py-6 text-center">
              No drone dataset uploaded for this inspection yet.
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-emerald-50 border border-emerald-200 p-2 rounded">
                  <div className="text-lg font-bold text-emerald-900">{dataset.valid_files}</div>
                  <div className="text-[10px] text-emerald-700 font-bold uppercase">Valid Media</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-2 rounded">
                  <div className="text-lg font-bold text-amber-900">{dataset.warning_files}</div>
                  <div className="text-[10px] text-amber-700 font-bold uppercase">Warnings / Dups</div>
                </div>
                <div className="bg-rose-50 border border-rose-200 p-2 rounded">
                  <div className="text-lg font-bold text-rose-900">{dataset.rejected_files}</div>
                  <div className="text-[10px] text-rose-700 font-bold uppercase">Rejected / Corrupt</div>
                </div>
              </div>

              {canRunAI && (
                <button
                  onClick={handleRunAIAnalysis}
                  disabled={analyzing || dataset.valid_files === 0}
                  className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded shadow-sm flex items-center justify-center space-x-1.5 disabled:opacity-50"
                >
                  <Cpu className="w-4 h-4" />
                  <span>{analyzing ? 'Running YOLO11 Defect Inference...' : 'Step 3: Run YOLO11 AI Defect Analysis'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Phase 2A: Detailed Media Quality & EXIF Georeferencing Table */}
      <div className="bg-white rounded border border-govt-border shadow-sm">
        <div className="px-4 py-3 border-b border-govt-border flex items-center justify-between bg-govt-light">
          <h2 className="text-xs font-bold text-govt-navy uppercase tracking-wider flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-govt-blue" />
            <span>Inspection Media Quality & GPS Inspector ({mediaItems.length} records)</span>
          </h2>
          <span className="text-[11px] text-slate-500">SHA-256 Hashed • OpenCV Blur/Brightness • EXIF GPS</span>
        </div>

        {mediaItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No media files available for this inspection. Upload drone images or videos to see quality metrics.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-govt-navy font-bold uppercase border-b border-govt-border">
                <tr>
                  <th className="p-3">Media File</th>
                  <th className="p-3">Type & Res</th>
                  <th className="p-3">SHA-256 Hash</th>
                  <th className="p-3">OpenCV Quality Scores</th>
                  <th className="p-3">Status & Issues</th>
                  <th className="p-3">GPS EXIF Status</th>
                  <th className="p-3 text-right">Georeference Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-govt-border">
                {mediaItems.map((m) => {
                  let parsedIssues: string[] = [];
                  if (m.quality_issues) {
                    try { parsedIssues = JSON.parse(m.quality_issues); } catch (e) { parsedIssues = [m.quality_issues]; }
                  }

                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-govt-navy">
                        <div>{m.filename}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{(m.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</div>
                      </td>
                      <td className="p-3 text-slate-700">
                        <span className="font-bold text-[10px] uppercase bg-slate-200 px-1.5 py-0.5 rounded mr-1">
                          {m.media_type || 'IMAGE'}
                        </span>
                        <span>{m.resolution_w || 0}x{m.resolution_h || 0}</span>
                        {m.media_type === 'VIDEO' && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            {m.duration_seconds}s @ {m.fps} FPS ({m.frame_count} frames)
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-[10px] text-slate-600">
                        {m.file_hash_sha256 ? `${m.file_hash_sha256.substring(0, 14)}...` : 'N/A'}
                      </td>
                      <td className="p-3 text-slate-700 space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-slate-500">Blur:</span>
                          <span className={`font-mono font-bold ${ (m.blur_score || 0) < 80 ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {m.blur_score || 0.0}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-slate-500">Luminance:</span>
                          <span className="font-mono font-bold text-slate-800">{m.brightness_score || 0.0}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          m.quality_status === 'VALID' ? 'bg-emerald-100 text-emerald-800' :
                          m.quality_status === 'WARNING' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {m.quality_status}
                        </span>
                        {parsedIssues.length > 0 && (
                          <div className="text-[10px] text-rose-700 font-semibold mt-1">
                            {parsedIssues.join(' • ')}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          m.gps_status === 'EXIF_EXTRACTED' ? 'bg-blue-100 text-blue-800' :
                          m.gps_status === 'MANUALLY_GEOREFERENCED' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {m.gps_status || 'UNAVAILABLE'}
                        </span>
                        {m.latitude != null && m.longitude != null ? (
                          <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                            {m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}
                          </div>
                        ) : (
                          <div className="text-[10px] text-amber-700 italic mt-0.5">GPS Missing</div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {canGeoreference ? (
                          <button
                            onClick={() => openGeorefModal(m)}
                            className="bg-govt-navy hover:bg-govt-blue text-white text-[11px] font-semibold px-2.5 py-1 rounded transition flex items-center space-x-1 ml-auto"
                          >
                            <MapPin className="w-3 h-3 text-amber-300" />
                            <span>Georeference</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Engineer Access Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Step 4: AI Defect Detection Engine & Human-in-the-Loop Verification Workspace */}
      <div className="space-y-4">
        <div className="bg-white px-4 py-3 rounded border border-govt-border flex items-center justify-between shadow-sm">
          <h2 className="text-xs font-bold text-govt-navy uppercase tracking-wider flex items-center space-x-1.5">
            <Cpu className="w-4 h-4 text-cyan-600" />
            <span>Step 4: AI Defect Detection Engine & Human Verification Workspace</span>
          </h2>
          <span className="text-[11px] text-slate-500 font-medium">
            Real YOLO11 Inference • Bounding Box Validation • Engineer HITL Sign-off
          </span>
        </div>

        <AIAnalysisWorkspace inspectionId={inspection.id} onDefectsUpdated={loadData} />
      </div>

      {/* Manual Georeferencing Modal */}
      {georefMedia && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-govt-border shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-govt-border pb-2">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-govt-navy text-sm">Manual Spatial Georeferencing</h3>
              </div>
              <button onClick={() => setGeorefMedia(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 bg-amber-50 p-2.5 rounded border border-amber-200">
              Target File: <strong>{georefMedia.filename}</strong>
              <div className="text-[10px] text-amber-800 mt-0.5">
                Current status: <strong>{georefMedia.gps_status}</strong>. Updating coordinates will log an official engineering audit record.
              </div>
            </div>

            <form onSubmit={handleSaveGeoreference} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Latitude (-90 to 90)</label>
                <input
                  type="number"
                  step="0.000001"
                  min="-90"
                  max="90"
                  required
                  value={geoLat}
                  onChange={(e) => setGeoLat(e.target.value)}
                  placeholder="e.g. 30.3751"
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-govt-blue outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Longitude (-180 to 180)</label>
                <input
                  type="number"
                  step="0.000001"
                  min="-180"
                  max="180"
                  required
                  value={geoLng}
                  onChange={(e) => setGeoLng(e.target.value)}
                  placeholder="e.g. 78.4852"
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-govt-blue outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Altitude (meters MSL)</label>
                <input
                  type="number"
                  step="0.1"
                  value={geoAlt}
                  onChange={(e) => setGeoAlt(e.target.value)}
                  placeholder="e.g. 265.5"
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-govt-blue outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-govt-border">
                <button
                  type="button"
                  onClick={() => setGeorefMedia(null)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGeoref}
                  className="px-4 py-1.5 bg-govt-navy hover:bg-govt-blue text-white rounded font-bold disabled:opacity-50"
                >
                  {savingGeoref ? 'Saving Coordinates...' : 'Save & Audit Georeference'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
