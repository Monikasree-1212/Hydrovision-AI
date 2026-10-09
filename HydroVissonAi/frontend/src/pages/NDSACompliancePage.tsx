import React, { useEffect, useState } from 'react';
import { DamService, NDSAService } from '../services/api';
import { Dam } from '../types';
import { PageHeader } from '../components/layout/PageHeader';
import { Award, CheckCircle2, AlertTriangle, FileText, Download, Plus, ShieldCheck, RefreshCw } from 'lucide-react';

export const NDSACompliancePage: React.FC = () => {
  const [dams, setDams] = useState<Dam[]>([]);
  const [selectedDamId, setSelectedDamId] = useState<number>(1);
  const [scorecard, setScorecard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchScorecard = async () => {
    setLoading(true);
    try {
      const res = await NDSAService.getScorecard(selectedDamId);
      setScorecard(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    DamService.getDams().then((damList) => {
      setDams(damList);
      if (damList.length > 0) setSelectedDamId(damList[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedDamId) fetchScorecard();
  }, [selectedDamId]);

  const handleGenerateCert = async () => {
    setGenerating(true);
    try {
      const res = await NDSAService.generateCertificate(selectedDamId);
      alert(`NDSA Compliance Certificate Issued Successfully: ${res.certificate_code}`);
      await NDSAService.downloadCertificate(res.certificate_code);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Certificate generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="NDSA Structural Audit & Dam Safety Act 2021 Compliance"
        description="Official National Dam Safety Authority (NDSA) compliance scorecards, statutory inspection checklists, and annual health certificate issuance."
        category="MODULE 20 — NDSA AUDIT & COMPLIANCE"
        breadcrumbs={[{ name: 'Dashboard', path: '/' }, { name: 'NDSA Audit' }]}
        actions={
          <button
            onClick={handleGenerateCert}
            disabled={generating || !selectedDamId}
            className="flex items-center space-x-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-4 py-2 rounded transition shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{generating ? 'Generating PDF...' : 'Issue NDSA Compliance Certificate'}</span>
          </button>
        }
      />

      {/* Select Dam Dropdown */}
      <div className="bg-white p-4 rounded-lg border border-govt-border shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <label className="text-sm font-semibold text-slate-700">Select Dam Structure:</label>
          <select
            value={selectedDamId}
            onChange={(e) => setSelectedDamId(Number(e.target.value))}
            className="px-3 py-2 border border-govt-border rounded-md text-sm font-medium focus:border-govt-blue bg-white min-w-[280px]"
          >
            {dams.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
        </div>

        {scorecard && (
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold text-slate-500">Statutory Score:</span>
            <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono font-bold px-3 py-1 rounded text-sm">
              {scorecard.overall_health_score} / 100 ({scorecard.audit_grade})
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 text-sm font-medium">Loading NDSA Audit Checklist & Statutory Scorecard...</div>
      ) : scorecard ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Statutory Checklist */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-govt-border p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-govt-navy uppercase tracking-wider flex items-center gap-2 border-b border-govt-border pb-3">
              <Award className="w-5 h-5 text-govt-blue" />
              <span>Dam Safety Act 2021 — Statutory Audit Checklist ({scorecard.inspection_cycle})</span>
            </h3>

            <div className="divide-y divide-govt-border">
              {scorecard.compliance_items.map((item: any) => (
                <div key={item.item} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{item.item}</div>
                    <div className="text-xs text-slate-500 font-mono">{scorecard.act_reference} — {item.clause}</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${item.status === 'PASSED' || item.status === 'COMPLIANT' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                    ✓ {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Col: NDSA Health Certificate Preview */}
          <div className="bg-slate-900 text-white rounded-lg border border-slate-800 p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>NDSA Certificate Status</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Dam Name</span>
                <span className="font-bold text-white">{scorecard.dam_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Recorded Defects</span>
                <span className="font-mono text-amber-400 font-bold">{scorecard.total_defects} Total ({scorecard.critical_defects} Critical)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Safety Class</span>
                <span className="font-mono text-emerald-400 font-bold">{scorecard.audit_grade}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleGenerateCert}
                disabled={generating}
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2.5 rounded text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-lg disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{generating ? 'Issuing PDF...' : 'Download Certified PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
