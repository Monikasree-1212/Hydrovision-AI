import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building, ClipboardCheck, Box, ShieldAlert, 
  Wrench, FileText, ArrowRight, Shield, Activity, Database 
} from 'lucide-react';
import { DamService, InspectionService, DefectService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export const HomePage: React.FC = () => {
  const [stats, setStats] = useState({ damsCount: 0, inspectionsCount: 0, defectsCount: 0, loading: true });
  const { language, t } = useLanguage();

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [dams, insps, defects] = await Promise.all([
          DamService.getDams(),
          InspectionService.getInspections(),
          DefectService.getDefects()
        ]);
        setStats({
          damsCount: dams.length,
          inspectionsCount: insps.length,
          defectsCount: defects.length,
          loading: false
        });
      } catch (err) {
        setStats(prev => ({ ...prev, loading: false }));
      }
    };
    loadStats();
  }, []);

  return (
    <div className="space-y-6 font-sans">
      {/* Official System Banner */}
      <div className="bg-govt-navy text-white p-6 rounded shadow border-l-4 border-amber-400">
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-block bg-govt-blue px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider text-amber-300 mb-2">
              {t('portal_title')}
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              {t('system_name')} — {t('sub_title')}
            </h1>
            <p className="mt-2 text-xs text-slate-300 max-w-3xl leading-relaxed">
              {language === 'HI' 
                ? 'ड्रोन निरीक्षण इमेजरी, जीपीएस जियो-रेफरेंसिंग, एआई दोष पहचान, 3डी डिजिटल ट्विन, जोखिम मूल्यांकन, तथा रखरखाव कार्य-आदेश प्रबंधन को जोड़ने वाला एकीकृत राष्ट्रीय अवसंरचना निगरानी मंच।'
                : 'Integrated platform for large dams and hydroelectric projects connecting drone inspection imagery, spatial GPS geo-referencing, AI defect detection, 3D Digital Twins, explainable risk scoring, and maintenance work-order management.'}
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end text-right">
            <div className="text-xs text-slate-300 font-medium">{language === 'HI' ? 'प्रणाली की स्थिति' : 'System Status'}</div>
            <div className="text-emerald-400 text-sm font-bold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{language === 'HI' ? 'डेटाबेस एवं एपीआई सक्रिय' : 'DATABASE & API OPERATIONAL'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real System Database State Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded border border-govt-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">{t('total_dams')}</div>
            <div className="text-2xl font-bold text-govt-navy mt-1">
              {stats.loading ? '...' : stats.damsCount}
            </div>
            <div className="text-[11px] text-slate-500">{language === 'HI' ? 'पंजीकृत बाँध संरचनाएँ' : 'Registered dam structures'}</div>
          </div>
          <Building className="w-8 h-8 text-govt-blue/40" />
        </div>

        <div className="bg-white p-4 rounded border border-govt-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">{language === 'HI' ? 'निरीक्षण रिकॉर्ड्स' : 'Inspection Records'}</div>
            <div className="text-2xl font-bold text-govt-navy mt-1">
              {stats.loading ? '...' : stats.inspectionsCount}
            </div>
            <div className="text-[11px] text-slate-500">{language === 'HI' ? 'ड्रोन दृश्य व थर्मल चक्र' : 'Drone visual & thermal cycles'}</div>
          </div>
          <ClipboardCheck className="w-8 h-8 text-emerald-800/40" />
        </div>

        <div className="bg-white p-4 rounded border border-govt-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase">{t('verified_defects')}</div>
            <div className="text-2xl font-bold text-govt-navy mt-1">
              {stats.loading ? '...' : stats.defectsCount}
            </div>
            <div className="text-[11px] text-slate-500">{language === 'HI' ? 'इंजीनियरों द्वारा सत्यापित' : 'Human-in-the-loop verified'}</div>
          </div>
          <ShieldAlert className="w-8 h-8 text-amber-600/40" />
        </div>
      </div>

      {/* Operational Workflow Loop Diagram */}
      <div className="bg-white p-5 rounded border border-govt-border shadow-sm">
        <h2 className="text-sm font-bold text-govt-navy uppercase tracking-wider mb-4 flex items-center space-x-2">
          <Activity className="w-4 h-4 text-govt-blue" />
          <span>{language === 'HI' ? 'पूर्ण परिचालन कार्यप्रवाह चक्र (End-to-End Workflow)' : 'END-TO-END OPERATIONAL WORKFLOW LOOP'}</span>
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
          {[
            { step: '01', name: language === 'HI' ? 'ड्रोन डेटा' : 'Drone Upload', desc: language === 'HI' ? 'इमेजरी व जीपीएस' : 'Imagery & GPS Data' },
            { step: '02', name: language === 'HI' ? 'डेटा सत्यापन' : 'Data Validation', desc: language === 'HI' ? 'गुणवत्ता जांच' : 'Blur & Quality Check' },
            { step: '03', name: language === 'HI' ? 'एआई पहचान' : 'AI Detection', desc: language === 'HI' ? 'YOLO11 दरार व क्षरण' : 'YOLO11 Crack/Corrosion' },
            { step: '04', name: language === 'HI' ? 'मानव सत्यापन' : 'Verification', desc: language === 'HI' ? 'इंजीनियर हस्ताक्षर' : 'Engineer Sign-off' },
            { step: '05', name: language === 'HI' ? 'जीआईएस व 3डी' : 'GIS & 3D Twin', desc: language === 'HI' ? 'स्थानिक मैपिंग' : 'Spatial Geo-referencing' },
            { step: '06', name: language === 'HI' ? 'जोखिम स्कोरिंग' : 'Risk Scoring', desc: language === 'HI' ? '0-100 जोखिम सूचकांक' : '0-100 Dam Risk Index' },
            { step: '07', name: language === 'HI' ? 'रखरखाव कार्य' : 'Maintenance', desc: language === 'HI' ? 'कार्य आदेश व पुनः जांच' : 'Work Order & Reinspection' },
          ].map((w, idx) => (
            <div key={idx} className="bg-govt-light p-2.5 rounded border border-govt-border relative flex flex-col justify-between">
              <div className="text-[10px] font-extrabold text-govt-blue uppercase tracking-widest">{w.step}</div>
              <div className="font-bold text-govt-dark my-1">{w.name}</div>
              <div className="text-[10px] text-slate-500">{w.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Portals Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded border border-govt-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-govt-navy uppercase mb-1">{t('role_authority')}</div>
            <p className="text-xs text-slate-600 mb-4">
              {language === 'HI' ? 'बहु-बाँध सुरक्षा अवलोकन, अनुपालन ट्रैकिंग, जोखिम मैट्रिक्स सारांश, तथा सरकारी रिपोर्ट।' : 'Multi-dam safety overview, compliance tracking, risk matrix summary, and government reports.'}
            </p>
          </div>
          <Link to="/authority/dashboard" className="text-xs font-bold text-govt-blue flex items-center space-x-1 hover:underline">
            <span>{language === 'HI' ? 'प्राधिकरण डैशबोर्ड देखें' : 'Access Authority Dashboard'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded border border-govt-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-sky-900 uppercase mb-1">{t('role_operator')}</div>
            <p className="text-xs text-slate-600 mb-4">
              {language === 'HI' ? 'आवंटित बाँध स्वास्थ्य निगरानी, निरीक्षण अनुरोध और संरचनात्मक स्थिति ट्रैकिंग।' : 'Assigned dam monitoring, inspection request submission, and structural health tracking.'}
            </p>
          </div>
          <Link to="/operator/dashboard" className="text-xs font-bold text-sky-800 flex items-center space-x-1 hover:underline">
            <span>{language === 'HI' ? 'ऑपरेटर डैशबोर्ड देखें' : 'Access Operator Dashboard'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded border border-govt-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-emerald-900 uppercase mb-1">{t('role_engineer')}</div>
            <p className="text-xs text-slate-600 mb-4">
              {language === 'HI' ? 'ड्रोन डेटा अपलोड, एआई दोष पहचान, मानव सत्यापन, स्थिति रेटिंग तथा रिपोर्ट जनरेशन।' : 'Drone upload, AI defect detection, human verification, condition rating, and report generation.'}
            </p>
          </div>
          <Link to="/engineer/dashboard" className="text-xs font-bold text-emerald-800 flex items-center space-x-1 hover:underline">
            <span>{language === 'HI' ? 'निरीक्षण इंजीनियर डैशबोर्ड देखें' : 'Access Inspection Engineer Dashboard'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded border border-govt-border shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-amber-900 uppercase mb-1">{t('role_manager')}</div>
            <p className="text-xs text-slate-600 mb-4">
              {language === 'HI' ? 'जोखिम-आधारित कार्य आदेश निर्माण, मरम्मत टीम असाइनमेंट, एवं पुनः निरीक्षण अनुरोध।' : 'Risk-based work order creation, repair team assignment, repair evidence, and reinspection requests.'}
            </p>
          </div>
          <Link to="/manager/dashboard" className="text-xs font-bold text-amber-800 flex items-center space-x-1 hover:underline">
            <span>{language === 'HI' ? 'रखरखाव प्रबंधक डैशबोर्ड देखें' : 'Access Maintenance Manager Dashboard'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

