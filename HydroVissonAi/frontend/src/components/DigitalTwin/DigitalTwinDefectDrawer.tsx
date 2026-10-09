import React, { useState } from 'react';
import { X, ExternalLink, MapPin, Eye, CheckCircle2, ShieldAlert, Cpu, Calendar, Tag, FileText } from 'lucide-react';
import { DigitalTwinDefectOverlay } from '../../types';

interface DigitalTwinDefectDrawerProps {
  defect: DigitalTwinDefectOverlay | null;
  onClose: () => void;
  damId: number;
}

export const DigitalTwinDefectDrawer: React.FC<DigitalTwinDefectDrawerProps> = ({
  defect,
  onClose,
  damId,
}) => {
  const [showImageModal, setShowImageModal] = useState<boolean>(false);

  if (!defect) return null;

  const severityColor =
    defect.severity === 'CRITICAL'
      ? 'bg-rose-950 text-rose-300 border-rose-800'
      : defect.severity === 'HIGH'
      ? 'bg-amber-950 text-amber-300 border-amber-800'
      : defect.severity === 'MEDIUM'
      ? 'bg-blue-950 text-blue-300 border-blue-800'
      : 'bg-emerald-950 text-emerald-300 border-emerald-800';

  const precisionBadge =
    defect.location_precision === 'MEDIA_REFERENCE'
      ? 'bg-amber-950 text-amber-400 border-amber-800'
      : defect.location_precision === 'MANUAL_GEOREFERENCE'
      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
      : defect.location_precision === 'PRECISE_SURVEY'
      ? 'bg-blue-950 text-blue-400 border-blue-800'
      : 'bg-slate-800 text-slate-400 border-slate-700';

  const activeImageUrl = defect.annotated_image_url || defect.source_image_url;

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-slate-100 text-base font-mono">{defect.defect_code}</h3>
              <p className="text-xs text-slate-400">Verified 3D Spatial Defect Detail</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Status & Severity */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-lg border flex flex-col gap-1 ${severityColor}`}>
              <span className="text-[10px] uppercase font-semibold opacity-75">Severity Level</span>
              <span className="font-bold text-sm">{defect.severity}</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-800 bg-slate-950 flex flex-col gap-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Verification Status</span>
              <span className="font-bold text-sm text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {defect.status}
              </span>
            </div>
          </div>

          {/* AI Confidence Notice */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-2 font-medium">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span>AI Detection Confidence</span>
              </div>
              <span className="font-mono text-sm font-bold text-purple-300">
                {(defect.ai_detection_confidence * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              Notice: AI Detection Confidence reflects raw YOLO model inference score prior to engineer validation.
            </p>
          </div>

          {/* Defect Details List */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg divide-y divide-slate-800">
            <div className="p-3 flex justify-between">
              <span className="text-slate-400">Defect Type</span>
              <span className="font-semibold text-slate-200">{defect.defect_type}</span>
            </div>

            <div className="p-3 flex justify-between">
              <span className="text-slate-400">Inspection Code</span>
              <span className="font-mono text-slate-200">{defect.inspection_code || `#${defect.inspection_id}`}</span>
            </div>

            <div className="p-3 flex justify-between">
              <span className="text-slate-400">Inspection Date</span>
              <span className="text-slate-200">
                {defect.inspection_date
                  ? new Date(defect.inspection_date).toLocaleDateString()
                  : 'N/A'}
              </span>
            </div>

            {defect.verified_by_name && (
              <div className="p-3 flex justify-between">
                <span className="text-slate-400">Verified By</span>
                <span className="text-slate-200 font-medium">{defect.verified_by_name}</span>
              </div>
            )}
          </div>

          {/* Location & Coordinates */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <MapPin className="w-4 h-4 text-rose-400" />
                <span>Spatial Coordinates</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono border font-semibold ${precisionBadge}`}>
                {defect.location_precision}
              </span>
            </div>

            {defect.position_available ? (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-slate-900 p-2.5 rounded font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[9px]">LATITUDE</span>
                    <span className="text-slate-200">{defect.latitude?.toFixed(6)}°</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">LONGITUDE</span>
                    <span className="text-slate-200">{defect.longitude?.toFixed(6)}°</span>
                  </div>
                </div>

                <div className="bg-slate-900 p-2.5 rounded font-mono text-[11px]">
                  <span className="text-slate-400 block text-[9px] mb-1">3D ENU POSITION (X, Y, Z meters)</span>
                  <div className="grid grid-cols-3 gap-1 text-blue-300 font-bold">
                    <span>X: {defect.position_3d.x}m</span>
                    <span>Y: {defect.position_3d.y}m</span>
                    <span>Z: {defect.position_3d.z}m</span>
                  </div>
                </div>

                {defect.location_precision === 'MEDIA_REFERENCE' && (
                  <div className="p-2.5 rounded bg-amber-950/40 border border-amber-900 text-[10px] text-amber-300 leading-normal">
                    <strong>Reference Position Notice:</strong> Coordinates inherited from drone camera reference frame. Does not assert millimeter surface survey precision.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-900 rounded text-center text-slate-400 text-xs italic">
                Verified defect location unavailable for 3D spatial overlay.
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 grid grid-cols-2 gap-3">
          {activeImageUrl ? (
            <button
              onClick={() => setShowImageModal(true)}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>View Source Image</span>
            </button>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 text-slate-500 font-medium text-xs cursor-not-allowed"
            >
              <span>Image Unavailable</span>
            </button>
          )}

          <a
            href={`/gis?damId=${damId}&defectId=${defect.defect_id}`}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-emerald-400" />
            <span>Open in GIS</span>
          </a>
        </div>
      </div>

      {/* Source Image Viewer Modal */}
      {showImageModal && activeImageUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h4 className="font-bold text-slate-100 font-mono text-sm">
                Traceable Drone Source Image — {defect.defect_code}
              </h4>
              <button
                onClick={() => setShowImageModal(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-black overflow-auto flex items-center justify-center p-4">
              <img
                src={activeImageUrl}
                alt={`Defect ${defect.defect_code}`}
                className="max-h-[70vh] object-contain rounded border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
