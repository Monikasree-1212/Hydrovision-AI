import React, { useEffect, useState } from 'react';
import { Inspection, Dam } from '../types';
import { InspectionService, DamService } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { ClipboardCheck, Plus, ArrowRight, X, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const InspectionsPage: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [dams, setDams] = useState<Dam[]>([]);
  const [selectedDam, setSelectedDam] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { role } = useAuth();

  // Modal Form State
  const [damId, setDamId] = useState<number | ''>('');
  const [inspType, setInspType] = useState('DRONE_VISUAL');
  const [weather, setWeather] = useState('Clear sky, wind < 10 km/h');
  const [creating, setCreating] = useState(false);

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const damIdNum = selectedDam ? parseInt(selectedDam, 10) : undefined;
      const data = await InspectionService.getInspections(damIdNum);
      setInspections(data);
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
    fetchInspections();
  }, [selectedDam]);

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!damId) return;
    setCreating(true);
    try {
      await InspectionService.createInspection({
        dam_id: Number(damId),
        inspection_type: inspType,
        weather_conditions: weather
      });
      setIsModalOpen(false);
      setDamId('');
      fetchInspections();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create inspection.');
    } finally {
      setCreating(false);
    }
  };

  const canCreate = role === 'DAM_OPERATOR' || role === 'INSPECTION_ENGINEER';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drone Inspection Management Workspace"
        description="Schedule drone visual surveys, upload aerial datasets, run YOLO11 AI defect analysis, verify findings, and track inspection lifecycle progress."
        category="MODULE 03 — INSPECTION MANAGEMENT"
        breadcrumbs={[{ name: 'Dashboard', path: '/' }, { name: 'Inspections' }]}
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchInspections}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            {canCreate && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-1.5 bg-govt-blue hover:bg-blue-900 text-white font-bold text-xs px-4 py-2 rounded transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Inspection</span>
              </button>
            )}
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-govt-border shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <label className="text-sm font-semibold text-slate-700">Filter Dam Structure:</label>
          <select
            value={selectedDam}
            onChange={(e) => setSelectedDam(e.target.value)}
            className="px-3 py-2 border border-govt-border rounded-md text-sm outline-none focus:border-govt-blue bg-white min-w-[240px]"
          >
            <option value="">All Monitored Dams</option>
            {dams.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-slate-500 font-medium">Loading inspection database records...</div>
      ) : inspections.length === 0 ? (
        <EmptyState
          title="No inspection records available"
          description="No inspection records have been created for this dam yet. Create an inspection to begin the inspection workflow."
          actionLabel={canCreate ? "Schedule New Inspection" : undefined}
          onAction={canCreate ? () => setIsModalOpen(true) : undefined}
        />
      ) : (
        <div className="bg-white rounded-lg border border-govt-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 text-govt-navy font-bold uppercase text-xs border-b border-govt-border">
                <tr>
                  <th className="p-3.5">Inspection Code</th>
                  <th className="p-3.5">Dam Structure</th>
                  <th className="p-3.5">Method</th>
                  <th className="p-3.5">Inspection Date</th>
                  <th className="p-3.5">Coverage</th>
                  <th className="p-3.5">Lifecycle Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-govt-border">
                {inspections.map((insp) => (
                  <tr key={insp.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-bold text-govt-navy">{insp.inspection_code}</td>
                    <td className="p-3.5 font-medium text-slate-800">{insp.dam_name || 'Dam'}</td>
                    <td className="p-3.5 text-slate-700 font-medium">{insp.inspection_type}</td>
                    <td className="p-3.5 text-slate-600 text-xs">{new Date(insp.inspection_date).toLocaleDateString()}</td>
                    <td className="p-3.5 font-semibold text-slate-700">{insp.coverage_percentage}%</td>
                    <td className="p-3.5">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded border ${
                        insp.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                        insp.status === 'ENGINEER_REVIEW' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                        'bg-sky-100 text-sky-900 border-sky-300'
                      }`}>
                        {insp.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        to={`/inspections/${insp.id}`}
                        className="text-xs font-bold text-govt-blue hover:underline inline-flex items-center space-x-1"
                      >
                        <span>Open Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedule Inspection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-govt-border max-w-md w-full p-6 shadow-xl relative space-y-4">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-govt-navy border-b border-govt-border pb-3 uppercase">
              Schedule Drone Inspection Survey
            </h2>

            <form onSubmit={handleCreateInspection} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Dam</label>
                <select
                  required
                  value={damId}
                  onChange={(e) => setDamId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue bg-white"
                >
                  <option value="">Select Dam Structure...</option>
                  {dams.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Inspection Method</label>
                <select
                  value={inspType}
                  onChange={(e) => setInspType(e.target.value)}
                  className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue bg-white"
                >
                  <option value="DRONE_VISUAL">Drone High-Res Visual Survey</option>
                  <option value="THERMAL_INFRARED">Drone Thermal Infrared Survey</option>
                  <option value="MULTISPECTRAL">Multispectral Structural Mapping</option>
                  <option value="REINSPECTION">Post-Repair Reinspection</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Weather & Flight Conditions</label>
                <input
                  type="text"
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                  className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue"
                />
              </div>

              <div className="pt-3 border-t border-govt-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-govt-border rounded text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-govt-navy hover:bg-govt-blue text-white font-bold rounded shadow-sm"
                >
                  {creating ? 'Scheduling...' : 'Create Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
