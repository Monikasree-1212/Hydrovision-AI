import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ShieldCheck, AlertTriangle, Building, FileCheck2, 
  MapPin, Box, ArrowRight, ShieldAlert, CheckCircle2, Lock, ExternalLink, RefreshCw,
  Calendar, Wrench, FileSpreadsheet, CheckSquare, Award, Clock
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const ReportVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const reportCode = searchParams.get('code') || 'REP-HV-BHK-TEST-01';
  const { language, t } = useLanguage();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'works'>('overview');

  const verifyReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const host = window.location.hostname || 'localhost';
      const res = await axios.get(`http://${host}:8000/api/v1/reports/verify-data/${reportCode}`);
      setData(res.data);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'ERR_NETWORK' || !err.response) {
        setError(language === 'HI' ? 'सर्वर से संपर्क नहीं हो सका (Backend Offline)। कृपया बैकएंड सर्वर पोर्ट 8000 चालू रखें।' : 'Backend Service Unreachable. Please ensure the backend server is running on port 8000.');
      } else {
        setError(language === 'HI' ? 'सरकारी सत्यापन विफल। इस रिपोर्ट का रिकॉर्ड डेटाबेस में नहीं मिला।' : 'Report Verification Failed. Record not found in government database.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyReport();
  }, [reportCode]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center selection:bg-amber-500 selection:text-slate-950">
      
      {/* Top Government Seal & Header */}
      <div className="text-center max-w-3xl mb-6">
        <div className="flex items-center justify-center space-x-4 mb-3">
          <div className="relative inline-block">
            <div className="absolute -inset-2 bg-amber-500/20 rounded-full blur-md" />
            <img 
              src="/assets/gov_emblem.jpg" 
              alt="Government of India Emblem" 
              className="relative w-16 h-16 rounded-full mx-auto border-2 border-amber-400 object-cover shadow-2xl"
              onError={(e: any) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-sky-400 bg-sky-950/80 flex items-center justify-center text-[9px] font-black text-amber-400 text-center leading-tight shadow-xl">
            NDSA<br/>CWC
          </div>
        </div>

        <div className="text-xs font-black text-amber-400 uppercase tracking-widest">
          {language === 'HI' ? 'भारत सरकार • जल शक्ति मंत्रालय • राष्ट्रीय बाँध सुरक्षा प्राधिकरण' : 'GOVERNMENT OF INDIA • MINISTRY OF JAL SHAKTI • NATIONAL DAM SAFETY AUTHORITY'}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mt-1 font-serif">
          {language === 'HI' ? 'वैधानिक रिपोर्ट क्यूआर ऑनलाइन सत्यापन पोर्टल' : 'STATUTORY REPORT QR VERIFICATION PORTAL'}
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          {language === 'HI' ? 'राष्ट्रीय बाँध अवसंरचना सुरक्षा व निरीक्षण रजिस्ट्री' : 'National Dam Infrastructure Safety Audit & Verification Registry'}
        </p>
      </div>

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl text-center space-y-4 max-w-md w-full">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
          <div className="text-sm font-semibold text-slate-300 font-mono">
            {language === 'HI' ? 'राष्ट्रीय डेटाबेस से रिपोर्ट क्यूआर का सत्यापन हो रहा है...' : 'Authenticating Report Record against National Dam Database...'}
          </div>
        </div>
      ) : error ? (
        <div className="bg-rose-950/80 border-2 border-rose-600 p-6 rounded-2xl shadow-2xl text-center space-y-4 max-w-md w-full">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto animate-bounce" />
          <h2 className="text-lg font-bold text-rose-200 uppercase font-mono">
            {language === 'HI' ? 'सत्यापन विफल (INVALID RECORD)' : 'VERIFICATION FAILED'}
          </h2>
          <p className="text-xs text-rose-300 leading-relaxed font-mono">{error}</p>
          <div className="flex justify-center space-x-3 pt-2">
            <button 
              onClick={verifyReport} 
              className="inline-flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition font-mono"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === 'HI' ? 'पुनः प्रयास करें' : 'Retry Verification'}</span>
            </button>
            <Link to="/" className="inline-block bg-rose-800 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition font-mono">
              {t('nav_dashboard')}
            </Link>
          </div>
        </div>
      ) : data ? (
        <div className="w-full max-w-4xl bg-slate-900/90 border-2 border-emerald-500/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl space-y-6 p-6 sm:p-8">
          
          {/* Green Verified Certificate Badge Banner */}
          <div className="bg-emerald-950/90 border-2 border-emerald-500/70 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-emerald-500/20 border border-emerald-400/60 rounded-full text-emerald-400">
                <ShieldCheck className="w-8 h-8 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'HI' ? 'भारत सरकार द्वारा वैधानिक रूप से सत्यापित व प्रामाणिक' : 'STATUTORY REPORT VERIFIED & AUTHENTICATED BY GOVT OF INDIA'}</span>
                </div>
                <div className="text-sm sm:text-base font-bold text-white font-mono mt-0.5">
                  {data.report_code}
                </div>
              </div>
            </div>

            <div className="text-right font-mono">
              <div className="text-[10px] text-slate-400 uppercase">Dam Safety Act 2021</div>
              <div className="text-xs font-black text-emerald-400 bg-emerald-900/60 px-2.5 py-1 rounded border border-emerald-500/40">
                OFFICIAL RECORD MATCHED
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 space-x-4 text-xs font-bold font-mono">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 px-2 border-b-2 flex items-center space-x-2 transition ${
                activeTab === 'overview' 
                  ? 'border-amber-400 text-amber-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>{language === 'HI' ? 'रिपोर्ट एवं संपत्ति विवरण' : 'Report & Asset Details'}</span>
            </button>

            <button
              onClick={() => setActiveTab('visits')}
              className={`pb-3 px-2 border-b-2 flex items-center space-x-2 transition ${
                activeTab === 'visits' 
                  ? 'border-amber-400 text-amber-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>{language === 'HI' ? 'सरकारी क्षेत्र निरीक्षण (Field Visits)' : 'Government Field Visits'}</span>
            </button>

            <button
              onClick={() => setActiveTab('works')}
              className={`pb-3 px-2 border-b-2 flex items-center space-x-2 transition ${
                activeTab === 'works' 
                  ? 'border-amber-400 text-amber-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>{language === 'HI' ? 'स्वीकृत मरम्मत कार्य (Sanctioned Works)' : 'Sanctioned Works History'}</span>
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="text-[11px] font-extrabold text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center justify-between">
                    <span>{language === 'HI' ? 'बाँध अवसंरचना विवरण' : 'DAM INFRASTRUCTURE ASSET'}</span>
                    <Building className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('dam_name')}:</span>
                    <span className="font-bold text-white">{data.dam_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dam Asset Code:</span>
                    <span className="font-bold text-sky-400">{data.dam_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('location')}:</span>
                    <span className="font-bold text-slate-200">{data.district}, {data.state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Structure Type:</span>
                    <span className="font-bold text-slate-200">{data.dam_type} ({data.height_meters}m)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">GPS Coordinates:</span>
                    <span className="font-bold text-slate-300">{data.latitude}° N, {data.longitude}° E</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="text-[11px] font-extrabold text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center justify-between">
                    <span>{language === 'HI' ? 'विभाग एवं प्राधिकृत अधिकारी' : 'OFFICIAL DEPARTMENTS & AUTH'}</span>
                    <Award className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Issuing Ministry:</span>
                    <span className="font-bold text-emerald-400">{data.ministry}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Authority:</span>
                    <span className="font-bold text-white">{data.issuing_authority}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Inspecting Wing:</span>
                    <span className="font-bold text-slate-300">{data.inspecting_wing}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Certified Officer:</span>
                    <span className="font-bold text-slate-200">{data.certified_officer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Approval Authority:</span>
                    <span className="font-bold text-amber-400">{data.approving_officer}</span>
                  </div>
                </div>
              </div>

              {/* SHA-256 Checksum Hash */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5 font-mono">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span>SHA-256 PDF Cryptographic Authenticity Checksum</span>
                  </span>
                  <span className="text-emerald-400 text-[10px] bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded">
                    UNALTERED
                  </span>
                </div>
                <div className="text-xs text-emerald-400 break-all bg-slate-900 p-2.5 rounded border border-slate-800">
                  {data.sha256_checksum}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOVERNMENT FIELD VISITS */}
          {activeTab === 'visits' && (
            <div className="space-y-3 font-mono">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-slate-800">
                <span>{language === 'HI' ? 'सरकारी क्षेत्र निरीक्षण एवं ऑडिट लॉग' : 'Government Inspection Audits & Field Visits Log'}</span>
                <span className="text-amber-400">{data.field_visits?.length || 0} Visits Recorded</span>
              </div>

              {data.field_visits && data.field_visits.map((fv: any, idx: number) => (
                <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="bg-amber-950 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-700/50">
                        {fv.visit_id}
                      </span>
                      <h4 className="text-xs font-bold text-white">{fv.title}</h4>
                    </div>
                    <div className="flex items-center space-x-2 text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {fv.date}
                      </span>
                      <span className="bg-emerald-950 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-600/50">
                        {fv.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300">
                    <div>
                      <span className="text-slate-500">Conducted By:</span> {fv.conducted_by}
                    </div>
                    <div>
                      <span className="text-slate-500">Lead Officer:</span> <span className="text-amber-300">{fv.lead_officer}</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 bg-slate-900 p-2 rounded border border-slate-850">
                    <span className="text-slate-300 font-bold">Findings:</span> {fv.findings}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: SANCTIONED WORKS HISTORY */}
          {activeTab === 'works' && (
            <div className="space-y-3 font-mono">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-slate-800">
                <span>{language === 'HI' ? 'स्वीकृत सरकारी मरम्मत एवं अवसंरचना कार्य' : 'Government Sanctioned Repairs & Works Log'}</span>
                <span className="text-sky-400">{data.sanctioned_works?.length || 0} Sanction Orders</span>
              </div>

              {data.sanctioned_works && data.sanctioned_works.map((gw: any, idx: number) => (
                <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2">
                    <div>
                      <div className="text-[10px] text-slate-400">{gw.sanction_no}</div>
                      <h4 className="text-xs font-bold text-white">{gw.title}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-amber-400">{gw.budget}</div>
                      <span className="bg-sky-950 text-sky-400 text-[10px] font-bold px-2 py-0.5 rounded border border-sky-600/50">
                        {gw.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs flex justify-between text-slate-300">
                    <span>Department: <strong className="text-slate-200">{gw.department}</strong></span>
                    <span>Completion: <strong className="text-emerald-400">{gw.completion_date}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer Action Links */}
          <div className="border-t border-slate-800 pt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400 font-mono">
              {data.verification_notice}
            </div>

            <div className="flex items-center space-x-2 font-mono">
              <Link
                to={`/digital-twin/${data.dam_id}`}
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition shadow-lg uppercase tracking-wider"
              >
                <Box className="w-3.5 h-3.5 text-slate-950" />
                <span>3D Digital Twin</span>
              </Link>

              <Link
                to="/gis"
                className="bg-sky-700 hover:bg-sky-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition shadow-lg uppercase tracking-wider"
              >
                <MapPin className="w-3.5 h-3.5 text-white" />
                <span>GIS Map</span>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

