import React, { useState } from 'react';
import { DefectGeoJSONFeature } from '../../types';
import { GISService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  X, MapPin, Eye, ExternalLink, ShieldCheck, AlertCircle, 
  Calendar, CheckCircle, FileText, Compass, Edit3
} from 'lucide-react';

interface DefectDetailDrawerProps {
  feature: DefectGeoJSONFeature | null;
  onClose: () => void;
  onLocationUpdated?: () => void;
}

export const DefectDetailDrawer: React.FC<DefectDetailDrawerProps> = ({
  feature,
  onClose,
  onLocationUpdated,
}) => {
  const { role } = useAuth();
  const isEngineer = role === 'INSPECTION_ENGINEER';

  const [editingLoc, setEditingLoc] = useState(false);
  const [newLat, setNewLat] = useState<string>('');
  const [newLng, setNewLng] = useState<string>('');
  const [accuracy, setAccuracy] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (!feature) return null;

  const p = feature.properties;
  const geometry = feature.geometry;
  const hasCoords = geometry && geometry.coordinates && geometry.coordinates.length === 2;
  const lng = hasCoords ? geometry.coordinates[0] : p.longitude;
  const lat = hasCoords ? geometry.coordinates[1] : p.latitude;

  const handleStartEdit = () => {
    setNewLat(lat != null ? lat.toString() : '');
    setNewLng(lng != null ? lng.toString() : '');
    setAccuracy(p.coordinate_accuracy_meters ? p.coordinate_accuracy_meters.toString() : '');
    setReason('');
    setEditingLoc(true);
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEngineer) return;

    const parsedLat = parseFloat(newLat);
    const parsedLng = parseFloat(newLng);

    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      alert('Latitude must be a valid number between -90 and 90.');
      return;
    }

    if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      alert('Longitude must be a valid number between -180 and 180.');
      return;
    }

    setSubmitting(true);
    try {
      await GISService.updateDefectLocation(p.defect_id, {
        latitude: parsedLat,
        longitude: parsedLng,
        location_precision: 'MANUAL_GEOREFERENCE',
        coordinate_accuracy_meters: accuracy ? parseFloat(accuracy) : undefined,
        reason: reason || 'Manual GIS spatial update by engineer'
      });

      setEditingLoc(false);
      if (onLocationUpdated) onLocationUpdated();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update defect spatial location.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col text-slate-200 text-xs">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="font-bold text-white text-sm">{p.defect_code}</h3>
            <span className="text-[10px] text-slate-400 font-mono">Dam ID: #{p.dam_id} • {p.dam_name || 'Dam Facility'}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {/* Core Badges */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-medium">Defect Class</span>
            <span className="font-bold text-sm text-white">{p.defect_type}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-medium">Severity</span>
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-0.5 ${
              p.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-600' :
              p.severity === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-600' :
              'bg-blue-950 text-blue-300 border border-blue-600'
            }`}>
              {p.severity}
            </span>
          </div>
        </div>

        {/* Spatial Coordinates Panel */}
        <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white flex items-center space-x-1.5 text-xs">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Spatial Coordinates & Lineage</span>
            </h4>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
              p.location_source === 'MEDIA_GPS' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
              p.location_source === 'MANUAL' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
              'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {p.location_source}
            </span>
          </div>

          {lat != null && lng != null ? (
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-900 p-2.5 rounded font-mono text-slate-200">
                <div><span className="text-slate-500 block text-[10px]">Latitude (Y)</span> {lat.toFixed(6)}°</div>
                <div><span className="text-slate-500 block text-[10px]">Longitude (X)</span> {lng.toFixed(6)}°</div>
              </div>
              <div className="text-[11px] text-slate-400 space-y-1">
                <div><span className="text-slate-500">Precision Lineage:</span> <span className="text-slate-200 font-mono">{p.location_precision}</span></div>
                <div><span className="text-slate-500">Accuracy Estimate:</span> <span className="text-slate-200 font-mono">{p.coordinate_accuracy_meters ? `${p.coordinate_accuracy_meters}m` : 'Not available'}</span></div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded text-amber-200 text-xs space-y-1">
              <div className="font-bold text-amber-300 flex items-center space-x-1">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>LOCATION UNAVAILABLE</span>
              </div>
              <p className="text-[11px] text-amber-200/80">
                Source media for this defect has no GPS coordinates recorded. No fake map location has been invented.
              </p>
            </div>
          )}

          {/* Location Modification Button for Engineer */}
          {isEngineer && !editingLoc && (
            <button
              onClick={handleStartEdit}
              className="w-full mt-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all border border-slate-700"
            >
              <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lat != null ? 'Update Manual Spatial Location' : 'Add Manual Georeference Coordinates'}</span>
            </button>
          )}

          {/* Manual Georeference Form */}
          {editingLoc && (
            <form onSubmit={handleSaveLocation} className="space-y-3 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 text-[11px]">Latitude (-90 to 90)</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    placeholder="e.g. 11.7865"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded p-1.5 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 text-[11px]">Longitude (-180 to 180)</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={newLng}
                    onChange={(e) => setNewLng(e.target.value)}
                    placeholder="e.g. 77.8005"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded p-1.5 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">Accuracy Estimate (meters)</label>
                <input
                  type="number"
                  step="0.1"
                  value={accuracy}
                  onChange={(e) => setAccuracy(e.target.value)}
                  placeholder="e.g. 0.5"
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded p-1.5 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">Audit Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for coordinate adjustment..."
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded p-1.5 text-xs"
                />
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingLoc(false)}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold text-xs shadow"
                >
                  {submitting ? 'Saving...' : 'Save & Audit'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Technical AI & Verification Metadata */}
        <div className="space-y-2 bg-slate-950/60 p-4 rounded-lg border border-slate-800 text-xs">
          <h4 className="font-bold text-white border-b border-slate-800 pb-2">AI Detection & Sign-off Details</h4>
          <div className="space-y-1.5 text-slate-300 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">AI Detection Confidence:</span>
              <span className="font-mono text-cyan-400 font-bold">{(p.confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Inspection Code:</span>
              <span className="font-mono text-slate-200">{p.inspection_code || `INSP-${p.inspection_id}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Source Detection ID:</span>
              <span className="font-mono text-slate-200">#{p.source_detection_id || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Created At:</span>
              <span className="font-mono text-slate-200">{new Date(p.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {p.engineer_comments && (
            <div className="mt-3 pt-2 border-t border-slate-800 text-slate-300 text-[11px]">
              <span className="text-slate-500 block font-semibold mb-1">Engineer Comments:</span>
              <p className="bg-slate-900 p-2 rounded text-slate-300 italic">{p.engineer_comments}</p>
            </div>
          )}
        </div>

        {/* Source Image Traceability Action Button */}
        {p.image_url && (
          <div className="pt-2 space-y-2">
            <button
              onClick={() => setPreviewImage(p.image_url || null)}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-bold uppercase tracking-wider text-xs shadow-lg shadow-cyan-600/20 flex items-center justify-center space-x-2 transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>VIEW SOURCE IMAGE</span>
            </button>
          </div>
        )}
      </div>

      {/* Source Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 max-w-3xl w-full max-h-[90vh] flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-xs">Source Drone Inspection Image — {p.defect_code}</span>
              <button onClick={() => setPreviewImage(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex items-center justify-center bg-black/60 rounded p-2">
              <img
                src={previewImage}
                alt="Source Drone Imagery"
                className="max-h-[70vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
