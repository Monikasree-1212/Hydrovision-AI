import React, { useEffect, useState } from 'react';
import { Dam, RiskAssessment } from '../types';
import { DamService, RiskService } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { ShieldAlert, Info, AlertTriangle, RefreshCw } from 'lucide-react';

export const RiskPage: React.FC = () => {
  const [dams, setDams] = useState<Dam[]>([]);
  const [selectedDamId, setSelectedDamId] = useState<number | null>(null);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRiskData = async () => {
    setLoading(true);
    try {
      const data = await DamService.getDams();
      setDams(data);
      if (data.length > 0 && !selectedDamId) setSelectedDamId(data[0].id);

      const targetId = selectedDamId || (data.length > 0 ? data[0].id : null);
      if (targetId) {
        const res = await RiskService.calculateRisk(targetId);
        setRisk(res);
      }
    } catch (err) {
      console.error(err);
      setRisk(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, [selectedDamId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Explainable Risk & Structural Safety Engine"
        description="0–100 Dam Risk Index computed from defect severity, structural zone criticality, water seepage flow, and defect recurrence patterns."
        category="MODULE 12 — RISK ASSESSMENT"
        breadcrumbs={[{ name: 'Dashboard', path: '/' }, { name: 'Risk Assessment' }]}
        actions={
          <button
            onClick={fetchRiskData}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recalculate Risk</span>
          </button>
        }
      />

      {/* Dam Selection */}
      <div className="bg-white p-4 rounded-lg border border-govt-border shadow-sm flex items-center space-x-3">
        <label className="text-sm font-semibold text-slate-700">Select Dam Structure:</label>
        <select
          value={selectedDamId || ''}
          onChange={(e) => setSelectedDamId(Number(e.target.value))}
          className="px-3 py-2 border border-govt-border rounded-md text-sm outline-none focus:border-govt-blue bg-white min-w-[240px]"
        >
          {dams.map((d) => (
            <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-slate-500 font-medium">Computing dam safety risk index...</div>
      ) : !risk ? (
        <EmptyState
          title="Risk calculation unavailable"
          description="Insufficient verified inspection evidence. Complete a verified drone inspection cycle to compute dam risk score."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Risk Score Card */}
          <div className="bg-white p-6 rounded-lg border border-govt-border shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                DAM RISK INDEX SCORE
              </div>
              <div className="text-4xl font-extrabold text-govt-navy mt-2">
                {risk.risk_score.toFixed(1)} <span className="text-base font-normal text-slate-400">/ 100</span>
              </div>
              <div className={`mt-3 inline-block text-xs font-bold px-3 py-1 rounded border ${
                risk.risk_level === 'CRITICAL' ? 'bg-rose-100 text-rose-900 border-rose-300' :
                risk.risk_level === 'HIGH' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                'bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}>
                RISK LEVEL: {risk.risk_level}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 text-xs text-slate-600">
              Condition Rating: <strong className="text-slate-800">{risk.condition_rating}</strong> (Index: {risk.condition_index})
            </div>
          </div>

          {/* Contributing Factors */}
          <div className="md:col-span-2 bg-white p-6 rounded-lg border border-govt-border shadow-sm space-y-4">
            <h2 className="text-base font-bold text-govt-navy uppercase tracking-wider border-b border-govt-border pb-3 flex items-center space-x-2">
              <Info className="w-4 h-4 text-govt-blue" />
              <span>Transparent Risk Factors & Contributing Evidence</span>
            </h2>

            {!risk.contributing_factors || risk.contributing_factors.length === 0 ? (
              <div className="text-xs text-slate-500 py-4">No risk factors identified. Dam structure is in safe condition.</div>
            ) : (
              <ul className="space-y-2 text-xs">
                {risk.contributing_factors.map((factor, idx) => (
                  <li key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span className="text-slate-800 font-medium">{factor}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-md text-xs text-slate-700 leading-relaxed">
              <strong>Government Policy Note:</strong> Risk scores are decision-support indicators for engineering assessment and do not substitute for official statutory dam safety certifications.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
