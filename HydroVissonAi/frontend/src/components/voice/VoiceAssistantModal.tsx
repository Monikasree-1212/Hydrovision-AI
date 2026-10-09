import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Mic, MicOff, Volume2, Sparkles, Radio, Compass, 
  MapPin, Box, ShieldAlert, Camera, ArrowRight, CheckCircle2 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchDroneHUD?: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onLaunchDroneHUD
}) => {
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [lastActionResponse, setLastActionResponse] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Synthesis & Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = language === 'HI' ? 'hi-IN' : 'en-US';

        recognition.onresult = (event: any) => {
          const currentText = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          setTranscript(currentText);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [language]);

  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'HI' ? 'hi-IN' : 'en-US';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setLastActionResponse('');
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const executeVoiceCommand = (cmdText: string) => {
    const text = cmdText.toLowerCase().trim();
    setTranscript(cmdText);

    // 1. Language Toggle Intents
    if (text.includes('hindi') || text.includes('हिन्दी') || text.includes('hindi me')) {
      setLanguage('HI');
      const response = 'भाषा को हिन्दी में बदल दिया गया है।';
      setLastActionResponse(response);
      speakText(response);
      return;
    }

    if (text.includes('english') || text.includes('अंग्रेजी')) {
      setLanguage('EN');
      const response = 'Language switched to English.';
      setLastActionResponse(response);
      speakText(response);
      return;
    }

    // 2. Drone HUD Intent
    if (text.includes('drone') || text.includes('hud') || text.includes('ड्रोन') || text.includes('flight')) {
      const response = language === 'HI' ? 'लाइव ड्रोन उड़ान सिमुलेटर खोला जा रहा है।' : 'Launching Live Drone Flight Telemetry HUD.';
      setLastActionResponse(response);
      speakText(response);
      if (onLaunchDroneHUD) {
        onLaunchDroneHUD();
      } else {
        navigate('/drone-planner');
      }
      return;
    }

    // 3. Flood Breach / Monsoon Intent
    if (text.includes('flood') || text.includes('breach') || text.includes('monsoon') || text.includes('बाढ़') || text.includes('ईएपी')) {
      const response = language === 'HI' ? 'मानसून बाढ़ व ईएपी सिमुलेटर खोला जा रहा है।' : 'Navigating to Monsoon Flood Breach Simulator.';
      setLastActionResponse(response);
      speakText(response);
      navigate('/eap');
      onClose();
      return;
    }

    // 4. GIS Map Intent
    if (text.includes('gis') || text.includes('map') || text.includes('मानचित्र')) {
      const response = language === 'HI' ? 'जीआईएस राष्ट्रीय मानचित्र खोला जा रहा है।' : 'Navigating to GIS Spatial Map.';
      setLastActionResponse(response);
      speakText(response);
      navigate('/gis');
      onClose();
      return;
    }

    // 5. 3D Digital Twin Intent
    if (text.includes('3d') || text.includes('twin') || text.includes('डिजिटल')) {
      const response = language === 'HI' ? '3डी डिजिटल ट्विन मॉडल खोला जा रहा है।' : 'Navigating to 3D Digital Twin Model.';
      setLastActionResponse(response);
      speakText(response);
      navigate('/digital-twin');
      onClose();
      return;
    }

    // 6. NDSA Intent
    if (text.includes('ndsa') || text.includes('audit') || text.includes('ऑडिट')) {
      const response = language === 'HI' ? 'एनडीएसए अनुपालन लेखापरीक्षा खोली जा रही है।' : 'Navigating to NDSA Statutory Audit.';
      setLastActionResponse(response);
      speakText(response);
      navigate('/ndsa-compliance');
      onClose();
      return;
    }

    // 7. Defects Intent
    if (text.includes('defect') || text.includes('crack') || text.includes('दोष') || text.includes('दरार')) {
      const response = language === 'HI' ? 'दोष सत्यापन केंद्र खोला जा रहा है।' : 'Navigating to Defect Verification Hub.';
      setLastActionResponse(response);
      speakText(response);
      navigate('/defect-verification');
      onClose();
      return;
    }

    // Default Fallback
    const fallbackMsg = language === 'HI' 
      ? `आदेश स्वीकार किया गया: "${cmdText}". डैशबोर्ड पर निर्देशित किया जा रहा है।`
      : `Command recognized: "${cmdText}". Executing system action.`;
    setLastActionResponse(fallbackMsg);
    speakText(fallbackMsg);
  };

  useEffect(() => {
    if (transcript && !isListening) {
      executeVoiceCommand(transcript);
    }
  }, [isListening]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 selection:bg-amber-500 font-sans">
      <div className="relative w-full max-w-xl bg-slate-900 border-2 border-amber-400/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Top Voice Header */}
        <div className="bg-slate-950 px-5 py-3.5 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/20 border border-amber-400/50 rounded-full text-amber-400">
              <Sparkles className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                <span>{language === 'HI' ? 'जल-विज़न एआई आवाज़ सहायक' : 'JAL-VISION AI VOICE COPILOT'}</span>
                <span className="bg-emerald-900/80 text-emerald-300 text-[10px] px-2 py-0.2 rounded border border-emerald-600 font-mono">
                  VOICE ACTIVE
                </span>
              </div>
              <div className="text-sm font-extrabold text-white">
                {language === 'HI' ? 'राष्ट्रीय बाँध सुरक्षा वॉइस असिस्टेंट' : 'Hands-Free Infrastructure Voice Command Console'}
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Central Animated Microphone & Audio Soundwave View */}
        <div className="bg-slate-950 p-8 flex flex-col items-center justify-center space-y-5 text-center relative overflow-hidden">
          
          {/* Background Radial Glow */}
          <div className="absolute inset-0 bg-radial-gradient from-amber-500/10 via-transparent to-transparent pointer-events-none" />

          {/* Glowing Animated Mic Button */}
          <button
            onClick={toggleListening}
            className={`relative group w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl cursor-pointer ${
              isListening
                ? 'bg-rose-600 border-4 border-rose-400 shadow-rose-500/50 animate-pulse'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 border-4 border-amber-300 shadow-amber-500/40 hover:scale-105'
            }`}
          >
            {/* Pulsing Outer Rings when listening */}
            {isListening && (
              <>
                <div className="absolute -inset-4 rounded-full border-2 border-rose-500/60 animate-ping" />
                <div className="absolute -inset-8 rounded-full border border-rose-500/30 animate-pulse" />
              </>
            )}

            {isListening ? (
              <Mic className="w-10 h-10 text-white animate-bounce" />
            ) : (
              <Mic className="w-10 h-10 text-slate-950" />
            )}
          </button>

          {/* Listening Status Text */}
          <div>
            <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
              {isListening 
                ? (language === 'HI' ? 'सुन रहा है... बोलिए' : 'LISTENING... SPEAK NOW') 
                : (language === 'HI' ? 'बोलने के लिए माइक पर क्लिक करें' : 'CLICK MIC TO SPEAK COMMAND')}
            </div>
            <div className="text-sm font-semibold text-white mt-2 font-mono min-h-[24px]">
              {transcript ? `"${transcript}"` : (language === 'HI' ? 'जैसे: "ड्रोन सिमुलेटर खोलें" या "हिन्दी में बदलो"' : 'Try saying: "Launch Drone HUD" or "Switch to Hindi"')}
            </div>
          </div>

          {/* Last Spoken AI Response */}
          {lastActionResponse && (
            <div className="bg-slate-900 border border-emerald-500/40 p-3 rounded-xl text-xs text-emerald-300 font-semibold flex items-center space-x-2 w-full max-w-md animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-left">{lastActionResponse}</span>
            </div>
          )}
        </div>

        {/* Quick Voice Command Chips Bar */}
        <div className="bg-slate-900 p-5 border-t border-slate-800 space-y-3">
          <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'HI' ? 'त्वरित वॉइस कमांड शॉर्टकट्स (1-Click Trigger)' : 'INSTANT VOICE COMMAND SHORTCUTS'}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {[
              { label: language === 'HI' ? '🛩️ ड्रोन HUD सिमुलेटर' : '🛩️ Launch Drone HUD', cmd: 'Launch Drone HUD Simulator' },
              { label: language === 'HI' ? '🌊 मानसून बाढ़ सिमुलेटर' : '🌊 Flood Breach Simulator', cmd: 'Show Flood Breach Simulation' },
              { label: language === 'HI' ? '🇮🇳 हिन्दी में बदलें' : '🇮🇳 Switch to Hindi', cmd: 'Switch to Hindi' },
              { label: language === 'HI' ? '🇬🇧 English Mode' : '🇬🇧 Switch to English', cmd: 'Switch to English' },
              { label: language === 'HI' ? '🗺️ GIS मानचित्र' : '🗺️ Open GIS Map', cmd: 'Open GIS Map' },
              { label: language === 'HI' ? '📦 3D डिजिटल ट्विन' : '📦 3D Digital Twin', cmd: 'Open 3D Digital Twin' },
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => executeVoiceCommand(chip.cmd)}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/60 rounded-xl text-slate-200 text-left font-medium transition text-xs flex items-center justify-between group cursor-pointer"
              >
                <span>{chip.label}</span>
                <ArrowRight className="w-3 h-3 text-amber-400 opacity-0 group-hover:opacity-100 transition" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
