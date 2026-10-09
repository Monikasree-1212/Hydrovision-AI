import React, { useState, useEffect } from 'react';
import { 
  X, Play, Pause, RotateCcw, Camera, ShieldAlert, 
  BatteryCharging, Radio, Compass, Cpu, Layers, Eye, Crosshair, CheckCircle2 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface DroneFlightHUDModalProps {
  isOpen: boolean;
  onClose: () => void;
  altitudeMeters?: number;
  speedMs?: number;
  cameraPitchDeg?: number;
  damName?: string;
}

export const DroneFlightHUDModal: React.FC<DroneFlightHUDModalProps> = ({
  isOpen,
  onClose,
  altitudeMeters = 45,
  speedMs = 5,
  cameraPitchDeg = 45,
  damName = 'BHAKRA NANGAL DAM'
}) => {
  const { language } = useLanguage();
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(18);
  const [cameraMode, setCameraMode] = useState<'RGB' | 'THERMAL'>('RGB');
  const [battery, setBattery] = useState<number>(94);
  const [capturedDefects, setCapturedDefects] = useState<any[]>([]);

  // Telemetry state variables
  const [currentAlt, setCurrentAlt] = useState(altitudeMeters);
  const [currentSpeed, setCurrentSpeed] = useState(speedMs);

  useEffect(() => {
    let interval: any;
    if (isOpen && isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 1;
        });

        // Slight realistic telemetry fluctuations
        setCurrentAlt(altitudeMeters + (Math.random() * 0.8 - 0.4));
        setCurrentSpeed(speedMs + (Math.random() * 0.4 - 0.2));
        setBattery((prev) => Math.max(10, Math.round((prev - 0.05) * 10) / 10));

        // Trigger AI defect detection simulation at specific progress intervals
        if (progress === 30 && capturedDefects.length === 0) {
          setCapturedDefects(prev => [...prev, {
            id: 1,
            type: language === 'HI' ? 'कंक्रीट क्षरण (Spalling)' : 'Concrete Spalling',
            severity: 'HIGH',
            confidence: 98.4,
            coords: '31.4112° N, 76.4352° E'
          }]);
        }
        if (progress === 65 && capturedDefects.length === 1) {
          setCapturedDefects(prev => [...prev, {
            id: 2,
            type: language === 'HI' ? 'संरचनात्मक दरार (Structural Crack)' : 'Structural Crack',
            severity: 'CRITICAL',
            confidence: 96.1,
            coords: '31.4118° N, 76.4359° E'
          }]);
        }
      }, 300);
    }
    return () => clearInterval(interval);
  }, [isOpen, isPlaying, progress, altitudeMeters, speedMs, capturedDefects.length, language]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 selection:bg-amber-500 font-sans">
      <div className="relative w-full max-w-5xl bg-slate-900 border-2 border-sky-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Top HUD Header */}
        <div className="bg-slate-950 px-5 py-3 border-b border-sky-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-sky-500/20 border border-sky-400/50">
              <Compass className="w-4 h-4 text-sky-400 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                <span>{language === 'HI' ? 'ड्रोन लाइव स्वायत्त निरीक्षण उड़ान' : 'AUTONOMOUS DRONE LIVE INSPECTION FLIGHT'}</span>
                <span className="bg-rose-900/80 text-rose-200 text-[10px] px-2 py-0.2 rounded border border-rose-600 animate-pulse font-mono">
                  ● LIVE TELEMETRY
                </span>
              </div>
              <div className="text-sm font-extrabold text-white">
                {damName} • {language === 'HI' ? 'प्राथमिक स्पिलवे व ब्लॉक-04 स्कैन' : 'Primary Spillway & Crest Section Block-04'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 text-xs font-mono">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-bold">18 SAT LOCKED</span>
            </div>

            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Camera HUD Viewport */}
        <div className="relative flex-grow bg-slate-950 min-h-[380px] overflow-hidden flex items-center justify-center">
          
          {/* Simulated Dam Visual Background / Thermal Layer */}
          <div 
            className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ${
              cameraMode === 'THERMAL' ? 'hue-rotate-180 contrast-200 invert-[0.3]' : ''
            }`}
            style={{ 
              backgroundImage: `url('/assets/dam_bg.jpg')`,
              transform: `scale(${1 + progress * 0.002}) translateY(${progress * 0.3}px)`
            }}
          >
            {/* Grid Crosshair & Scan Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/60" />
          </div>

          {/* Central Target Reticle */}
          <div className="relative z-20 pointer-events-none flex flex-col items-center justify-center">
            <div className="relative w-36 h-36 border-2 border-sky-400/40 rounded-full flex items-center justify-center animate-pulse">
              <Crosshair className="w-12 h-12 text-sky-400/80" />
              <div className="absolute top-0 w-3 h-0.5 bg-amber-400" />
              <div className="absolute bottom-0 w-3 h-0.5 bg-amber-400" />
              <div className="absolute left-0 h-3 w-0.5 bg-amber-400" />
              <div className="absolute right-0 h-3 w-0.5 bg-amber-400" />
            </div>
            <div className="mt-2 bg-slate-950/80 text-sky-300 font-mono text-[11px] px-2 py-0.5 rounded border border-sky-500/30">
              GIMBAL PITCH: {cameraPitchDeg}° | SWEEP VELOCITY: {currentSpeed.toFixed(1)} m/s
            </div>
          </div>

          {/* AI Bounding Boxes Simulation */}
          {progress >= 28 && (
            <div className="absolute top-1/3 left-1/3 z-30 animate-bounce duration-1000">
              <div className="border-2 border-rose-500 bg-rose-500/20 p-3 rounded shadow-lg backdrop-blur-sm text-xs font-mono">
                <div className="bg-rose-600 text-white font-bold px-2 py-0.5 rounded text-[10px] uppercase flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  YOLO11: {language === 'HI' ? 'कंक्रीट क्षरण (98.4%)' : 'SPALLING (98.4%)'}
                </div>
                <div className="text-[10px] text-rose-200 mt-1 font-sans">
                  Depth: 4.2 cm • Area: 0.18 m²
                </div>
              </div>
            </div>
          )}

          {progress >= 60 && (
            <div className="absolute bottom-1/3 right-1/3 z-30 animate-pulse">
              <div className="border-2 border-amber-400 bg-amber-500/20 p-3 rounded shadow-lg backdrop-blur-sm text-xs font-mono">
                <div className="bg-amber-600 text-white font-bold px-2 py-0.5 rounded text-[10px] uppercase flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  YOLO11: {language === 'HI' ? 'दरार (96.1%)' : 'STRUCTURAL CRACK (96.1%)'}
                </div>
                <div className="text-[10px] text-amber-200 mt-1 font-sans">
                  Width: 3.1 mm • Length: 1.4 m
                </div>
              </div>
            </div>
          )}

          {/* Left HUD Telemetry Column */}
          <div className="absolute top-4 left-4 z-20 bg-slate-950/85 backdrop-blur-md p-3.5 rounded-xl border border-sky-500/30 text-xs font-mono space-y-2 text-slate-200 w-44">
            <div className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-1">
              {language === 'HI' ? 'उड़ान टेलीमेट्री' : 'FLIGHT TELEMETRY'}
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ALT (AGL):</span>
              <span className="font-bold text-sky-400">{currentAlt.toFixed(1)} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">SPEED:</span>
              <span className="font-bold text-sky-400">{currentSpeed.toFixed(1)} m/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">BATTERY:</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <BatteryCharging className="w-3 h-3" />
                {battery}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">PITCH:</span>
              <span className="font-bold text-amber-400">{cameraPitchDeg}°</span>
            </div>
          </div>

          {/* Right HUD Controls & Sensor Switcher */}
          <div className="absolute top-4 right-4 z-20 flex flex-col space-y-2">
            <div className="bg-slate-950/85 backdrop-blur-md p-1.5 rounded-xl border border-sky-500/30 flex flex-col space-y-1 text-xs">
              <button
                onClick={() => setCameraMode('RGB')}
                className={`px-3 py-1.5 rounded-lg font-bold transition text-left flex items-center gap-2 ${
                  cameraMode === 'RGB' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-sky-300" />
                <span>RGB Optical</span>
              </button>

              <button
                onClick={() => setCameraMode('THERMAL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition text-left flex items-center gap-2 ${
                  cameraMode === 'THERMAL' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-300" />
                <span>FLIR Thermal</span>
              </button>
            </div>
          </div>

          {/* Bottom Telemetry Bar */}
          <div className="absolute bottom-4 left-4 right-4 z-20 bg-slate-950/85 backdrop-blur-md p-3 rounded-xl border border-sky-500/30 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-3 w-2/3">
              <span className="font-mono text-slate-400 text-[11px] whitespace-nowrap">
                {language === 'HI' ? 'स्कैन प्रगति:' : 'SCAN PROGRESS:'}
              </span>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
                <div 
                  className="bg-gradient-to-r from-sky-500 via-amber-400 to-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="font-mono font-bold text-sky-400 text-xs">{progress}%</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition font-bold text-xs flex items-center gap-1"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { setProgress(0); setIsPlaying(true); setCapturedDefects([]); }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
                title="Restart Flight Simulation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Captured Defect Log Bar */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'HI' ? 'लाइव एआई द्वारा पहचाने गए दोष' : 'REAL-TIME AI DEFECT DETECTION STREAM'}</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {capturedDefects.length} {language === 'HI' ? 'दोष प्राप्त हुए' : 'Defects Flagged'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {capturedDefects.length === 0 ? (
              <div className="text-slate-500 text-[11px] py-1 font-mono italic">
                {language === 'HI' ? 'उड़ान जारी है... एआई विसंगतियों का विश्लेषण कर रहा है।' : 'Flight scanning in progress... AI analyzing surface for structural anomalies.'}
              </div>
            ) : (
              capturedDefects.map((def) => (
                <div key={def.id} className="bg-slate-900 border border-slate-800 p-2 rounded flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${def.severity === 'CRITICAL' ? 'bg-rose-500 animate-ping' : 'bg-amber-400'}`} />
                    <span className="font-bold text-white text-xs">{def.type}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({def.confidence}%)</span>
                  </div>
                  <span className="text-[10px] text-sky-400 font-mono">{def.coords}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
