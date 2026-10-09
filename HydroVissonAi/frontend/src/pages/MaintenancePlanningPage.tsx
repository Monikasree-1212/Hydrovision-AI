import React, { useEffect, useState } from 'react';
import { Defect, Dam } from '../types';
import { DefectService, DamService, MaintenanceService } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { Wrench, CalendarClock, PlusCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export const MaintenancePlanningPage: React.FC = () => {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [dams, setDams] = useState<Dam[]>([]);
  const [selectedDamId, setSelectedDamId] = useState<number | ''>('');
  const [selectedDefectId, setSelectedDefectId] = useState<number | ''>('');
  const [priority, setPriority] = useState('HIGH');
  const [assignedTeam, setAssignedTeam] = useState('Civil Structural Repair Team Alpha');
  const [description, setDescription] = useState('');
  const [recommendedAction, setRecommendedAction] = useState('Polyurethane resin injection & epoxy sealing');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchPlanningData = async () => {
    setLoading(true);
    try {
      const [damsList, defectList] = await Promise.all([
        DamService.getDams(),
        DefectService.getDefects({ status: 'VERIFIED' })
      ]);
      setDams(damsList);
      setDefects(defectList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanningData();
  }, []);

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDamId || !selectedDefectId || !description) return;

    setSubmitting(true);
    try {
      await MaintenanceService.createWorkOrder({
        dam_id: Number(selectedDamId),
        defect_id: Number(selectedDefectId),
        priority,
        assigned_team: assignedTeam,
        description,
        recommended_action: recommendedAction
      });
      alert('Maintenance Work Order dispatched successfully.');
      setSelectedDefectId('');
      setDescription('');
      fetchPlanningData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create work order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance Planning & Work Order Dispatch"
        description="Transform verified structural defect findings into actionable maintenance work orders, assign engineering repair units, and specify recommended repair procedures."
        category="MODULE 13 — MAINTENANCE PLANNING"
        breadcrumbs={[{ name: 'Dashboard', path: '/' }, { name: 'Maintenance Planning' }]}
        actions={
          <button
            onClick={fetchPlanningData}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Planning List</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Work Order Form */}
        <div className="lg:col-span-1 bg-white p-5 rounded-lg border border-govt-border shadow-sm space-y-4">
          <h2 className="text-base font-bold text-govt-navy flex items-center space-x-2 border-b border-govt-border pb-3">
            <PlusCircle className="w-5 h-5 text-govt-blue" />
            <span>Dispatch Work Order</span>
          </h2>

          <form onSubmit={handleCreateWorkOrder} className="space-y-4 text-sm">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Dam</label>
              <select
                required
                value={selectedDamId}
                onChange={(e) => setSelectedDamId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-govt-border rounded-md outline-none focus:border-govt-blue bg-white"
              >
                <option value="">Select Dam Structure</option>
                {dams.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Verified Defect</label>
              <select
                required
                value={selectedDefectId}
                onChange={(e) => setSelectedDefectId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-govt-border rounded-md outline-none focus:border-govt-blue bg-white"
              >
                <option value="">Select Verified Defect</option>
                {defects.map((def) => (
                  <option key={def.id} value={def.id}>
                    {def.defect_code} — {def.defect_type} ({def.severity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Repair Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-govt-border rounded-md outline-none focus:border-govt-blue bg-white"
              >
                <option value="CRITICAL">CRITICAL — Immediate Action</option>
                <option value="HIGH">HIGH — Schedule within 7 Days</option>
                <option value="MEDIUM">MEDIUM — Standard Routine</option>
                <option value="LOW">LOW — Monitor & Maintain</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Repair Team</label>
              <input
                type="text"
                required
                value={assignedTeam}
                onChange={(e) => setAssignedTeam(e.target.value)}
                className="w-full px-3 py-2 border border-govt-border rounded-md outline-none focus:border-govt-blue"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Recommended Action</label>
              <input
                type="text"
                required
                value={recommendedAction}
                onChange={(e) => setRecommendedAction(e.target.value)}
                className="w-full px-3 py-2 border border-govt-border rounded-md outline-none focus:border-govt-blue"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Work Order Description</label>
              <textarea
                rows={3}
                required
                placeholder="Enter scope of repair work..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-govt-border rounded-md outline-none focus:border-govt-blue"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-govt-blue hover:bg-blue-900 disabled:opacity-50 text-white font-bold rounded-md shadow-sm transition"
            >
              {submitting ? 'Dispatching Work Order...' : 'Dispatch Maintenance Work Order'}
            </button>
          </form>
        </div>

        {/* Verified Defects Requiring Planning */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-govt-border shadow-sm overflow-hidden p-5 space-y-4">
          <h2 className="text-base font-bold text-govt-navy flex items-center space-x-2 border-b border-govt-border pb-3">
            <Wrench className="w-5 h-5 text-amber-600" />
            <span>Verified Defects Requiring Work Order Dispatch ({defects.length})</span>
          </h2>

          {loading ? (
            <div className="text-center py-8 text-sm text-slate-500 font-medium">Loading verified defects...</div>
          ) : defects.length === 0 ? (
            <EmptyState
              title="No verified defects requiring work orders"
              description="All verified structural defects have already been assigned maintenance work orders or resolved."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-100 text-govt-navy font-bold uppercase text-xs border-b border-govt-border">
                  <tr>
                    <th className="p-3">Defect Code</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Crack Length</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-govt-border">
                  {defects.map((def) => (
                    <tr key={def.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-govt-navy">{def.defect_code}</td>
                      <td className="p-3 font-semibold text-slate-800">{def.defect_type}</td>
                      <td className="p-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                          def.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}>
                          {def.severity}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-xs">{def.estimated_length_mm || 0} mm</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedDamId(def.dam_id);
                            setSelectedDefectId(def.id);
                          }}
                          className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-3 py-1 rounded transition"
                        >
                          Select for Work Order
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
