import React, { useEffect, useState } from 'react';
import { DamService, TelemetryService } from '../services/api';
import { Dam } from '../types';
import { PageHeader } from '../components/layout/PageHeader';
import { Radio, RefreshCw, AlertTriangle, Activity, Waves, ArrowUpRight, Gauge, Zap } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const TelemetryPage: React.FC = () => {
  const [dams, setDams] = useState<Dam[]>([]);
  const [selectedDamId, setSelectedDamId] = useState<number>(1);
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTelemetryData = async () => {
    setLoading(true);
    try {
      const [live, hist] = await Promise.all([
        TelemetryService.getLiveTelemetry(selectedDamId),
        TelemetryService.getTelemetryHistory(selectedDamId),
      ]);
      setData(live);
      setHistory(hist.history || []);
    } catch (err) {
      console.error('Failed to load telemetry:', err);
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
    if (selectedDamId) fetchTelemetryData();
  }, [selectedDamId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Real-Time Hydro Sensor & IoT Telemetry Layer"
        description="Continuous live monitoring of reservoir levels, inflow/outflow hydro-rates, foundation seepage sensors, and piezometer uplift pressures."
        category="MODULE 17 — IOT TELEMETRY"
        breadcrumbs={[{ name: 'Dashboard', path: '/' }, { name: 'IoT Telemetry' }]}
        actions={
          <button
            onClick={fetchTelemetryData}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Live Stream Refresh</span>
          </button>
        }
      />

      {/* Select Dam Dropdown */}
      <div className="bg-white p-4 rounded-lg border border-govt-border shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <label className="text-sm font-semibold text-slate-700">Target Dam Structure:</label>
          <select
            value={selectedDamId}
            onChange={(e) => setSelectedDamId(Number(e.target.value))}
            className="px-3 py-2 border border-govt-border rounded-md text-sm font-medium focus:border-govt-blue bg-white min-w-[280px]"
          >
            {dams.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.code}) — {d.state}</option>
            ))}
          </select>
        </div>

        {data && (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">Sensor Status:</span>
            <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${data.overall_sensor_status === 'NORMAL' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'}`}>
              ● {data.overall_sensor_status}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 text-sm font-medium flex flex-col items-center justify-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-govt-blue" />
          <span>Polling Live Hydro Sensors & IoT Gateway...</span>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Key Metric Gauge Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 text-white p-4 rounded-lg border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                <span>Reservoir Level</span>
                <Waves className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-blue-400">
                {data.current_water_level_meters} <span className="text-sm font-normal text-slate-300">m</span>
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                <span>FRL: {data.frl_meters}m</span>
                <span className="text-emerald-400 font-bold">{data.water_level_percentage}% Capacity</span>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-lg border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                <span>Inflow Rate</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-emerald-400">
                {data.inflow_m3s} <span className="text-sm font-normal text-slate-300">m³/s</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                Catchment Runoff: Stable
              </div>
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-lg border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                <span>Seepage Gauge</span>
                <Activity className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-amber-400">
                {data.seepage_rate_lmin} <span className="text-sm font-normal text-slate-300">L/min</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                Safety Threshold: &lt; 25.0 L/min
              </div>
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-lg border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                <span>Piezometer Uplift</span>
                <Gauge className="w-4 h-4 text-sky-400" />
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-sky-400">
                {data.piezometric_pressure_kpa} <span className="text-sm font-normal text-slate-300">kPa</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                Seismic Accel: {data.seismic_acceleration_g} g
              </div>
            </div>
          </div>

          {/* Historical Trend Chart */}
          <div className="bg-white p-5 rounded-lg border border-govt-border shadow-sm">
            <h3 className="text-sm font-bold text-govt-navy uppercase mb-4 tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-govt-blue" />
              <span>24-Hour Telemetry Trend (Reservoir Level & Inflow)</span>
            </h3>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="timestamp" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="water_level" name="Water Level (m)" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="inflow" name="Inflow (m³/s)" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
