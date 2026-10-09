import React, { useEffect, useState } from 'react';
import { Sparkles, Box, CheckCircle2, Cpu, RefreshCw, ArrowRight } from 'lucide-react';

interface PhotogrammetryReconstructionModalProps {
  isOpen: boolean;
  photoCount: number;
  damName: string;
  onComplete: () => void;
  onClose: () => void;
}

export const PhotogrammetryReconstructionModal: React.FC<PhotogrammetryReconstructionModalProps> = ({
  isOpen,
  photoCount,
  damName,
  onComplete,
  onClose,
}) => {
  const [stage, setStage] = useState<number>(1);
  const [progress, setProgress] = useState<number>(10);

  useEffect(() => {
    if (!isOpen) {
      setStage(1);
      setProgress(10);
      return;
    }

    // Stage 1: Camera Alignment
    const t1 = setTimeout(() => {
      setProgress(35);
      setStage(1);
    }, 600);

    // Stage 2: Point Cloud & GLB Mesh Generation
    const t2 = setTimeout(() => {
      setProgress(70);
      setStage(2);
    }, 1400);

    // Stage 3: Defect Surface Projection
    const t3 = setTimeout(() => {
      setProgress(100);
      setStage(3);
    }, 2400);

    // Completion Trigger
    const t4 = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-6 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2 text-amber-300 font-bold text-base">
            <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
            <span>Phase 2: Photogrammetry 3D Reconstruction</span>
          </div>
          <span className="bg-amber-950 border border-amber-500/40 text-amber-300 font-mono text-xs px-2.5 py-1 rounded-full font-bold">
            {photoCount} Drones Captured
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Generating Real 3D Digital Twin</h3>
          <p className="text-xs text-slate-400">
            Reconstructing photorealistic 3D point cloud & textured mesh for <strong>{damName}</strong> from {photoCount} overlapping aerial drone captures.
          </p>
        </div>

        {/* Multi-Stage Progress Steps */}
        <div className="space-y-3 text-xs">
          {/* Stage 1 */}
          <div className={`p-3 rounded-xl border transition flex items-center justify-between ${
            stage === 1 ? 'bg-amber-950/40 border-amber-400 text-amber-200' : stage > 1 ? 'bg-slate-950 border-emerald-500/40 text-emerald-300' : 'bg-slate-950/50 border-slate-800 text-slate-500'
          }`}>
            <div className="flex items-center space-x-3">
              <Cpu className={`w-4 h-4 ${stage === 1 ? 'animate-spin text-amber-400' : stage > 1 ? 'text-emerald-400' : ''}`} />
              <span>1. Camera Pose Calibration & EXIF Feature Matching</span>
            </div>
            {stage > 1 && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>

          {/* Stage 2 */}
          <div className={`p-3 rounded-xl border transition flex items-center justify-between ${
            stage === 2 ? 'bg-amber-950/40 border-amber-400 text-amber-200' : stage > 2 ? 'bg-slate-950 border-emerald-500/40 text-emerald-300' : 'bg-slate-950/50 border-slate-800 text-slate-500'
          }`}>
            <div className="flex items-center space-x-3">
              <Box className={`w-4 h-4 ${stage === 2 ? 'animate-bounce text-amber-400' : stage > 2 ? 'text-emerald-400' : ''}`} />
              <span>2. High-Density 3D Point Cloud & GLB Mesh Generation</span>
            </div>
            {stage > 2 && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>

          {/* Stage 3 */}
          <div className={`p-3 rounded-xl border transition flex items-center justify-between ${
            stage === 3 ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200' : 'bg-slate-950/50 border-slate-800 text-slate-500'
          }`}>
            <div className="flex items-center space-x-3">
              <Sparkles className={`w-4 h-4 ${stage === 3 ? 'animate-pulse text-emerald-400' : ''}`} />
              <span>3. YOLO11 Defect Surface Mapping & 3D PostGIS Anchoring</span>
            </div>
            {stage === 3 && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-amber-300 font-mono font-bold">
            <span>Reconstruction Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
