
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AuthService } from '../services/api';
import { Shield, Lock, AlertCircle, Radio, Activity, Cpu, CheckCircle2, Server, Key, Globe } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeRoleTag, setActiveRoleTag] = useState<string | null>(null);
  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await AuthService.login(email, password);
      login(data.access_token, {
        id: data.user_id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        is_active: true
      });

      // Redirect to appropriate role dashboard
      switch (data.role) {
        case 'SUPREME_COMMAND':
          navigate('/supreme-command');
          break;
        case 'AUTHORITY':
          navigate('/authority/dashboard');
          break;
        case 'DAM_OPERATOR':
          navigate('/operator/dashboard');
          break;
        case 'INSPECTION_ENGINEER':
          navigate('/engineer/dashboard');
          break;
        case 'MAINTENANCE_MANAGER':
          navigate('/manager/dashboard');
          break;
        default:
          navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please check your official credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillTestCredentials = (roleEmail: string, rolePass: string, roleTag: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setActiveRoleTag(roleTag);
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 font-sans text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-amber-500 selection:text-slate-950">
      
      {/* 1. REAL DAM VISUALIZATION HERO BACKGROUND IMAGE */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0 transform scale-105 transition-transform duration-1000"
        style={{ backgroundImage: `url('/assets/dam_bg.jpg')` }}
      >
        {/* Dark Vignette & Cyber Blue Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/70 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-slate-950/40 to-slate-950" />
      </div>

      {/* 2. GOVERNMENT OF INDIA TRICOLOR TOP BAR */}
      <div className="relative z-20 h-1.5 w-full flex">
        <div className="h-full w-1/3 bg-[#FF9933]" />
        <div className="h-full w-1/3 bg-white" />
        <div className="h-full w-1/3 bg-[#138808]" />
      </div>

      {/* 3. OFFICIAL GOVERNMENT HEADER */}
      <header className="relative z-20 bg-slate-950/90 backdrop-blur-md border-b border-sky-500/20 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-500 to-sky-500 opacity-60 blur-sm group-hover:opacity-100 transition" />
            <img 
              src="/assets/gov_emblem.jpg" 
              alt="Government of India Emblem" 
              className="relative w-12 h-12 rounded-full border border-amber-400/80 object-cover shadow-lg"
            />
          </div>
          <div>
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
              <span>भारत सरकार</span>
              <span className="text-slate-500">|</span>
              <span>GOVERNMENT OF INDIA</span>
            </div>
            <div className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>MINISTRY OF JAL SHAKTI • CENTRAL WATER COMMISSION</span>
            </div>
            <div className="text-[10px] text-slate-300 font-medium tracking-wide">
              National Dam Safety Authority (NDSA) • AI Inspection Portal
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 sm:space-x-6">
          {/* Language Switcher */}
          <div className="flex items-center space-x-1 bg-slate-900/90 px-2 py-1 rounded-lg border border-sky-500/30 text-xs">
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <button
              type="button"
              onClick={() => setLanguage('EN')}
              className={`px-2 py-0.5 rounded font-bold transition ${language === 'EN' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              English
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={() => setLanguage('HI')}
              className={`px-2 py-0.5 rounded font-bold transition ${language === 'HI' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              हिन्दी
            </button>
          </div>

          <div className="hidden md:flex items-center space-x-2 bg-slate-900/80 border border-sky-500/30 px-3 py-1.5 rounded-full text-xs text-sky-300">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-semibold tracking-wider">CWC TELEMETRY GRID: ONLINE</span>
          </div>
          <div className="hidden sm:block text-right">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Security Tier</div>
            <div className="text-xs font-bold text-amber-400 flex items-center justify-end gap-1">
              <Shield className="w-3.5 h-3.5" />
              <span>TLS 1.3 GOV-ENCRYPTED</span>
            </div>
          </div>
        </div>
      </header>

      {/* 4. MAIN LOGIN CONTENT BODY */}
      <main className="relative z-10 my-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row items-center justify-center gap-12 max-w-7xl mx-auto w-full">
        
        {/* Left Side: Real-Time Infrastructure Telemetry Cards (Desktop View) */}
        <div className="hidden lg:block w-full lg:w-1/2 space-y-6">
          <div className="inline-flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-amber-400 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <Activity className="w-3.5 h-3.5" />
            <span>National Infrastructure Safety Network</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none font-serif">
            HYDROVISION <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-amber-300 to-emerald-400">AI</span>
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed max-w-xl font-normal">
            Official AI-Assisted Dam Structural Integrity Monitoring, Drone Defect Analytics, 3D Digital Twin Visualizer, and Predictive Maintenance Support System for India's 4,850+ Major Hydroelectric Dams & Reservoirs.
          </p>

          {/* Live System Badges Grid */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-900/70 border border-slate-800 backdrop-blur-md p-4 rounded-xl shadow-lg hover:border-sky-500/40 transition">
              <div className="flex items-center justify-between text-sky-400 mb-1">
                <Cpu className="w-5 h-5" />
                <span className="text-[10px] font-mono bg-sky-950 text-sky-300 px-2 py-0.5 rounded border border-sky-800">YOLO11 AI</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">99.8%</div>
              <div className="text-xs text-slate-400">Defect Detection Precision</div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 backdrop-blur-md p-4 rounded-xl shadow-lg hover:border-emerald-500/40 transition">
              <div className="flex items-center justify-between text-emerald-400 mb-1">
                <Server className="w-5 h-5" />
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">NDSA LIVE</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">4,850+</div>
              <div className="text-xs text-slate-400">Dams Under Monitoring</div>
            </div>
          </div>
        </div>

        {/* Right Side: Government Glassmorphism Login Box */}
        <div className="w-full lg:w-5/12 max-w-md">
          <div className="relative group">
            {/* Glowing Accent Border */}
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-sky-500 via-amber-400 to-emerald-500 opacity-30 blur-md group-hover:opacity-50 transition duration-500" />
            
            <div className="relative bg-slate-900/90 backdrop-blur-xl border border-sky-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl">
              
              {/* Seal Header */}
              <div className="text-center mb-6">
                <div className="relative inline-block mb-3">
                  <div className="absolute -inset-2 bg-amber-400/20 rounded-full blur-md" />
                  <img 
                    src="/assets/gov_emblem.jpg" 
                    alt="NDSA Official Emblem" 
                    className="relative w-16 h-16 rounded-full mx-auto border-2 border-amber-400 object-cover shadow-2xl"
                  />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">
                  {language === 'HI' ? 'अधिकृत लॉगिन' : 'AUTHORIZED SIGN IN'}
                </h2>
                <p className="text-xs font-semibold text-amber-400 mt-1">
                  {t('login_welcome')} • {language === 'HI' ? 'सरकारी अनुमति आवश्यक' : 'Government Clearance Required'}
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 bg-rose-950/80 border border-rose-600/60 text-rose-200 text-xs rounded-xl flex items-center space-x-2 shadow-inner">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleLogin}>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    {language === 'HI' ? 'आधिकारिक ईमेल पता' : 'Official Email Address'}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="officer@hydrovision.gov.in"
                      className="w-full pl-3 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    {language === 'HI' ? 'पासवर्ड' : 'Password'}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 border border-amber-300/60 shadow-lg shadow-amber-500/20 transition uppercase tracking-wider flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer font-sans"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-950" />
                  <span>
                    {loading
                      ? (language === 'HI' ? 'सत्यापन हो रहा है...' : 'VERIFYING CLEARANCE...')
                      : (language === 'HI' ? 'सुरक्षित पोर्टल में प्रवेश करें' : 'SECURE SIGN IN TO PORTAL')}
                  </span>
                </button>
              </form>

              {/* QUICK ROLE TEST CREDENTIAL SELECTOR */}
              <div className="mt-6 border-t border-slate-800 pt-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 text-center flex items-center justify-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>QUICK ROLE DEMO CREDENTIALS</span>
                </div>
                
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => fillTestCredentials('supreme.command@hydrovision.gov.in', 'SupremeCommand#2026!', 'SUPREME')}
                    className={`w-full p-2.5 border rounded-xl text-left transition flex items-center justify-between ${
                      activeRoleTag === 'SUPREME' 
                        ? 'bg-amber-500/30 border-amber-400 text-white ring-2 ring-amber-400/50' 
                        : 'bg-gradient-to-r from-amber-950/60 to-slate-950 border-amber-500/40 hover:border-amber-400 text-amber-200'
                    }`}
                  >
                    <div>
                      <div className="font-extrabold text-amber-300 text-xs flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>SUPREME COMMAND PORTAL</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">supreme.command@hydrovision.gov.in (National Command HQ)</div>
                    </div>
                    {activeRoleTag === 'SUPREME' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                  </button>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => fillTestCredentials('authority@hydrovision.gov.in', 'authority123', 'AUTH')}
                      className={`p-2.5 border rounded-xl text-left transition flex flex-col justify-between ${
                        activeRoleTag === 'AUTH' 
                          ? 'bg-amber-500/20 border-amber-400 text-white' 
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-amber-400 text-xs flex items-center justify-between">
                        <span>1. Authority</span>
                        {activeRoleTag === 'AUTH' && <CheckCircle2 className="w-3 h-3 text-amber-400" />}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Govt Authority</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => fillTestCredentials('operator@hydrovision.gov.in', 'operator123', 'OP')}
                      className={`p-2.5 border rounded-xl text-left transition flex flex-col justify-between ${
                        activeRoleTag === 'OP' 
                          ? 'bg-sky-500/20 border-sky-400 text-white' 
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-sky-400 text-xs flex items-center justify-between">
                        <span>2. Operator</span>
                        {activeRoleTag === 'OP' && <CheckCircle2 className="w-3 h-3 text-sky-400" />}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Dam Operator</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => fillTestCredentials('engineer@hydrovision.gov.in', 'engineer123', 'ENG')}
                      className={`p-2.5 border rounded-xl text-left transition flex flex-col justify-between ${
                        activeRoleTag === 'ENG' 
                          ? 'bg-emerald-500/20 border-emerald-400 text-white' 
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-emerald-400 text-xs flex items-center justify-between">
                        <span>3. Engineer</span>
                        {activeRoleTag === 'ENG' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Inspection Engineer</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => fillTestCredentials('manager@hydrovision.gov.in', 'manager123', 'MGR')}
                      className={`p-2.5 border rounded-xl text-left transition flex flex-col justify-between ${
                        activeRoleTag === 'MGR' 
                          ? 'bg-purple-500/20 border-purple-400 text-white' 
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-purple-400 text-xs flex items-center justify-between">
                        <span>4. Manager</span>
                        {activeRoleTag === 'MGR' && <CheckCircle2 className="w-3 h-3 text-purple-400" />}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Maintenance Manager</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 5. OFFICIAL FOOTER */}
      <footer className="relative z-20 bg-slate-950/95 border-t border-slate-800/80 px-4 py-3 text-center text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <img src="/assets/gov_emblem.jpg" alt="Emblem" className="w-5 h-5 rounded-full border border-amber-400/60" />
          <span className="font-serif font-bold text-slate-200">सत्यमेव जयते</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 text-[11px]">Central Water Commission • National Dam Safety Authority</span>
        </div>

        <div className="text-[11px] text-slate-500">
          Official Infrastructure Decision Support System © {new Date().getFullYear()} Government of India
        </div>
      </footer>
    </div>
  );
};

