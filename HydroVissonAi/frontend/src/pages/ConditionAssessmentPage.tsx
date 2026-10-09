import React, { useEffect, useState } from 'react';
import { Dam, RiskAssessment } from '../types';
import { DamService, RiskService } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { Activity, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

export const ConditionAssessmentPage: React.FC = () => {
  const [dams, setDams] = useState<Dam[]>([]);
  const [selectedDamId, setSelectedDamId] = useState<number | null>(null);
  const [riskData, setRiskData] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  const fetchDamsAndCondition = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const damList = await DamService.getDams();
      setDams(damList);

      const targetId = selectedDamId || (damList.length > 0 ? damList[0].id : null);
      if (targetId) {
        setSelectedDamId(targetId);
        try {
          const res = await RiskService.calculateRisk(targetId);
          setRiskData(res);
        } catch (e: any) {
          setRiskData(null);
          setErrorState('Condition assessment unavailable. Insufficient verified inspection evidence.');
        }
      } else {
        setRiskData(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDamsAndCondition();
  }, [selectedDamId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dam Structural Condition Assessment"
        description="Calculated structural health index derived strictly from verified drone inspection defects, zone criticality, and empirical crack severity."
        category="MODULE 11 — CONDITION ASSESSMENT"
        breadcrumbs={[{ name: 'Dashboard', path: '/' }, { name: 'Condition Assessment' }]}
        actions={
          <button
            onClick={fetchDamsAndCondition}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recalculate Condition</span>
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

      {/* Condition Assessment Display */}
      {loading ? (
        <div className="text-center py-12 text-sm text-slate-500 font-medium">Calculating structural condition index...</div>
      ) : errorState || !riskData ? (
        <EmptyState
          title="Condition assessment unavailable"
          description="Insufficient verified inspection evidence. Complete a verified drone visual inspection cycle to compute structural condition rating."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-govt-border shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-govt-navy flex items-center space-x-2 border-b border-govt-border pb-3">
              <Activity className="w-5 h-5 text-govt-blue" />
              <span>Calculated Condition Rating</span>
            </h2>

            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase">Condition Score Index</div>
                <div className="text-4xl font-extrabold text-govt-navy mt-1">
                  {riskData.condition_index.toFixed(1)} <span className="text-base font-normal text-slate-500">/ 100</span>
                </div>
              </div>
              <span className={`px-4 py-1.5 rounded text-sm font-bold border ${
                riskData.condition_rating === 'GOOD' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                riskData.condition_rating === 'WATCH' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                'bg-rose-100 text-rose-900 border-rose-300'
              }`}>
                {riskData.condition_rating}
              </span>
            </div>

            <div className="space-y-2 text-sm text-slate-700 leading-relaxed">
              <div className="font-bold text-slate-800">Methodology Basis:</div>
              <p className="text-xs text-slate-600">
                Condition Score is dynamically aggregated from verified defect density, crack width measurements, water seepage flow, and spillway zone criticality.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-govt-border shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-govt-navy border-b border-govt-border pb-3">
              Structural Evidence Factors
            </h2>
            <div className="space-y-3">
              {riskData.contributing_factors && riskData.contributing_factors.length > 0 ? (
                riskData.contributing_factors.map((factor, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-govt-blue shrink-0" />
                    <span>{factor}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 py-4">No critical structural defect factors flagged.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
