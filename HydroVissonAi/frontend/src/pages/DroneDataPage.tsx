import React, { useEffect, useState } from 'react';
import { DroneImage, Inspection, Dam } from '../types';
import { UploadService, InspectionService, DamService } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { Camera, Upload, CheckCircle2, AlertCircle, FileVideo, FileImage, MapPin, RefreshCw, Eye } from 'lucide-react';

export const DroneDataPage: React.FC = () => {
  const [mediaList, setMediaList] = useState<DroneImage[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [dams, setDams] = useState<Dam[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedDamForUpload, setSelectedDamForUpload] = useState<number | ''>('');
  const { role } = useAuth();

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [damsData, inspsData] = await Promise.all([
        DamService.getDams(),
        InspectionService.getInspections()
      ]);
      setDams(damsData);
      setInspections(inspsData);

      let targetInspectionId = selectedInspection ? Number(selectedInspection) : (inspsData.length > 0 ? inspsData[0].id : null);

      if (targetInspectionId) {
        const media = await UploadService.getInspectionMedia(targetInspectionId);
        setMediaList(media);
      } else {
        setMediaList([]);
      }
    } catch (err) {
      console.error('Failed to load drone data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [selectedInspection]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    let targetInspId = selectedInspection ? Number(selectedInspection) : (inspections.length > 0 ? inspections[0].id : null);
    if (!targetInspId) {
      alert('Please select or create an inspection before uploading drone data.');
      return;
    }

    setUploading(true);
    try {
      await UploadService.uploadImage(targetInspId, uploadFile);
      setUploadFile(null);
      loadInitialData();
      alert('Drone media uploaded successfully.');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to upload media.');
    } finally {
      setUploading(false);
    }
  };

  const canUpload = role === 'INSPECTION_ENGINEER' || role === 'DAM_OPERATOR';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drone Data & Imagery Workspace"
        description="Central repository for drone aerial photography, thermal video streams, EXIF metadata extraction, and GPS spatial tagging."
        category="MODULE 04 — DRONE DATA"
        breadcrumbs={[{ name: 'Dashboard', path: '/' }, { name: 'Drone Data' }]}
        actions={
          <button
            onClick={loadInitialData}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Workspace</span>
          </button>
        }
      />

      {/* Filter & Upload Bar */}
      <div className="bg-white p-4 rounded-lg border border-govt-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Filter Inspection Cycle:</label>
          <select
            value={selectedInspection}
            onChange={(e) => setSelectedInspection(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2 border border-govt-border rounded-md text-sm outline-none focus:border-govt-blue bg-white min-w-[240px]"
          >
            <option value="">All Active Inspections</option>
            {inspections.map((insp) => (
              <option key={insp.id} value={insp.id}>
                {insp.inspection_code} — Dam #{insp.dam_id} ({new Date(insp.created_at).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        {canUpload && (
          <form onSubmit={handleUploadSubmit} className="flex items-center space-x-2 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
            <input
              type="file"
              accept="image/*,video/*"
              required
              onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
              className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-govt-blue file:text-white hover:file:bg-blue-900"
            />
            <button
              type="submit"
              disabled={uploading || !uploadFile}
              className="flex items-center space-x-1.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded transition shadow-sm whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? 'Uploading File...' : 'Upload Media'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Media Inventory List / Table */}
      {loading ? (
        <div className="text-center py-12 text-sm text-slate-500 font-medium">Loading drone imagery database...</div>
      ) : mediaList.length === 0 ? (
        <EmptyState
          title="No drone media records uploaded"
          description="No drone visual files, thermal feeds, or spatial datasets have been uploaded for this inspection cycle."
        />
      ) : (
        <div className="bg-white rounded-lg border border-govt-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-govt-border bg-slate-50 flex items-center justify-between">
            <h2 className="text-base font-bold text-govt-navy flex items-center space-x-2">
              <Camera className="w-4 h-4 text-govt-blue" />
              <span>Uploaded Drone Datasets & Media ({mediaList.length} Files)</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">Real Backend Upload Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-govt-navy font-bold uppercase text-xs border-b border-govt-border">
                <tr>
                  <th className="p-3.5">Filename</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Resolution</th>
                  <th className="p-3.5">Capture Time</th>
                  <th className="p-3.5">GPS Status</th>
                  <th className="p-3.5">Quality Assessment</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-govt-border text-sm">
                {mediaList.map((media) => (
                  <tr key={media.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-bold text-govt-navy flex items-center space-x-2">
                      {media.media_type === 'VIDEO' ? (
                        <FileVideo className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <FileImage className="w-4 h-4 text-govt-blue shrink-0" />
                      )}
                      <span className="truncate max-w-xs">{media.filename}</span>
                    </td>
                    <td className="p-3.5 text-slate-700 font-medium">{media.media_type}</td>
                    <td className="p-3.5 text-slate-600 font-mono text-xs">
                      {media.width && media.height ? `${media.width} x ${media.height}` : 'Extracting...'}
                    </td>
                    <td className="p-3.5 text-slate-600 text-xs">
                      {media.capture_time ? new Date(media.capture_time).toLocaleString() : 'N/A'}
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-bold border ${
                        media.gps_status === 'EXIF_EXTRACTED' || media.latitude ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        <MapPin className="w-3 h-3" />
                        <span>{media.latitude ? `${media.latitude.toFixed(4)}, ${media.longitude?.toFixed(4)}` : 'No GPS'}</span>
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-bold border ${
                        media.quality_status === 'VALID' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {media.quality_status === 'VALID' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        <span>{media.quality_status}</span>
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <a
                        href={media.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-govt-blue hover:text-blue-900 font-bold text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Media</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
