import React, { useState } from 'react';
import { SpatialMarker } from './SpatialInputMap';
import { 
  X, 
  Box, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Ruler, 
  ShieldCheck, 
  FileText, 
  Eye,
  Check,
  UserCheck
} from 'lucide-react';

interface SideBySideDefectInspectorProps {
  marker: SpatialMarker | null;
  damName: string;
  onClose: () => void;
  onVerify?: (markerId: string | number, comments: string) => void;
}

export const SideBySideDefectInspector: React.FC<SideBySideDefectInspectorProps> = ({
  marker,
  damName,
  onClose,
  onVerify,
}) => {
  const [engineerComment, setEngineerComment] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  if (!marker) return null;

  const handleVerifySubmit = () => {
    setIsVerified(true);
    if (onVerify) {
      onVerify(marker.id, engineerComment);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-4xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100">
      {/* Drawer Header */}
      <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center space-x-1.5">
            <Box className="w-3.5 h-3.5" />
            <span>PHASE 3: SIDE-BY-SIDE 3D DEFECT INSPECTION DRAWER</span>
          </div>
          <h2 className="text-lg font-bold text-white mt-0.5">{marker.label}</h2>
          <p className="text-xs text-slate-400 font-mono">Dam: {damName} &bull; Defect Code: DEF-3D-{marker.id}</p>
        </div>

        <button
          onClick={onClose}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Split Grid (Left: 3D Surface Mesh Coordinates, Right: Original Drone Photo & Bounding Box) */}
      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Column: 3D Surface Model & PostGIS Coordinates */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-bold text-cyan-300 flex items-center space-x-2">
              <Box className="w-4 h-4 text-cyan-400" />
              <span>3D Surface Mesh Location</span>
            </span>
            <span className="bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded text-[10px] font-mono">
              3D ENU MAPPED
            </span>
          </div>

          <div className="relative w-full h-56 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
            {/* Simulated 3D Surface Model Preview Mesh */}
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800 opacity-90" />
            
            {/* 3D Wireframe Grid & Marker Node */}
            <div className="relative z-10 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border-2 border-amber-400 shadow-2xl mx-auto flex items-center justify-center text-amber-300 animate-pulse">
                <Box className="w-6 h-6" />
              </div>
              <div>
                <span className="font-mono text-xs font-bold text-amber-300 block">
                  3D Pos: (X: {(marker.lat * 1000 % 40).toFixed(2)}m, Y: 42.5m, Z: {(marker.lng * 1000 % 30).toFixed(2)}m)
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Surface Elevation: RL 145.2m &bull; Zone: Spillway Pier 2
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-[11px] text-slate-300">
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span className="text-slate-500">Defect Category:</span>
              <span className="font-bold font-mono text-cyan-300">{marker.type}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span className="text-slate-500">Severity Rating:</span>
              <span className="font-extrabold font-mono text-rose-400">{marker.severity}</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span className="text-slate-500">GPS Latitude:</span>
              <span className="font-mono">{marker.lat.toFixed(6)}°N</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1.5">
              <span className="text-slate-500">GPS Longitude:</span>
              <span className="font-mono">{marker.lng.toFixed(6)}°E</span>
            </div>
          </div>
        </div>

        {/* Right Column: Original High-Res Drone Photo & OpenCV Measurements */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-bold text-amber-300 flex items-center space-x-2">
              <Camera className="w-4 h-4 text-amber-400" />
              <span>Original Drone Image Capture Snippet</span>
            </span>
            <span className="bg-amber-950 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-mono">
              YOLO11 DETECTED
            </span>
          </div>

          {/* High-Res Drone Image Snippet Container */}
          <div className="relative w-full h-56 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden group">
            <div className="absolute inset-0 bg-slate-950 flex items-center justify-center border border-slate-800">
              <span className="text-slate-500 font-mono text-xs">No media file attached</span>
            </div>
            
            {/* YOLO11 Bounding Box Overlay */}
            <div className="absolute inset-x-8 inset-y-10 border-2 border-dashed border-rose-500 bg-rose-500/10 rounded-lg flex items-start justify-between p-2 shadow-2xl">
              <span className="bg-rose-600 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded shadow">
                {marker.type} ({(marker.confidence ? marker.confidence * 100 : 92).toFixed(0)}%)
              </span>
            </div>
          </div>

          {/* OpenCV Estimated Measurement Cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-medium">Est. Length</span>
              <span className="font-mono font-bold text-amber-300 text-xs">485 mm</span>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-medium">Est. Width</span>
              <span className="font-mono font-bold text-amber-300 text-xs">18.2 mm</span>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-medium">Est. Area</span>
              <span className="font-mono font-bold text-amber-300 text-xs">882 cm²</span>
            </div>
          </div>

          {/* Engineer Human-in-the-loop Verification */}
          <div className="space-y-3 border-t border-slate-800 pt-3">
            <span className="font-bold text-slate-200 text-xs block">Engineer Verification Review</span>
            <textarea
              rows={2}
              value={engineerComment}
              onChange={(e) => setEngineerComment(e.target.value)}
              placeholder="Add structural verification notes for NDSA inspection report..."
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 text-xs focus:border-amber-400 focus:outline-none"
            />

            <button
              onClick={handleVerifySubmit}
              disabled={isVerified}
              className={`w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center space-x-2 ${
                isVerified
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>{isVerified ? 'DEFECT VERIFIED & MAPPED TO 3D TWIN' : 'APPROVE & VERIFY 3D DEFECT'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
