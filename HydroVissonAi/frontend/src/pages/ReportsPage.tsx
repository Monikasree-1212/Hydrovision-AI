import React, { useEffect, useState } from 'react';
import { Report, Dam } from '../types';
import { ReportService, DamService } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { FileText, Download, Plus, RefreshCw, QrCode, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [dams, setDams] = useState<Dam[]>([]);
  const [selectedDam, setSelectedDam] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { language, t } = useLanguage();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await ReportService.getReports(selectedDam ? Number(selectedDam) : undefined);
      setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    DamService.getDams().then(setDams).catch(console.error);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [selectedDam]);

  const handleGenerateReport = async () => {
    if (!selectedDam) {
      alert("Please select a target dam to generate report.");
      return;
    }
    setGenerating(true);
    try {
      const rep = await ReportService.generateReport(Number(selectedDam));
      alert(`System-Generated Inspection Report generated successfully with Verification QR: ${rep.report_code}`);
      fetchReports();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Report generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async (repId: number, repCode: string) => {
    try {
      await ReportService.downloadReport(repId, repCode);
    } catch (err: any) {
      console.error('Download failed:', err);
      alert(err.response?.data?.detail || 'Failed to download report.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title={language === 'HI' ? 'प्रणाली द्वारा जनरेट की गई निरीक्षण रिपोर्ट्स (क्यूआर कोड सहित)' : 'System-Generated Inspection Reports with Dynamic QR Verification'}
        description={language === 'HI' ? 'डेटाबेस रिकॉर्ड्स, ड्रोन इमेजरी, एआई विसंगतियों और 3डी ट्विन मेट्रिक्स से निर्मित पीडीएफ रिपोर्ट्स। प्रत्येक पीडीएफ में वैधानिक क्यूआर कोड शामिल है।' : 'Comprehensive automated PDF report generation with dynamic QR verification codes embedded in ReportLab headers and sign-off blocks.'}
        category={language === 'HI' ? 'मॉड्यूल 16 — रिपोर्ट्स' : 'MODULE 16 — REPORTS'}
        breadcrumbs={[{ name: language === 'HI' ? 'डैशबोर्ड' : 'Dashboard', path: '/' }, { name: language === 'HI' ? 'रिपोर्ट्स' : 'Reports' }]}
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchReports}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === 'HI' ? 'रीफ्रेश' : 'Refresh'}</span>
            </button>
            <button
              onClick={handleGenerateReport}
              disabled={generating || !selectedDam}
              className="flex items-center space-x-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-4 py-2 rounded transition shadow-sm disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{generating ? (language === 'HI' ? 'पीडीएफ बन रहा है...' : 'Generating PDF...') : (language === 'HI' ? 'क्यूआर युक्त निरीक्षण रिपोर्ट बनाएं' : 'Generate Inspection Report with QR')}</span>
            </button>
          </div>
        }
      />

      {/* Target Dam Filter */}
      <div className="bg-white p-4 rounded-lg border border-govt-border shadow-sm flex items-center space-x-3">
        <label className="text-sm font-semibold text-slate-700">{language === 'HI' ? 'बाँध संरचना चुनें:' : 'Select Dam Structure:'}</label>
        <select
          value={selectedDam}
          onChange={(e) => setSelectedDam(e.target.value ? Number(e.target.value) : '')}
          className="px-3 py-2 border border-govt-border rounded-md text-sm outline-none focus:border-govt-blue bg-white min-w-[240px]"
        >
          <option value="">{language === 'HI' ? 'सभी निगरानीधीन बाँध' : 'All Monitored Dams'}</option>
          {dams.map((d) => (
            <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-slate-500 font-medium">Loading generated report registry...</div>
      ) : reports.length === 0 ? (
        <EmptyState
          title={language === 'HI' ? 'कोई रिपोर्ट उपलब्ध नहीं है' : 'No inspection reports generated'}
          description={language === 'HI' ? 'बाँध का चयन करें और क्यूआर कोड युक्त पीडीएफ रिपोर्ट जनरेट करें।' : 'Select a dam structure and click "Generate Inspection Report" to produce a System-Generated Inspection Report.'}
        />
      ) : (
        <div className="bg-white rounded-lg border border-govt-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 text-govt-navy font-bold uppercase text-xs border-b border-govt-border">
                <tr>
                  <th className="p-3.5">Report Code</th>
                  <th className="p-3.5">Report Title</th>
                  <th className="p-3.5">Generated Timestamp</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-govt-border">
                {reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-bold text-govt-navy flex items-center space-x-1.5">
                      <QrCode className="w-4 h-4 text-govt-blue flex-shrink-0" />
                      <span>{rep.report_code}</span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">{rep.report_title}</td>
                    <td className="p-3.5 text-slate-600 text-xs">{new Date(rep.generated_at).toLocaleString()}</td>
                    <td className="p-3.5 text-right space-x-2">
                      <Link
                        to={`/verify-report?code=${rep.report_code}`}
                        className="bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold px-3 py-1.5 rounded inline-flex items-center space-x-1 uppercase tracking-wider"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{language === 'HI' ? 'क्यूआर सत्यापित करें' : 'Verify QR'}</span>
                      </Link>

                      <button
                        onClick={() => handleDownloadReport(rep.id, rep.report_code)}
                        className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-3 py-1.5 rounded inline-flex items-center space-x-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{t('download')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

