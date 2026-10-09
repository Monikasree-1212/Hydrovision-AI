import React, { useEffect, useState } from 'react';
import { DamService, EAPService } from '../services/api';
import { Dam } from '../types';
import { PageHeader } from '../components/layout/PageHeader';
import { FloodBreachSimulator } from '../components/simulation/FloodBreachSimulator';
import { Compass, AlertTriangle, ShieldAlert, Radio, CheckCircle, RefreshCw, Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const EAPPage: React.FC = () => {
  const [dams, setDams] = useState<Dam[]>([]);
  const [selectedDamId, setSelectedDamId] = useState<number>(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [eapLevel, setEapLevel] = useState<string>('LEVEL_2_ALERT');
  const [eapReason, setEapReason] = useState<string>('Heavy Catchment Monsoon Rainfall (68mm/24h)');
  const { language } = useLanguage();

  const fetchEAPData = async () => {
    setLoading(true);
    try {
      const res = await EAPService.getForecast(selectedDamId);
      setData(res);
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
    if (selectedDamId) fetchEAPData();
  }, [selectedDamId]);

  const handleTriggerEAP = async () => {
    if (!confirm(`Are you sure you want to activate ${eapLevel} for this dam?`)) return;
    setTriggering(true);
    try {
      const res = await EAPService.triggerEAP(selectedDamId, eapLevel, eapReason);
      alert(`EMERGENCY ACTION PLAN ACTIVATED!\nLevel: ${res.activated_eap_level}\nNotified Agencies: ${res.notified_agencies.join(', ')}`);
      fetchEAPData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'EAP activation failed.');
    } finally {
      setTriggering(false);
    }
  };

  const selectedDamObj = dams.find(d => d.id === selectedDamId);

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title={language === 'HI' ? 'मानसून बाढ़ पूर्वानुमान व आपातकालीन कार्य योजना (EAP)' : 'Monsoon Flood Forecasting & Emergency Action Plan (EAP)'}
        description={language === 'HI' ? 'पूर्वाभासी जलाशय प्रवाह पूर्वानुमान, स्वचालित स्पिलवे गेट शेड्यूल सिफारिशें और स्तर 1-3 आपातकालीन कमान केंद्र प्रसारण।' : 'Predictive reservoir inflow forecasting, automated spillway gate schedule recommendations, and Level 1-3 Emergency Command Center dispatch.'}
        category={language === 'HI' ? 'मॉड्यूल 18 — मानसून व ईएपी' : 'MODULE 18 — MONSOON & EAP'}
        breadcrumbs={[{ name: language === 'HI' ? 'डैशबोर्ड' : 'Dashboard', path: '/' }, { name: language === 'HI' ? 'मानसून व ईएपी' : 'Monsoon & EAP' }]}
        actions={
          <button
            onClick={fetchEAPData}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{language === 'HI' ? 'सिमुलेशन रीफ्रेश करें' : 'Refresh Simulation'}</span>
          </button>
        }
      />

      {/* Select Dam Dropdown */}
      <div className="bg-white p-4 rounded-lg border border-govt-border shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <label className="text-sm font-semibold text-slate-700">{language === 'HI' ? 'बाँध संरचना चुनें:' : 'Select Dam Structure:'}</label>
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

        {data && (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">{language === 'HI' ? 'सक्रिय प्रोटोकॉल:' : 'Active Protocol:'}</span>
            <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded text-xs font-bold font-mono">
              ● {data.current_eap_level}
            </span>
          </div>
        )}
      </div>

      {/* Interactive Hydraulic Discharge & Breach Simulator Module */}
      <FloodBreachSimulator
        damData={{
          damName: selectedDamObj?.name || 'BHAKRA NANGAL DAM',
          maxCapacityMcm: selectedDamObj?.storage_capacity_mcm || 9621,
          fullReservoirLevelM: selectedDamObj?.height_meters ? selectedDamObj.height_meters * 4.5 : 515.0,
          currentLevelM: selectedDamObj?.height_meters ? selectedDamObj.height_meters * 4.2 : 508.4,
          maxSpillwayCapacityCusecs: 140000,
          downstreamVillages: 42,
          downstreamPopulation: 185000
        }}
        onDispatchEAP={(level, reason) => {
          setEapLevel(level);
          setEapReason(reason);
          handleTriggerEAP();
        }}
      />

      {loading ? (
        <div className="text-center py-16 text-slate-500 text-sm font-medium">Running Hydro-Dynamic Monsoon Simulation...</div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Forecast & Recommended Gate Operations */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-govt-border shadow-sm p-5">
              <h3 className="text-sm font-bold text-govt-navy uppercase tracking-wider mb-3 flex items-center gap-2">
                <Compass className="w-4 h-4 text-govt-blue" />
                <span>Monsoon Hydro Inflow & Spillway Gate Schedule (+72h)</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-govt-navy font-bold uppercase border-b border-govt-border">
                    <tr>
                      <th className="p-3">Time Horizon</th>
                      <th className="p-3">Predicted Inflow</th>
                      <th className="p-3">Rec. Gate Openings</th>
                      <th className="p-3 text-right">Est. Spillway Release</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-govt-border">
                    {data.forecast.map((f: any) => (
                      <tr key={f.hour_offset} className="hover:bg-slate-50">
                        <td className="p-3 font-bold font-mono text-govt-navy">{f.hour_offset} ({f.predicted_timestamp.slice(11, 16)})</td>
                        <td className="p-3 font-mono font-bold text-blue-600">{f.predicted_inflow_m3s} m³/s</td>
                        <td className="p-3 font-mono font-bold text-amber-600">{f.recommended_gate_openings} Gates Fully Open</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">{f.estimated_spillway_release_m3s} m³/s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: EAP Activation Command Box */}
          <div className="bg-slate-900 text-white rounded-lg border border-slate-800 p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span>EAP Command Dispatch</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Select Emergency Level:</label>
                <select
                  value={eapLevel}
                  onChange={(e) => setEapLevel(e.target.value)}
                  className="w-full bg-slate-950 text-white border border-slate-700 rounded px-3 py-2 text-xs font-mono focus:border-amber-400 outline-none"
                >
                  <option value="LEVEL_1_WATCH">LEVEL-1 — WATCH (Monflow Advisory)</option>
                  <option value="LEVEL_2_ALERT">LEVEL-2 — ALERT (Gate Opening Alert)</option>
                  <option value="LEVEL_3_EMERGENCY">LEVEL-3 — EMERGENCY (Downstream Inundation)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Activation Reason:</label>
                <textarea
                  rows={3}
                  value={eapReason}
                  onChange={(e) => setEapReason(e.target.value)}
                  className="w-full bg-slate-950 text-white border border-slate-700 rounded p-2 text-xs font-mono focus:border-amber-400 outline-none"
                />
              </div>

              <button
                onClick={handleTriggerEAP}
                disabled={triggering}
                className="w-full bg-rose-700 hover:bg-rose-600 text-white font-bold py-2.5 rounded text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-lg disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{triggering ? 'Activating Protocol...' : 'Dispatch EAP Broadcast'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
