import React from 'react';
import { Building2, ShieldCheck, ExternalLink, Globe } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-950 text-slate-400 border-t-2 border-govt-blue mt-12 text-xs">
      {/* Top Footer Links & Disclaimers */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Col 1: Government Identity */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <Building2 className="w-5 h-5 text-amber-400" />
            <span>HYDROVISION AI</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Official Water Infrastructure Monitoring & Decision Support Platform. Operating under National Dam Safety Authority (NDSA) guidelines & Dam Safety Act 2021.
          </p>
          <div className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ISO 27001 Certified & CERT-In Compliant</span>
          </div>
        </div>

        {/* Col 2: Regulatory Org Links */}
        <div className="space-y-2">
          <h4 className="font-bold text-white uppercase text-[11px] tracking-wider text-slate-200">
            Governing Bodies
          </h4>
          <ul className="space-y-1.5 text-[11px]">
            <li>
              <a href="https://jalshakti-dowr.gov.in/" target="_blank" rel="noreferrer" className="hover:text-amber-400 transition flex items-center gap-1">
                <span>Ministry of Jal Shakti</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            </li>
            <li>
              <a href="http://cwc.gov.in/" target="_blank" rel="noreferrer" className="hover:text-amber-400 transition flex items-center gap-1">
                <span>Central Water Commission (CWC)</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            </li>
            <li>
              <a href="https://damsafety.gov.in/" target="_blank" rel="noreferrer" className="hover:text-amber-400 transition flex items-center gap-1">
                <span>National Dam Safety Authority (NDSA)</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            </li>
            <li>
              <a href="https://india.gov.in/" target="_blank" rel="noreferrer" className="hover:text-amber-400 transition flex items-center gap-1">
                <span>National Portal of India (india.gov.in)</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            </li>
          </ul>
        </div>

        {/* Col 3: Portal Policies & Standard Specs */}
        <div className="space-y-2">
          <h4 className="font-bold text-white uppercase text-[11px] tracking-wider text-slate-200">
            Portal Policies
          </h4>
          <ul className="space-y-1.5 text-[11px]">
            <li className="hover:text-slate-200 cursor-pointer">Website Policies & Guidelines (GIGS)</li>
            <li className="hover:text-slate-200 cursor-pointer">Dam Safety Act 2021 Directives</li>
            <li className="hover:text-slate-200 cursor-pointer">Cybersecurity Protocol & Audit Log Policy</li>
            <li className="hover:text-slate-200 cursor-pointer">Help & Technical Support Contacts</li>
          </ul>
        </div>

        {/* Col 4: Hosting & Infrastructure Notice */}
        <div className="space-y-3 bg-slate-900/60 p-3.5 rounded border border-slate-800">
          <h4 className="font-bold text-slate-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>National Data Center</span>
          </h4>
          <p className="text-[10px] text-slate-400 leading-tight">
            Designed, developed and hosted by National Informatics Centre (NIC) / Government Cloud Infrastructure.
          </p>
          <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800">
            Version 2.4.0 — Release Build 2026.09
          </div>
        </div>
      </div>

      {/* Bottom Copyright & National Emblem Accent */}
      <div className="bg-slate-900 py-3 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-2 text-center md:text-left">
          <div>
            {t('footer_copyright')}
          </div>
          <div className="text-slate-500 font-mono">
            {t('dept_name')}
          </div>
        </div>
      </div>
    </footer>
  );
};
