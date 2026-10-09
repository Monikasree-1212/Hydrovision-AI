import React, { useEffect, useState } from 'react';
import { Dam } from '../types';
import { DamService, PredictionService } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { TrendingUp, Database, RefreshCw } from 'lucide-react';

export const PredictionPage: React.FC = () => {
  const [dams, setDams] = useState<Dam[]>([]);
  const [selectedDamId, setSelectedDamId] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDams = async () => {
    try {
      const data = await DamService.getDams();
      setDams(data);
      if (data.length > 0 && !selectedDamId) setSelectedDamId(data[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDams();
  }, []);

  useEffect(() => {
    if (!selectedDamId) return;
    PredictionService.getPrediction(selectedDamId)
      .then(setPrediction)
      .catch(() => setPrediction(null));
  }, [selectedDamId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="XGBoost Predictive Maintenance & Deterioration Forecast"
        description="Multi-year structural deterioration trend modeling based on historical inspection cycles and empirical crack growth parameters."
        category="PREDICTIVE MAINTENANCE"
        breadcrumbs={[{ name: 'Dashboard', path: '/' }, { name: 'Predictive Analysis' }]}
        actions={
          <button
            onClick={fetchDams}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recalculate Forecast</span>
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
        <div className="text-center py-12 text-sm text-slate-500 font-medium">Evaluating predictive models...</div>
      ) : !prediction || !prediction.sufficient_history ? (
        <EmptyState
          title="Predictive analysis unavailable"
          description="Additional historical inspections are required before triggering XGBoost multi-year crack growth forecasts."
          icon={Database}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-govt-border shadow-sm space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase">Deterioration Forecast</div>
            <div className="text-xl font-bold text-govt-navy">{prediction.deterioration_trend}</div>
            <div className="text-sm text-slate-600">
              Est Growth Rate: <strong className="text-govt-navy">{prediction.predicted_defect_growth_mm_per_year} mm/year</strong>
            </div>
            <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-md text-xs text-emerald-900 font-bold">
              Maintenance Urgency: {prediction.urgency_level}
            </div>
          </div>

          <div className="md:col-span-2 bg-white p-6 rounded-lg border border-govt-border shadow-sm space-y-4">
            <h2 className="text-base font-bold text-govt-navy uppercase border-b border-govt-border pb-2">
              Forecast Influencing Factors
            </h2>
            <ul className="space-y-2 text-sm">
              {prediction.forecast_factors?.map((f: string, i: number) => (
                <li key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-md text-slate-700">
                  • {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
