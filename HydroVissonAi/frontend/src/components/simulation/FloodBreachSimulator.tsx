import React, { useState } from 'react';
import { 
  Compass, AlertTriangle, ShieldAlert, Activity, Droplets, 
  Send, Users, Clock, ArrowDownRight, Radio, CheckCircle2 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface DamBreachData {
  damName: string;
  maxCapacityMcm: number;
  fullReservoirLevelM: number;
  currentLevelM: number;
  maxSpillwayCapacityCusecs: number;
  downstreamVillages: number;
  downstreamPopulation: number;
}

interface FloodBreachSimulatorProps {
  damData?: DamBreachData;
  onDispatchEAP?: (level: string, reason: string) => void;
}

export const FloodBreachSimulator: React.FC<FloodBreachSimulatorProps> = ({
  damData = {
    damName: 'BHAKRA NANGAL DAM',
    maxCapacityMcm: 9621,
    fullReservoirLevelM: 515.0,
    currentLevelM: 508.4,
    maxSpillwayCapacityCusecs: 140000,
    downstreamVillages: 42,
    downstreamPopulation: 185000
  },
  onDispatchEAP
}) => {
  const { language } = useLanguage();
  const [inflowCusecs, setInflowCusecs] = useState<number>(45000);
  const [openGates, setOpenGates] = useState<number>(4);
  const [breachScenario, setBreachScenario] = useState<boolean>(false);

  // Hydraulic Calculations
  const gateDischargeRatePerGate = damData.maxSpillwayCapacityCusecs / 12;
  const totalOutflowCusecs = Math.round(openGates * gateDischargeRatePerGate);
  const netInflowCusecs = inflowCusecs - totalOutflowCusecs;

  // Reservoir Level Surge calculation (m/hour)
  const reservoirSurgeRateMph = Math.max(0, (netInflowCusecs / 10000) * 0.15);
  const projectedLevelIn12h = Math.min(
    damData.fullReservoirLevelM + 5,
    Math.round((damData.currentLevelM + reservoirSurgeRateMph * 12) * 10) / 10
  );

  // Risk Classification
  let riskStatus: 'NORMAL' | 'WATCH' | 'WARNING' | 'CRITICAL_BREACH' = 'NORMAL';
  if (breachScenario || projectedLevelIn12h >= damData.fullReservoirLevelM + 1.5) {
    riskStatus = 'CRITICAL_BREACH';
  } else if (projectedLevelIn12h >= damData.fullReservoirLevelM) {
    riskStatus = 'WARNING';
  } else if (inflowCusecs > 35000) {
    riskStatus = 'WATCH';
  }

  // Downstream Impact
  const floodWaveVelocityKmh = breachScenario ? 32 : (totalOutflowCusecs / 5000) * 2.2;
  const floodArrivalTimeHours = Math.max(0.4, Math.round((28 / Math.max(5, floodWaveVelocityKmh)) * 10) / 10);
  const affectedPeopleCount = breachScenario 
    ? damData.downstreamPopulation 
    : Math.round(damData.downstreamPopulation * (totalOutflowCusecs / damData.maxSpillwayCapacityCusecs));

  const getRiskBadgeStyle = () => {
    switch (riskStatus) {
      case 'CRITICAL_BREACH':
        return 'bg-rose-950 text-rose-200 border-rose-600 animate-pulse';
      case 'WARNING':
        return 'bg-amber-950 text-amber-200 border-amber-600';
      case 'WATCH':
        return 'bg-yellow-950 text-yellow-200 border-yellow-600';
      default:
        return 'bg-emerald-950 text-emerald-200 border-emerald-600';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl text-white space-y-6 font-sans selection:bg-amber-500">
      
      {/* Simulator Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-600/20 border border-blue-500/40 rounded-lg text-blue-400">
            <Droplets className="w-6 h-6 text-blue-400 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
              <span>{language === 'HI' ? 'हाइड्रोलिक मानसून सिमुलेशन इंजन' : 'HYDRAULIC MONSOON DISCHARGE & BREACH SIMULATION ENGINE'}</span>
            </div>
            <h2 className="text-lg font-extrabold text-white">
              {damData.damName} • {language === 'HI' ? 'जलाशय प्रवाह व डाउनस्ट्रीम बाढ़ सिमुलेटर' : 'Reservoir Hydro-Dynamics & Downstream Flood Wave Simulator'}
            </h2>
          </div>
        </div>

        <div className={`px-4 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-2 ${getRiskBadgeStyle()}`}>
          <Radio className="w-4 h-4 animate-ping" />
          <span>
            {riskStatus === 'CRITICAL_BREACH' && (language === 'HI' ? 'गंभीर दरार व अतिप्रवाह खतरा' : 'CRITICAL BREACH / OVERTOPPING RISK')}
            {riskStatus === 'WARNING' && (language === 'HI' ? 'चेतावनी: पूर्ण जलाशय स्तर पार' : 'WARNING: RESERVOIR LEVEL EXCEEDED')}
            {riskStatus === 'WATCH' && (language === 'HI' ? 'निगरानी: उच्च मानसून प्रवाह' : 'WATCH: HIGH MONSOON INFLOW')}
            {riskStatus === 'NORMAL' && (language === 'HI' ? 'सामान्य परिचालन जल स्तर' : 'NORMAL OPERATIONAL LEVEL')}
          </span>
        </div>
      </div>

      {/* Simulator Interactive Control Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950 p-5 rounded-xl border border-slate-800/80">
        
        {/* Slider 1: Inflow Discharge */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-300">{language === 'HI' ? 'मानसून जलाशय में प्रवाह (Inflow):' : 'Monsoon Reservoir Inflow Rate:'}</span>
            <span className="font-mono text-blue-400 font-bold text-sm">{inflowCusecs.toLocaleString()} cusecs</span>
          </div>
          <input
            type="range"
            min="5000"
            max="120000"
            step="2500"
            value={inflowCusecs}
            onChange={(e) => setInflowCusecs(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="text-[10px] text-slate-500 font-mono flex justify-between">
            <span>5,000 (Normal)</span>
            <span>60,000 (Monsoon Peak)</span>
            <span>120,000 (Flash Flood)</span>
          </div>
        </div>

        {/* Slider 2: Open Radial Spillway Gates */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-300">{language === 'HI' ? 'स्पिलवे गेट्स खुले (Radial Gates):' : 'Open Spillway Gates (0-12):'}</span>
            <span className="font-mono text-amber-400 font-bold text-sm">{openGates} / 12 Gates</span>
          </div>
          <input
            type="range"
            min="0"
            max="12"
            step="1"
            value={openGates}
            onChange={(e) => setOpenGates(Number(e.target.value))}
            className="w-full accent-amber-500"
          />
          <div className="text-[10px] text-slate-500 font-mono flex justify-between">
            <span>0 Gates (Closed)</span>
            <span>6 Gates</span>
            <span>12 Gates (Fully Open)</span>
          </div>
        </div>

        {/* Toggle 3: Dam Structural Breach Override */}
        <div className="space-y-2 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-300">{language === 'HI' ? 'आपातकालीन दरार सिमुलेशन:' : 'Simulate Dam Structural Breach:'}</span>
          <button
            onClick={() => setBreachScenario(!breachScenario)}
            className={`w-full py-2.5 px-3 rounded-lg font-mono text-xs font-bold transition flex items-center justify-center gap-2 ${
              breachScenario 
                ? 'bg-rose-700 text-white border border-rose-500 shadow-lg animate-pulse' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <span>
              {breachScenario 
                ? (language === 'HI' ? 'दरार स्थिति सक्रिय (DISASTER SCENARIO)' : 'SIMULATING BREACH FAILURE') 
                : (language === 'HI' ? 'संरचनात्मक दरार सिमुलेशन चालू करें' : 'ENABLE BREACH FAILURE SCENARIO')}
            </span>
          </button>
        </div>
      </div>

      {/* Hydraulic Calculation Output Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Net Inflow vs Outflow */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 font-mono uppercase">{language === 'HI' ? 'स्पिलवे डिस्चार्ज दर' : 'Total Spillway Outflow'}</div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {totalOutflowCusecs.toLocaleString()} <span className="text-xs text-slate-400 font-sans">cusecs</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Net Balance: <span className={netInflowCusecs > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {netInflowCusecs > 0 ? `+${netInflowCusecs.toLocaleString()}` : netInflowCusecs.toLocaleString()} cusecs
            </span>
          </div>
        </div>

        {/* Metric 2: Projected Level in 12 Hours */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 font-mono uppercase">{language === 'HI' ? 'अनुमानित जल स्तर (+12 घंटे)' : 'Projected Reservoir Level (+12h)'}</div>
          <div className="text-2xl font-black font-mono text-sky-400">
            {projectedLevelIn12h} <span className="text-xs text-slate-400 font-sans">m MSL</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Full Reservoir Level: <span className="font-mono font-bold text-slate-200">{damData.fullReservoirLevelM} m</span>
          </div>
        </div>

        {/* Metric 3: Flood Wave Velocity & Arrival */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 font-mono uppercase">{language === 'HI' ? 'बाढ़ तरंग आगमन समय' : 'Flood Wave Arrival Time'}</div>
          <div className="text-2xl font-black font-mono text-amber-400 flex items-center gap-1.5">
            <Clock className="w-5 h-5 text-amber-400" />
            <span>{floodArrivalTimeHours} <span className="text-xs text-slate-400 font-sans">Hours</span></span>
          </div>
          <div className="text-[11px] text-slate-400">
            Downstream Speed: <span className="font-mono font-bold text-slate-200">{floodWaveVelocityKmh.toFixed(1)} km/h</span>
          </div>
        </div>

        {/* Metric 4: Affected Downstream Population */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 font-mono uppercase">{language === 'HI' ? 'जोखिम में डाउनस्ट्रीम आबादी' : 'Population at Flood Risk'}</div>
          <div className="text-2xl font-black font-mono text-rose-400 flex items-center gap-1.5">
            <Users className="w-5 h-5 text-rose-400" />
            <span>{affectedPeopleCount.toLocaleString()}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Affected Villages: <span className="font-mono font-bold text-slate-200">{damData.downstreamVillages} Villages</span>
          </div>
        </div>
      </div>

      {/* Downstream Risk Wave Progress Bar */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>{language === 'HI' ? 'डाउनस्ट्रीम जलस्तर लहर प्रगति (Inundation Wave Progress)' : 'DOWNSTREAM FLOOD INUNDATION WAVE PROPAGATION'}</span>
          </span>
          <span className="font-mono text-slate-400 text-[11px]">
            {riskStatus === 'CRITICAL_BREACH' ? 'CRITICAL EVACUATION BUFFER REQUIRED' : 'NORMAL BUFFER'}
          </span>
        </div>

        <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800 flex">
          <div 
            className={`h-full transition-all duration-700 ${
              riskStatus === 'CRITICAL_BREACH' 
                ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-rose-700 w-full animate-pulse' 
                : 'bg-gradient-to-r from-sky-500 to-blue-600 w-2/3'
            }`}
          />
        </div>
      </div>

      {/* Action Trigger Button */}
      {onDispatchEAP && (
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => onDispatchEAP(
              riskStatus === 'CRITICAL_BREACH' ? 'LEVEL_3_EMERGENCY' : riskStatus === 'WARNING' ? 'LEVEL_2_ALERT' : 'LEVEL_1_WATCH',
              `Monsoon Discharge Simulation: Inflow ${inflowCusecs.toLocaleString()} cusecs with ${openGates} gates open.`
            )}
            className="bg-rose-700 hover:bg-rose-600 text-white font-bold px-6 py-2.5 rounded-lg text-xs uppercase tracking-wider inline-flex items-center space-x-2 transition shadow-lg cursor-pointer font-sans"
          >
            <Send className="w-4 h-4" />
            <span>{language === 'HI' ? 'राष्ट्रीय आपातकालीन रेडियो प्रसारण जारी करें (Broadcast EAP)' : 'DISPATCH NATIONAL EAP EMERGENCY BROADCAST'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
