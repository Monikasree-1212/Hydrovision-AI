import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { VoiceAssistantModal } from '../voice/VoiceAssistantModal';
import { HydroVisionCopilot } from '../copilot/HydroVisionCopilot';
import { Shield, Bell, LogOut, User as UserIcon, Building2, Globe, Radio, Mic, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user, role, logout } = useAuth();
  const { language, setLanguage, fontSize, setFontSize, t } = useLanguage();
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleLabel = (r?: string | null) => {
    switch (r) {
      case 'SUPREME_COMMAND':
        return t('role_supreme');
      case 'AUTHORITY':
        return t('role_authority');
      case 'DAM_OPERATOR':
        return t('role_operator');
      case 'INSPECTION_ENGINEER':
        return t('role_engineer');
      case 'MAINTENANCE_MANAGER':
        return t('role_manager');
      default:
        return t('role_authorized');
    }
  };

  const getRoleBadgeStyle = (r?: string | null) => {
    switch (r) {
      case 'SUPREME_COMMAND':
        return 'bg-gradient-to-r from-amber-500 to-amber-700 text-slate-950 font-black border border-amber-300';
      case 'AUTHORITY':
        return 'bg-govt-navy text-white border border-govt-blue';
      case 'DAM_OPERATOR':
        return 'bg-sky-800 text-white';
      case 'INSPECTION_ENGINEER':
        return 'bg-emerald-800 text-white';
      case 'MAINTENANCE_MANAGER':
        return 'bg-amber-800 text-white';
      default:
        return 'bg-slate-700 text-white';
    }
  };

  return (
    <header className="bg-govt-navy text-white border-b-2 border-govt-blue shadow-md relative">
      {/* 1. Indian Tricolor National Bar */}
      <div className="h-1.5 w-full flex">
        <div className="h-full w-1/3 bg-[#FF9933]" />
        <div className="h-full w-1/3 bg-white" />
        <div className="h-full w-1/3 bg-[#138808]" />
      </div>

      {/* 2. Top Banner Disclaimer & Accessibility Suite */}
      <div className="bg-[#0b223c] px-4 py-1.5 text-xs text-slate-300 flex flex-wrap justify-between items-center border-b border-slate-700/50 gap-2">
        <div className="flex items-center space-x-2">
          <Building2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold tracking-wide">{t('portal_title')}</span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Accessibility Text Resizer */}
          <div className="flex items-center space-x-1 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700 text-[11px]">
            <span className="text-slate-400 font-mono text-[10px] mr-1">Text:</span>
            <button
              onClick={() => setFontSize('normal')}
              className={`px-1.5 py-0.2 rounded font-bold ${fontSize === 'normal' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
              title="Standard Font Size"
            >
              A
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-1.5 py-0.2 rounded font-bold ${fontSize === 'large' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
              title="Large Font Size"
            >
              A+
            </button>
            <button
              onClick={() => setFontSize('xlarge')}
              className={`px-1.5 py-0.2 rounded font-bold ${fontSize === 'xlarge' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
              title="Extra Large Font Size"
            >
              A++
            </button>
          </div>

          {/* AI Voice Assistant Mic Button */}
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-2.5 py-0.5 rounded font-extrabold text-[11px] shadow-md transition border border-amber-300 cursor-pointer"
            title="Launch Jal-Vision AI Voice Copilot"
          >
            <Mic className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
            <span>JAL-VISION VOICE AI</span>
          </button>

          {/* Public Citizen Grievance Portal Link */}
          <Link
            to="/public-grievance"
            className="flex items-center space-x-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded font-extrabold text-[11px] border border-amber-400/40 transition"
            title="Open Public Citizen Grievance Portal"
          >
            <span>📢 PUBLIC GRIEVANCE PORTAL</span>
          </Link>

          {/* Bilingual Language Switcher */}
          <div className="flex items-center space-x-1 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700 text-[11px]">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <button
              onClick={() => setLanguage('EN')}
              className={`px-1.5 py-0.2 rounded font-bold ${language === 'EN' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              English
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => setLanguage('HI')}
              className={`px-1.5 py-0.2 rounded font-bold ${language === 'HI' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              हिन्दी
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-3 text-[11px]">
            <span>{t('secure_access')}</span>
            <span className="text-emerald-400 font-semibold">• {t('system_online')}</span>
          </div>
        </div>
      </div>

      {/* Voice Assistant Modal Component */}
      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />

      {/* 3. Main Header Branding Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Ashoka/NDSA Seal & Official Titles */}
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 opacity-75 blur-sm group-hover:opacity-100 transition" />
            <img 
              src="/assets/gov_emblem.jpg" 
              alt="Government of India Emblem" 
              className="relative w-12 h-12 rounded-full border-2 border-amber-400 object-cover shadow-xl"
            />
          </div>
          <div>
            <div className="text-[11px] tracking-wider uppercase font-semibold text-amber-400 flex items-center gap-1.5">
              <span>{t('dept_name')}</span>
            </div>
            <Link to="/" className="text-2xl font-black tracking-tight text-white hover:text-slate-200 font-serif">
              {t('system_name')}
            </Link>
            <div className="text-xs text-slate-300 font-medium max-w-xl">
              {t('sub_title')}
            </div>
          </div>
        </div>

        {/* User Profile & Role Controls */}
        {user ? (
          <div className="flex items-center space-x-6">
            <div className="text-right hidden md:block">
              <div className="text-xs font-bold text-white flex items-center justify-end space-x-1.5 uppercase tracking-wider">
                <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>{getRoleLabel(role)}</span>
              </div>
              <div className="text-[11px] text-slate-300">{user.department || 'Infrastructure Dept'}</div>
            </div>

            <div className="flex items-center space-x-3 border-l border-slate-700/80 pl-4">
              <Link to="/alerts" className="relative p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded transition" title="Alerts">
                <Bell className="w-5 h-5" />
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 bg-rose-900/80 hover:bg-rose-800 text-rose-100 text-xs px-3 py-1.5 rounded border border-rose-700/50 transition font-medium shadow-sm"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('sign_out')}</span>
              </button>
            </div>
          </div>
        ) : (
          <Link
            to="/login"
            className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded text-xs uppercase tracking-wider shadow-lg transition"
          >
            {t('authorized_login')}
          </Link>
        )}
      </div>

      {/* 4. Live Hydro-Alert Scrolling Ticker */}
      <div className="bg-slate-950 border-t border-slate-800 py-1 px-4 text-xs flex items-center overflow-hidden">
        <div className="bg-rose-900 text-rose-100 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider flex items-center gap-1 shrink-0 mr-3 animate-pulse">
          <Radio className="w-3 h-3 text-rose-300" />
          <span>NATIONAL HYDRO-ALERT</span>
        </div>
        <div className="overflow-hidden whitespace-nowrap w-full">
          <p className="inline-block animate-marquee text-slate-300 font-mono text-xs">
            {t('ticker_text')}
          </p>
        </div>
      </div>

      {/* Global HydroVision AI Copilot */}
      <HydroVisionCopilot />
    </header>
  );
};
