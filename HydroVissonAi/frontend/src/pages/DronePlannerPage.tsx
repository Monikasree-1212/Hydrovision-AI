import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { DroneFlightHUDModal } from '../components/drone/DroneFlightHUDModal';
import { Camera, Compass, CheckCircle2, AlertTriangle, ShieldCheck, Play, BatteryCharging, Radio, Eye } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const DronePlannerPage: React.FC = () => {
  const [altitude, setAltitude] = useState<number>(45);
  const [speed, setSpeed] = useState<number>(5);
  const [overlapFront, setOverlapFront] = useState<number>(80);
  const [overlapSide, setOverlapSide] = useState<number>(70);
  const [cameraPitch, setCameraPitch] = useState<number>(45);
  const [missionStatus, setMissionStatus] = useState<'IDLE' | 'VALIDATING' | 'READY'>('IDLE');
  const [isHUDOpen, setIsHUDOpen] = useState<boolean>(false);
  const { language } = useLanguage();

  const estimatedPhotos = Math.round((650 / (altitude * 0.4)) * (100 / (100 - overlapFront)));
  const estimatedFlightTimeMin = roundTwo((estimatedPhotos * 3) / 60 + 4);
  const requiredBatteryPct = Math.min(100, Math.round(estimatedFlightTimeMin * 4.2));

  function roundTwo(val: number) {
    return Math.round(val * 10) / 10;
  }

  const handleGeneratePlan = () => {
    setMissionStatus('VALIDATING');
    setTimeout(() => {
      setMissionStatus('READY');
    }, 800);
  };

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title={language === 'HI' ? 'एआई ड्रोन मिशन योजना एवं पूर्व-उड़ान सुरक्षा' : 'AI Drone Mission Flight Planner & Pre-Flight Safety'}
        description={language === 'HI' ? 'बाँध सतह सर्वेक्षण ड्रोन उड़ानों, वेपॉइंट कॉन्फ़िगरेशन, कैमरा जिम्बल ज्यामिति और मौसम सुरक्षा जांच के लिए इंटरैक्टिव मिशन प्लानर।' : 'Interactive mission planner for dam surface survey drone flights, waypoint configuration, camera gimbal geometry, and pre-flight weather safety checks.'}
        category={language === 'HI' ? 'मॉड्यूल 19 — ड्रोन मिशन योजना' : 'MODULE 19 — DRONE FLIGHT PLANNER'}
        breadcrumbs={[{ name: language === 'HI' ? 'डैशबोर्ड' : 'Dashboard', path: '/' }, { name: language === 'HI' ? 'उड़ान योजना' : 'Flight Planner' }]}
        actions={
          <button
            onClick={() => setIsHUDOpen(true)}
            className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold text-xs px-4 py-2 rounded transition shadow-lg flex items-center space-x-1.5 uppercase tracking-wider cursor-pointer"
          >
            <Radio className="w-4 h-4 text-slate-950 animate-pulse" />
            <span>{language === 'HI' ? 'लाइव ड्रोन उड़ान HUD सिमुलेटर लॉन्च करें' : 'LAUNCH LIVE DRONE FLIGHT HUD'}</span>
          </button>
        }
      />

      {/* Live HUD Modal Component */}
      <DroneFlightHUDModal
        isOpen={isHUDOpen}
        onClose={() => setIsHUDOpen(false)}
        altitudeMeters={altitude}
        speedMs={speed}
        cameraPitchDeg={cameraPitch}
        damName="BHAKRA NANGAL DAM"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Mission Controls */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-govt-border p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-govt-navy uppercase tracking-wider flex items-center gap-2 border-b border-govt-border pb-3">
            <Camera className="w-5 h-5 text-govt-blue" />
            <span>{language === 'HI' ? 'उड़ान पैरामीटर सेटिंग्स' : 'Mission Flight Parameters'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">{language === 'HI' ? 'लक्ष्य उड़ान ऊंचाई (AGL):' : 'Target Flight Altitude (AGL):'}</label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="20"
                  max="120"
                  value={altitude}
                  onChange={(e) => setAltitude(Number(e.target.value))}
                  className="w-full accent-govt-blue"
                />
                <span className="font-mono font-bold text-govt-navy min-w-[50px]">{altitude} m</span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">{language === 'HI' ? 'उड़ान गति (Speed):' : 'Flight Speed:'}</label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full accent-govt-blue"
                />
                <span className="font-mono font-bold text-govt-navy min-w-[50px]">{speed} m/s</span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">{language === 'HI' ? 'सामने की छवि ओवरलैप:' : 'Frontal Image Overlap:'}</label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="50"
                  max="90"
                  value={overlapFront}
                  onChange={(e) => setOverlapFront(Number(e.target.value))}
                  className="w-full accent-govt-blue"
                />
                <span className="font-mono font-bold text-govt-navy min-w-[50px]">{overlapFront}%</span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">{language === 'HI' ? 'साइड छवि ओवरलैप:' : 'Side Image Overlap:'}</label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="40"
                  max="85"
                  value={overlapSide}
                  onChange={(e) => setOverlapSide(Number(e.target.value))}
                  className="w-full accent-govt-blue"
                />
                <span className="font-mono font-bold text-govt-navy min-w-[50px]">{overlapSide}%</span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">{language === 'HI' ? 'कैमरा जिम्बल कोण (Pitch):' : 'Camera Gimbal Pitch Angle:'}</label>
              <select
                value={cameraPitch}
                onChange={(e) => setCameraPitch(Number(e.target.value))}
                className="w-full border border-govt-border rounded px-3 py-2 text-sm bg-white font-medium focus:border-govt-border outline-none"
              >
                <option value={45}>45° Oblique Surface Angle (Recommended for Dam Face)</option>
                <option value={90}>90° Nadir Vertical Down (Top View Crest Survey)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-govt-border flex flex-wrap items-center gap-3">
            <button
              onClick={handleGeneratePlan}
              className="bg-govt-navy hover:bg-govt-blue text-white font-bold px-6 py-2.5 rounded text-xs uppercase tracking-wider inline-flex items-center space-x-2 transition shadow-md"
            >
              <Play className="w-4 h-4 text-amber-400" />
              <span>{language === 'HI' ? 'उड़ान योजना बनाएं व सुरक्षा जांचें' : 'Generate Flight Plan & Validate Safety'}</span>
            </button>

            <button
              onClick={() => setIsHUDOpen(true)}
              className="bg-sky-800 hover:bg-sky-700 text-white font-bold px-6 py-2.5 rounded text-xs uppercase tracking-wider inline-flex items-center space-x-2 transition shadow-md"
            >
              <Eye className="w-4 h-4 text-sky-300" />
              <span>{language === 'HI' ? 'लाइव सिमुलेशन HUD देखें' : 'Simulate Live Autonomous Sortie HUD'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Calculations & Pre-Flight Safety */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-lg border border-slate-800 p-5 space-y-4 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Flight Estimates</span>
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Total Image Captures</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{estimatedPhotos} Photos</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Estimated Duration</span>
                <span className="font-mono font-bold text-blue-400 text-sm">{estimatedFlightTimeMin} Minutes</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400">Min. Battery Capacity</span>
                <span className="font-mono font-bold text-amber-400 text-sm flex items-center gap-1">
                  <BatteryCharging className="w-4 h-4" />
                  {requiredBatteryPct}%
                </span>
              </div>
            </div>
          </div>

          {/* Pre-Flight Checklist Card */}
          <div className="bg-white rounded-lg border border-govt-border p-5 space-y-3 shadow-sm text-xs">
            <h4 className="font-bold text-govt-navy uppercase tracking-wider flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Pre-Flight Weather Safety Checklist</span>
            </h4>
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                <span>Wind Speed (&lt; 25 km/h)</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 8.4 km/h (SAFE)
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                <span>Rain Forecast</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> CLEAR SKY
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                <span>GNSS Satellites Lock</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 18 SAT LOCKED
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
