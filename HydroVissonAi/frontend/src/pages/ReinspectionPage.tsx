import React, { useEffect, useState } from 'react';
import { WorkOrder } from '../types';
import { MaintenanceService } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, CheckCircle2, ShieldAlert, FileText } from 'lucide-react';

export const ReinspectionPage: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [findingsNotes, setFindingsNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { role } = useAuth();

  const fetchReinspections = async () => {
    setLoading(true);
    try {
      const list = await MaintenanceService.getWorkOrders();
      setWorkOrders(list.filter((wo) => wo.status === 'REINSPECTION_REQUIRED' || wo.status === 'REPAIR_COMPLETED'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReinspections();
  }, []);

  const handleRequestReinspectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWO) return;

    setSubmitting(true);
    try {
      await MaintenanceService.requestReinspection(selectedWO.id, findingsNotes);
      alert('Reinspection evaluation submitted successfully.');
      setSelectedWO(null);
      setFindingsNotes('');
      fetchReinspections();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit reinspection.');
    } finally {
      setSubmitting(false);
    }
  };

  const canReinspect = role === 'INSPECTION_ENGINEER';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reinspection & Post-Repair Verification"
        description="Engineering verification workflow inspecting completed maintenance repairs, evaluating epoxy injection integrity, documenting sign-off findings, and officially closing work orders."
        category="MODULE 17 — REINSPECTION"
        breadcrumbs={[{ name: 'Dashboard', path: '/' }, { name: 'Reinspection' }]}
        actions={
          <button
            onClick={fetchReinspections}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Reinspections</span>
          </button>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-sm text-slate-500 font-medium">Loading pending reinspection work orders...</div>
      ) : workOrders.length === 0 ? (
        <EmptyState
          title="No pending reinspection requests"
          description="There are currently no maintenance work orders requiring post-repair engineering reinspection."
        />
      ) : (
        <div className="bg-white rounded-lg border border-govt-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-govt-border bg-slate-50 flex items-center justify-between">
            <h2 className="text-base font-bold text-govt-navy flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-govt-blue" />
              <span>Pending Reinspection Queue ({workOrders.length})</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">Engineering Verification Sign-off</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 text-govt-navy font-bold uppercase text-xs border-b border-govt-border">
                <tr>
                  <th className="p-3.5">Work Order Code</th>
                  <th className="p-3.5">Assigned Team</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Repair Action</th>
                  <th className="p-3.5 text-right">Reinspection Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-govt-border">
                {workOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-bold text-govt-navy">{wo.work_order_code}</td>
                    <td className="p-3.5 font-medium text-slate-700">{wo.assigned_team}</td>
                    <td className="p-3.5 font-bold text-rose-800">{wo.priority}</td>
                    <td className="p-3.5 font-semibold text-amber-800">{wo.status}</td>
                    <td className="p-3.5 text-slate-600 text-xs">{wo.recommended_action || wo.description}</td>
                    <td className="p-3.5 text-right">
                      {canReinspect ? (
                        <button
                          onClick={() => setSelectedWO(wo)}
                          className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-3 py-1.5 rounded transition inline-flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Execute Reinspection</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Engineer Sign-off Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reinspection Evaluation Modal */}
      {selectedWO && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-govt-border max-w-lg w-full p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-govt-navy border-b border-govt-border pb-3 flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-800" />
              <span>Engineering Reinspection — {selectedWO.work_order_code}</span>
            </h2>

            <form onSubmit={handleRequestReinspectionSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reinspection Findings & Remarks</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter structural inspection findings on completed resin/epoxy repair..."
                  value={findingsNotes}
                  onChange={(e) => setFindingsNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue"
                />
              </div>

              <div className="pt-3 border-t border-govt-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedWO(null)}
                  className="px-4 py-2 border border-govt-border rounded text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded shadow-sm"
                >
                  {submitting ? 'Signing off...' : 'Confirm Post-Repair Sign-off'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
