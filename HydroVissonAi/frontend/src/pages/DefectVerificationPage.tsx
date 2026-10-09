import React, { useEffect, useState } from 'react';
import { Defect, DefectSeverity, DefectStatus, Dam, AIDetection } from '../types';
import { DefectService, DamService, AIService } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, CheckSquare, Edit2, ShieldCheck, X, RefreshCw } from 'lucide-react';

export const DefectVerificationPage: React.FC = () => {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [dams, setDams] = useState<Dam[]>([]);
  const [selectedDam, setSelectedDam] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit/Verification Modal State
  const [activeDefect, setActiveDefect] = useState<Defect | null>(null);
  const [editType, setEditType] = useState('CRACK');
  const [editSeverity, setEditSeverity] = useState<DefectSeverity>('MEDIUM');
  const [editLength, setEditLength] = useState<number>(50);
  const [editComments, setEditComments] = useState('');
  const [verifying, setVerifying] = useState(false);
  const { role } = useAuth();

  const fetchDefects = async () => {
    setLoading(true);
    try {
      const data = await DefectService.getDefects({
        dam_id: selectedDam ? parseInt(selectedDam, 10) : undefined,
        severity: selectedSeverity || undefined
      });
      setDefects(data);
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
    fetchDefects();
  }, [selectedDam, selectedSeverity]);

  const openVerifyModal = (d: Defect) => {
    setActiveDefect(d);
    setEditType(d.defect_type);
    setEditSeverity(d.severity);
    setEditLength(d.estimated_length_mm || 50);
    setEditComments(d.engineer_comments || '');
  };

  const handleSaveVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDefect) return;
    setVerifying(true);
    try {
      await DefectService.verifyDefect(activeDefect.id, {
        defect_type: editType,
        severity: editSeverity,
        estimated_length_mm: editLength,
        engineer_comments: editComments,
        status: 'VERIFIED'
      });
      setActiveDefect(null);
      fetchDefects();
      alert('Defect verification sign-off saved.');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const canVerify = role === 'INSPECTION_ENGINEER';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Human-in-the-Loop Defect Verification"
        description="Engineering sign-off workspace preserving raw model outputs alongside human engineering adjustments, severity ratings, crack length measurements, and audit trail sign-offs."
        category="MODULE 07 — DEFECT VERIFICATION"
        breadcrumbs={[{ name: 'Dashboard', path: '/' }, { name: 'Defect Verification' }]}
        actions={
          <button
            onClick={fetchDefects}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Inventory</span>
          </button>
        }
      />

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-govt-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <select
            value={selectedDam}
            onChange={(e) => setSelectedDam(e.target.value)}
            className="px-3 py-2 border border-govt-border rounded-md text-sm outline-none focus:border-govt-blue bg-white min-w-[200px]"
          >
            <option value="">All Dams Infrastructure</option>
            {dams.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-2 border border-govt-border rounded-md text-sm outline-none focus:border-govt-blue bg-white min-w-[160px]"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <div className="text-center py-12 text-sm text-slate-500 font-medium">Loading defect inventory...</div>
      ) : defects.length === 0 ? (
        <EmptyState
          title="No structural defects recorded or verified"
          description="No defect records exist in the database for the selected filters."
        />
      ) : (
        <div className="bg-white rounded-lg border border-govt-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-100 text-govt-navy font-bold uppercase text-xs border-b border-govt-border">
                <tr>
                  <th className="p-3.5">Defect Code</th>
                  <th className="p-3.5">Classification</th>
                  <th className="p-3.5">Severity</th>
                  <th className="p-3.5">AI Confidence</th>
                  <th className="p-3.5">Est. Length (mm)</th>
                  <th className="p-3.5">Verification Status</th>
                  <th className="p-3.5 text-right">Engineer Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-govt-border">
                {defects.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-bold text-govt-navy">{d.defect_code}</td>
                    <td className="p-3.5 font-bold text-slate-800">{d.defect_type}</td>
                    <td className="p-3.5">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded border ${
                        d.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-900 border-rose-300' :
                        d.severity === 'HIGH' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                        'bg-slate-100 text-slate-800 border-slate-300'
                      }`}>
                        {d.severity}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-emerald-800">{(d.confidence * 100).toFixed(0)}%</td>
                    <td className="p-3.5 font-mono text-xs">{d.estimated_length_mm || 0} mm</td>
                    <td className="p-3.5 font-semibold text-slate-700">{d.status}</td>
                    <td className="p-3.5 text-right">
                      {canVerify ? (
                        <button
                          onClick={() => openVerifyModal(d)}
                          className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-3 py-1.5 rounded transition inline-flex items-center space-x-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Verify Sign-off</span>
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

      {/* Engineer Verification Sign-off Modal */}
      {activeDefect && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-govt-border max-w-lg w-full p-6 shadow-xl relative space-y-4">
            <button onClick={() => setActiveDefect(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-govt-navy flex items-center space-x-2 border-b border-govt-border pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-800" />
              <span>Human Verification Sign-off — {activeDefect.defect_code}</span>
            </h2>

            <form onSubmit={handleSaveVerification} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Classification</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue bg-white"
                  >
                    <option value="CRACK">Concrete Crack</option>
                    <option value="CORROSION">Rebar / Steel Corrosion</option>
                    <option value="SEEPAGE">Active Water Seepage</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Engineer Severity</label>
                  <select
                    value={editSeverity}
                    onChange={(e) => setEditSeverity(e.target.value as DefectSeverity)}
                    className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue bg-white"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Crack Length (mm)</label>
                <input
                  type="number"
                  value={editLength}
                  onChange={(e) => setEditLength(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Engineer Notes & Remarks</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter structural inspection sign-off remarks..."
                  value={editComments}
                  onChange={(e) => setEditComments(e.target.value)}
                  className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue"
                />
              </div>

              <div className="pt-3 border-t border-govt-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveDefect(null)}
                  className="px-4 py-2 border border-govt-border rounded text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded shadow-sm"
                >
                  {verifying ? 'Saving Audit Record...' : 'Confirm Sign-off'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
