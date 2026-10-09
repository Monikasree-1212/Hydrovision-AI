import React, { useEffect, useState } from 'react';
import { WorkOrder, Defect, Dam, MaintenanceStatus } from '../types';
import { MaintenanceService, DefectService, DamService } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { Wrench, Plus, CheckCircle2, Clock, X, RefreshCw } from 'lucide-react';

export const MaintenancePage: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [dams, setDams] = useState<Dam[]>([]);
  const [loading, setLoading] = useState(true);

  // Create WO Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [damId, setDamId] = useState<number | ''>('');
  const [defectId, setDefectId] = useState<number | ''>('');
  const [priority, setPriority] = useState('HIGH');
  const [team, setTeam] = useState('Civil Structural Repair Team Alpha');
  const [desc, setDesc] = useState('');
  const [action, setAction] = useState('Polyurethane resin injection & epoxy sealing');
  const [creating, setCreating] = useState(false);

  // Update WO Modal State
  const [activeWO, setActiveWO] = useState<WorkOrder | null>(null);
  const [woStatus, setWoStatus] = useState<MaintenanceStatus>('OPEN');
  const [repairNotes, setRepairNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const { role } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [wos, defcs, damsData] = await Promise.all([
        MaintenanceService.getWorkOrders(),
        DefectService.getDefects({ status: 'VERIFIED' }),
        DamService.getDams()
      ]);
      setWorkOrders(wos);
      setDefects(defcs);
      setDams(damsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateWO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!damId || !defectId) return;
    setCreating(true);
    try {
      await MaintenanceService.createWorkOrder({
        dam_id: Number(damId),
        defect_id: Number(defectId),
        priority,
        assigned_team: team,
        description: desc,
        recommended_action: action
      });
      setIsCreateOpen(false);
      setDesc('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create work order.');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateWO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWO) return;
    setUpdating(true);
    try {
      await MaintenanceService.updateWorkOrder(activeWO.id, {
        status: woStatus,
        repair_notes: repairNotes
      });

      if (woStatus === 'REPAIR_COMPLETED') {
        await MaintenanceService.requestReinspection(activeWO.id, "Repair complete. Reinspection requested.");
      }

      setActiveWO(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update work order.');
    } finally {
      setUpdating(false);
    }
  };

  const canCreate = role === 'MAINTENANCE_MANAGER' || role === 'AUTHORITY';
  const canUpdate = role === 'MAINTENANCE_MANAGER' || role === 'INSPECTION_ENGINEER';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Structural Work Orders & Repair Lifecycle"
        description="Work order tracking across civil repair lifecycle states: OPEN -> ASSIGNED -> IN_PROGRESS -> REPAIR_COMPLETED -> REINSPECTION_REQUIRED -> CLOSED."
        category="MODULE 14 — WORK ORDERS"
        breadcrumbs={[{ name: 'Dashboard', path: '/' }, { name: 'Work Orders' }]}
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchData}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Orders</span>
            </button>
            {canCreate && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center space-x-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs px-4 py-2 rounded transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Issue Work Order</span>
              </button>
            )}
          </div>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-sm text-slate-500 font-medium">Loading work order directory...</div>
      ) : workOrders.length === 0 ? (
        <EmptyState
          title="No work orders recorded"
          description="No maintenance work orders have been issued yet. Issue a work order from verified defects to assign repair teams."
          actionLabel={canCreate ? "Issue Work Order" : undefined}
          onAction={canCreate ? () => setIsCreateOpen(true) : undefined}
        />
      ) : (
        <div className="bg-white rounded-lg border border-govt-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 text-govt-navy font-bold uppercase text-xs border-b border-govt-border">
                <tr>
                  <th className="p-3.5">Work Order Code</th>
                  <th className="p-3.5">Target Dam</th>
                  <th className="p-3.5">Defect Code</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Assigned Team</th>
                  <th className="p-3.5">Lifecycle Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-govt-border">
                {workOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-bold text-govt-navy">{wo.work_order_code}</td>
                    <td className="p-3.5 font-medium text-slate-700">{wo.dam_name || 'Dam'}</td>
                    <td className="p-3.5 font-bold text-slate-800">{wo.defect_code || 'DEF-01'}</td>
                    <td className="p-3.5">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded border ${
                        wo.priority === 'CRITICAL' ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}>
                        {wo.priority}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700">{wo.assigned_team || 'Unassigned'}</td>
                    <td className="p-3.5 font-bold text-slate-800">{wo.status}</td>
                    <td className="p-3.5 text-right">
                      {canUpdate ? (
                        <button
                          onClick={() => {
                            setActiveWO(wo);
                            setWoStatus(wo.status);
                            setRepairNotes(wo.repair_notes || '');
                          }}
                          className="bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold px-3 py-1.5 rounded transition"
                        >
                          Update Lifecycle
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Read Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Work Order Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-govt-border max-w-lg w-full p-6 shadow-xl relative space-y-4">
            <button onClick={() => setIsCreateOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-govt-navy border-b border-govt-border pb-3 uppercase">
              Issue Civil Repair Work Order
            </h2>

            <form onSubmit={handleCreateWO} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Dam</label>
                  <select
                    required
                    value={damId}
                    onChange={(e) => setDamId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue bg-white"
                  >
                    <option value="">Select Dam...</option>
                    {dams.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Verified Defect</label>
                  <select
                    required
                    value={defectId}
                    onChange={(e) => setDefectId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue bg-white"
                  >
                    <option value="">Select Defect...</option>
                    {defects.map((defc) => (
                      <option key={defc.id} value={defc.id}>{defc.defect_code} ({defc.defect_type})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue bg-white"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Repair Team</label>
                  <input
                    type="text"
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Work Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Describe scope of civil repair work..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recommended Action</label>
                <input
                  type="text"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue"
                />
              </div>

              <div className="pt-3 border-t border-govt-border flex justify-end space-x-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 border border-govt-border rounded text-slate-600 hover:bg-slate-50 font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded shadow-sm">
                  {creating ? 'Issuing...' : 'Issue Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Work Order Status Modal */}
      {activeWO && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-govt-border max-w-md w-full p-6 shadow-xl relative space-y-4">
            <button onClick={() => setActiveWO(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-govt-navy border-b border-govt-border pb-3 uppercase">
              Update Repair Lifecycle — {activeWO.work_order_code}
            </h2>

            <form onSubmit={handleUpdateWO} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lifecycle Status</label>
                <select
                  value={woStatus}
                  onChange={(e) => setWoStatus(e.target.value as MaintenanceStatus)}
                  className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue font-bold bg-white"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="REPAIR_COMPLETED">REPAIR_COMPLETED (Triggers Reinspection)</option>
                  <option value="REINSPECTION_REQUIRED">REINSPECTION_REQUIRED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Repair Execution Notes</label>
                <textarea
                  rows={3}
                  placeholder="Enter notes on repair execution..."
                  value={repairNotes}
                  onChange={(e) => setRepairNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue"
                />
              </div>

              <div className="pt-3 border-t border-govt-border flex justify-end space-x-2">
                <button type="button" onClick={() => setActiveWO(null)} className="px-4 py-2 border border-govt-border rounded text-slate-600 hover:bg-slate-50 font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={updating} className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded shadow-sm">
                  {updating ? 'Updating...' : 'Save Lifecycle Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
