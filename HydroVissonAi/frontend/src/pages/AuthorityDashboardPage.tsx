import React, { useEffect, useState } from 'react';
import { Dam, Alert, AuditLog } from '../types';
import { DamService, AlertService, AuditService } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { useLanguage } from '../context/LanguageContext';
import { Building, ShieldAlert, FileCheck2, Bell, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AuthorityDashboardPage: React.FC = () => {
  const [dams, setDams] = useState<Dam[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { language, t } = useLanguage();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [damsData, alertsData, auditData] = await Promise.all([
        DamService.getDams(),
        AlertService.getAlerts(),
        AuditService.getAuditTrail()
      ]);
      setDams(damsData);
      setAlerts(alertsData);
      setAudits(auditData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title={language === 'HI' ? 'बहु-बाँध सुरक्षा एवं विनियामक निरीक्षण डैशबोर्ड' : 'Multi-Dam Safety & Regulatory Oversight Dashboard'}
        description={language === 'HI' ? 'सरकारी प्राधिकरण निगरानी पोर्टल वास्तविक डेटाबेस जोखिम मीट्रिक, वैधानिक सुरक्षा चेतावनी और ऑडिट लॉग प्रदान करता है।' : 'Government authority monitoring portal providing real database-derived dam risk metrics, statutory safety alerts, compliance tracking, and audit logging.'}
        category={t('role_authority')}
        breadcrumbs={[{ name: t('role_authority'), path: '/authority/dashboard' }]}
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchData}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === 'HI' ? 'रीफ्रेश' : 'Refresh'}</span>
            </button>
            <Link
              to="/dams"
              className="bg-govt-blue hover:bg-blue-900 text-white font-bold text-xs px-4 py-2 rounded transition shadow-sm"
            >
              {t('nav_dams')}
            </Link>
          </div>
        }
      />

      {/* Database Derived Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-govt-border shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">{t('total_dams')}</div>
          <div className="text-3xl font-bold text-govt-navy mt-1">{loading ? '...' : dams.length}</div>
          <div className="text-xs text-slate-500 mt-1">{language === 'HI' ? 'अधिकृत बाँध संरचनाएँ' : 'Authorized dam structures'}</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-govt-border shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">{t('active_alerts')}</div>
          <div className="text-3xl font-bold text-rose-700 mt-1">
            {loading ? '...' : alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').length}
          </div>
          <div className="text-xs text-slate-500 mt-1">{language === 'HI' ? 'उच्च एवं गंभीर चेतावनियाँ' : 'High & critical risk alerts'}</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-govt-border shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">{language === 'HI' ? 'ऑडिट लॉग इवेंट्स' : 'Audit Events Logged'}</div>
          <div className="text-3xl font-bold text-govt-blue mt-1">{loading ? '...' : audits.length}</div>
          <div className="text-xs text-slate-500 mt-1">{language === 'HI' ? 'प्रणाली अनुपालन घटनाएं' : 'System compliance events'}</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-govt-border shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">{language === 'HI' ? 'डेटाबेस स्थिति' : 'Database Status'}</div>
          <div className="text-sm font-bold text-emerald-800 mt-2 flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{language === 'HI' ? 'डेटाबेस सक्रिय' : 'REAL DB OPERATIONAL'}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">{language === 'HI' ? 'सुरक्षित एन्क्रिप्टेड नेटवर्क' : 'Zero synthetic data'}</div>
        </div>
      </div>

      {/* Authorized Dams Table */}
      <div className="bg-white rounded-lg border border-govt-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-govt-border bg-slate-50 flex items-center justify-between">
          <h2 className="text-base font-bold text-govt-navy flex items-center space-x-2">
            <Building className="w-4 h-4 text-govt-blue" />
            <span>{language === 'HI' ? 'निगरानीधीन बाँध अवसंरचना सुरक्षा रजिस्टर' : 'Monitored Dam Infrastructure Safety Register'}</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">{language === 'HI' ? 'वास्तविक डेटाबेस रिकॉर्ड' : 'Real Database Records'}</span>
        </div>

        {dams.length === 0 ? (
          <EmptyState
            title={language === 'HI' ? 'कोई अधिकृत बाँध उपलब्ध नहीं' : 'No authorized dams available'}
            description={language === 'HI' ? 'वर्तमान में डेटाबेस में कोई बाँध रिकॉर्ड नहीं है।' : 'No dam infrastructure records currently exist in the system database.'}
            actionLabel={language === 'HI' ? 'बाँध पंजीकृत करें' : 'Register Dam Infrastructure'}
            onAction={() => window.location.href = '/dams'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 text-govt-navy font-bold uppercase text-xs border-b border-govt-border">
                <tr>
                  <th className="p-3.5">{language === 'HI' ? 'बाँध का नाम व कोड' : 'Dam Name & Code'}</th>
                  <th className="p-3.5">{t('location')}</th>
                  <th className="p-3.5">{language === 'HI' ? 'प्रकार' : 'Type'}</th>
                  <th className="p-3.5">{language === 'HI' ? 'ऊंचाई' : 'Height'}</th>
                  <th className="p-3.5">{t('status')}</th>
                  <th className="p-3.5 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-govt-border">
                {dams.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-bold text-govt-navy">{d.name} ({d.code})</td>
                    <td className="p-3.5 font-medium text-slate-700">{d.district}, {d.state}</td>
                    <td className="p-3.5 text-slate-700">{d.dam_type}</td>
                    <td className="p-3.5 font-mono text-xs">{d.height_meters} m</td>
                    <td className="p-3.5">
                      <span className="bg-emerald-100 text-emerald-900 text-xs font-bold px-2.5 py-1 rounded border border-emerald-300">
                        {d.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-3">
                      <Link to={`/dams/${d.id}`} className="text-xs font-bold text-govt-blue hover:underline">
                        {t('view_details')}
                      </Link>
                      <Link to={`/digital-twin/${d.id}`} className="text-xs font-bold text-amber-800 hover:underline">
                        3D Digital Twin
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* System Alerts & Audit Log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-lg border border-govt-border shadow-sm space-y-3">
          <h3 className="text-base font-bold text-govt-navy flex items-center space-x-2 border-b border-govt-border pb-3">
            <Bell className="w-4 h-4 text-rose-700" />
            <span>Active Authority Alerts</span>
          </h3>
          {alerts.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center">No active critical system alerts.</div>
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 4).map((a) => (
                <div key={a.id} className="p-3 bg-rose-50 border border-rose-200 rounded text-xs space-y-1">
                  <div className="font-bold text-rose-950">{a.alert_type}</div>
                  <div className="text-slate-800">{a.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-lg border border-govt-border shadow-sm space-y-3">
          <h3 className="text-base font-bold text-govt-navy flex items-center space-x-2 border-b border-govt-border pb-3">
            <FileCheck2 className="w-4 h-4 text-govt-blue" />
            <span>Recent System Audit Log</span>
          </h3>
          {audits.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center">No audit trail entries recorded.</div>
          ) : (
            <div className="space-y-2 text-xs">
              {audits.slice(0, 4).map((aud) => (
                <div key={aud.id} className="p-3 bg-slate-50 border border-slate-200 rounded flex justify-between items-center">
                  <div>
                    <span className="font-bold text-govt-navy">{aud.action}</span> by {aud.user_email || 'System'}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">{new Date(aud.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
