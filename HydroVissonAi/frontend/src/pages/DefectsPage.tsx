import React, { useEffect, useState } from 'react';
import { Defect, DefectSeverity, DefectStatus, Dam } from '../types';
import { DefectService, DamService } from '../services/api';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, CheckSquare, Search, Filter, X, Edit2, ShieldCheck } from 'lucide-react';

export const DefectsPage: React.FC = () => {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [dams, setDams] = useState<Dam[]>([]);
  const [selectedDam, setSelectedDam] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit Modal State
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
    setEditLength(d.estimated_length_mm || 45);
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
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const canVerify = role === 'INSPECTION_ENGINEER';

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded border border-govt-border shadow-sm flex flex-col md:flex-row justify-between md:items-center space-y-3 md:space-y-0">
        <div>
          <h1 className="text-lg font-bold text-govt-navy flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>Defect Inventory & Human-in-the-Loop Verification</span>
          </h1>
          <p className="text-xs text-slate-500">
            AI Detections (YOLO11) require human engineering sign-off before official risk calculation
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedDam}
            onChange={(e) => setSelectedDam(e.target.value)}
            className="px-3 py-1.5 border border-govt-border rounded text-xs outline-none focus:border-govt-blue"
          >
            <option value="">All Dams</option>
            {dams.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-1.5 border border-govt-border rounded text-xs outline-none focus:border-govt-blue"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-slate-500">Loading verified defect registry...</div>
      ) : defects.length === 0 ? (
        <EmptyState
          title="No defects recorded or verified"
          description="No structural defect records match the selected filters or exist in the database."
        />
      ) : (
        <div className="bg-white rounded border border-govt-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-govt-navy font-bold uppercase border-b border-govt-border">
                <tr>
                  <th className="p-3">Defect ID</th>
                  <th className="p-3">Dam</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Confidence</th>
                  <th className="p-3">Est. Length</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Engineer Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-govt-border">
                {defects.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-govt-navy">{d.defect_code}</td>
                    <td className="p-3 font-medium text-slate-700">{d.dam_name || 'Dam'}</td>
                    <td className="p-3 font-bold text-slate-800">{d.defect_type}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        d.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        d.severity === 'HIGH' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        'bg-slate-100 text-slate-800 border-slate-300'
                      }`}>
                        {d.severity}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-emerald-800">{(d.confidence * 100).toFixed(0)}%</td>
                    <td className="p-3">{d.estimated_length_mm || 0} mm (Est)</td>
                    <td className="p-3 font-semibold text-slate-700">{d.status}</td>
                    <td className="p-3 text-right">
                      {canVerify ? (
                        <button
                          onClick={() => openVerifyModal(d)}
                          className="bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded transition flex items-center space-x-1 ml-auto"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Verify & Sign-off</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">View Only</span>
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
          <div className="bg-white rounded border border-govt-border max-w-lg w-full p-6 shadow-xl relative">
            <button onClick={() => setActiveDefect(null)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-govt-navy mb-2 uppercase flex items-center space-x-1.5 border-b border-govt-border pb-2">
              <ShieldCheck className="w-5 h-5 text-emerald-800" />
              <span>Human Engineering Sign-off — {activeDefect.defect_code}</span>
            </h2>

            <form onSubmit={handleSaveVerification} className="space-y-3 text-xs mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Defect Classification</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full px-3 py-1.5 border border-govt-border rounded outline-none focus:border-govt-blue"
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
                    className="w-full px-3 py-1.5 border border-govt-border rounded outline-none focus:border-govt-blue"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">OpenCV Estimated Crack Length (mm)</label>
                <input
                  type="number"
                  value={editLength}
                  onChange={(e) => setEditLength(parseFloat(e.target.value))}
                  className="w-full px-3 py-1.5 border border-govt-border rounded outline-none focus:border-govt-blue"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Engineer Observations & Comments</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter structural assessment notes for audit trail..."
                  value={editComments}
                  onChange={(e) => setEditComments(e.target.value)}
                  className="w-full px-3 py-1.5 border border-govt-border rounded outline-none focus:border-govt-blue"
                />
              </div>

              <div className="pt-3 border-t border-govt-border flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveDefect(null)}
                  className="px-3 py-1.5 border border-govt-border rounded text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded shadow-sm"
                >
                  {verifying ? 'Saving Audit Record...' : 'Confirm Verification Sign-off'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
