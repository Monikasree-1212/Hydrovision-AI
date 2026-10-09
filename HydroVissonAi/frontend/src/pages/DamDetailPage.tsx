import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Dam, Inspection, Defect, RiskAssessment, WorkOrder } from '../types';
import { DamService, InspectionService, DefectService, RiskService, MaintenanceService } from '../services/api';
import { Building, MapPin, Shield, Layers, ClipboardCheck, AlertTriangle, Wrench, Radio, Compass, Award } from 'lucide-react';
import { SpillwayInundationSimulator } from '../components/Dam/SpillwayInundationSimulator';

export const DamDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [dam, setDam] = useState<Dam | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'zones' | 'inspections' | 'defects' | 'telemetry' | 'eap' | 'ndsa' | 'risk' | 'maintenance'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const damId = parseInt(id, 10);

    const loadDamData = async () => {
      try {
        const [damData, inspsData, defectsData, riskData, woData] = await Promise.all([
          DamService.getDam(damId),
          InspectionService.getInspections(damId),
          DefectService.getDefects({ dam_id: damId }),
          RiskService.calculateRisk(damId),
          MaintenanceService.getWorkOrders(damId)
        ]);
        setDam(damData);
        setInspections(inspsData);
        setDefects(defectsData);
        setRisk(riskData);
        setWorkOrders(woData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadDamData();
  }, [id]);

  if (loading) return <div className="text-center py-12 text-xs text-slate-500">Loading dam details...</div>;
  if (!dam) return <div className="text-center py-12 text-xs text-rose-600 font-bold">Dam profile not found.</div>;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-govt-navy text-white p-5 rounded shadow border-b-2 border-amber-400 flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-govt-blue px-2 py-0.5 rounded text-[10px] uppercase font-bold text-amber-300">
              {dam.code}
            </span>
            <span className="text-xs text-slate-300">{dam.dam_type}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight mt-1">{dam.name}</h1>
          <div className="text-xs text-slate-300 flex items-center space-x-1 mt-1">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>{dam.district}, {dam.state} — Coordinates: {dam.latitude}° N, {dam.longitude}° E</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to={`/digital-twin/${dam.id}`}
            className="bg-amber-500 hover:bg-amber-600 text-govt-navy font-bold text-xs px-3 py-1.5 rounded transition flex items-center space-x-1"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3D Digital Twin</span>
          </Link>
          <Link
            to={`/gis?damId=${dam.id}`}
            className="bg-govt-blue hover:bg-blue-800 text-white font-semibold text-xs px-3 py-1.5 rounded transition"
          >
            GIS Spatial Map
          </Link>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="border-b border-govt-border flex space-x-2 overflow-x-auto bg-white px-4 pt-2 rounded-t">
        {[
          { key: 'overview', label: 'Overview', icon: Building },
          { key: 'zones', label: 'Structural Zones', icon: Layers },
          { key: 'telemetry', label: 'SCADA & Sensors', icon: Radio },
          { key: 'eap', label: 'Monsoon & EAP', icon: Compass },
          { key: 'ndsa', label: 'NDSA Compliance', icon: Award },
          { key: 'inspections', label: `Inspections (${inspections.length})`, icon: ClipboardCheck },
          { key: 'defects', label: `Defects (${defects.length})`, icon: AlertTriangle },
          { key: 'risk', label: 'Risk Assessment', icon: Shield },
          { key: 'maintenance', label: `Maintenance (${workOrders.length})`, icon: Wrench },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-bold border-b-2 uppercase whitespace-nowrap transition ${
                isActive
                  ? 'border-govt-navy text-govt-navy bg-slate-50'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white p-5 rounded-b border-x border-b border-govt-border shadow-sm min-h-[300px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-3">
              <h3 className="font-bold text-govt-navy uppercase border-b border-slate-200 pb-1">Technical Parameters</h3>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Structure Height</div>
                  <div className="text-sm font-bold text-govt-navy mt-0.5">{dam.height_meters} meters</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Structure Type</div>
                  <div className="text-sm font-bold text-govt-navy mt-0.5">{dam.dam_type}</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">District / State</div>
                  <div className="text-sm font-bold text-govt-navy mt-0.5">{dam.district}, {dam.state}</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Operational Status</div>
                  <div className="text-sm font-bold text-emerald-800 mt-0.5">{dam.status}</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-govt-navy uppercase border-b border-slate-200 pb-1">Safety & Risk Summary</h3>
              {risk ? (
                <div className="bg-slate-50 p-3.5 rounded border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">Dam Risk Index:</span>
                    <span className="text-base font-bold text-rose-800">{risk.risk_score} / 100 ({risk.risk_level})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">Condition Rating:</span>
                    <span className="font-bold text-emerald-800">{risk.condition_rating}</span>
                  </div>
                  {risk.contributing_factors && (
                    <div className="mt-2 text-[11px] text-slate-600">
                      <div className="font-semibold text-slate-800 mb-1">Key Factors:</div>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {risk.contributing_factors.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500">Risk index calculation pending inspection records.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'zones' && (
          <div className="space-y-3 text-xs">
            <h3 className="font-bold text-govt-navy uppercase border-b border-slate-200 pb-1">Defined Structural Zones</h3>
            {!dam.zones || dam.zones.length === 0 ? (
              <div className="text-slate-500 py-4">No structural zones registered for this dam.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dam.zones.map((z) => (
                  <div key={z.id} className="p-3 bg-slate-50 rounded border border-slate-200 flex justify-between items-start">
                    <div>
                      <div className="font-bold text-govt-navy">{z.zone_name}</div>
                      <div className="text-slate-600 mt-1">{z.description || 'Structural zone area.'}</div>
                    </div>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300">
                      {z.criticality} Priority
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'telemetry' && (
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-govt-navy uppercase border-b border-slate-200 pb-1 flex items-center justify-between">
              <span>IoT Telemetry & Real-Time Sensor Telemetry</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300">LIVE FEED</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <div className="text-slate-500 font-bold uppercase text-[10px]">Reservoir Water Level</div>
                <div className="text-lg font-extrabold text-govt-navy mt-1">820.45 m MSL</div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-1">🟢 Normal Operating Range</div>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <div className="text-slate-500 font-bold uppercase text-[10px]">Foundation Seepage Rate</div>
                <div className="text-lg font-extrabold text-govt-navy mt-1">4.2 L/min</div>
                <div className="text-[10px] text-amber-700 font-semibold mt-1">🟡 Minor Seepage Variance</div>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <div className="text-slate-500 font-bold uppercase text-[10px]">Structural Tilt (Piezometer)</div>
                <div className="text-lg font-extrabold text-govt-navy mt-1">0.02° North</div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-1">🟢 Within Tolerances</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'eap' && (
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-govt-navy uppercase border-b border-slate-200 pb-1">Emergency Action Plan (EAP) & Inundation Preparedness</h3>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-amber-900 rounded-r">
              <div className="font-bold">Monsoon Operational Readiness</div>
              <div>Standard Operating Guidelines active under Central Dam Safety Organisation (CDSO) protocol. Emergency contact lists and downstream evacuation maps are verified.</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <div className="font-bold text-govt-navy">Downstream Vulnerability Level</div>
                <div className="text-rose-800 font-extrabold text-sm mt-0.5">High (Category 1 Dam)</div>
                <div className="text-slate-500 mt-1 text-[11px]">Potential downstream population at risk: ~45,000 residents across 12 downstream villages.</div>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <div className="font-bold text-govt-navy">District Control Room Contact</div>
                <div className="text-slate-800 font-bold text-xs mt-0.5">+91 (011) 2338-8901 / eap-alert@jalshakti.gov.in</div>
                <div className="text-slate-500 mt-1 text-[11px]">24x7 Emergency Response HQ — Ministry of Jal Shakti.</div>
              </div>
            </div>

            {/* Interactive Hydrodynamic Spillway Inundation Simulator */}
            <div className="pt-4 border-t border-slate-200">
              <SpillwayInundationSimulator damId={dam.id} />
            </div>
          </div>
        )}

        {activeTab === 'ndsa' && (
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-govt-navy uppercase border-b border-slate-200 pb-1">National Dam Safety Authority (NDSA) Statutory Compliance</h3>
            <div className="space-y-2">
              {[
                { title: 'Annual Pre-Monsoon Structural Audit', status: 'COMPLETED', date: '2026-05-15' },
                { title: 'Post-Monsoon Spillway Inspection', status: 'SCHEDULED', date: '2026-10-20' },
                { title: 'Comprehensive Dam Safety Evaluation (5-Year)', status: 'COMPLETED', date: '2024-11-10' },
                { title: 'Instrument Calibration Certification', status: 'VALID', date: '2026-01-12' },
              ].map((item, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-govt-navy">{item.title}</div>
                    <div className="text-[10px] text-slate-500">Recorded Date: {item.date}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    item.status === 'COMPLETED' || item.status === 'VALID' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'inspections' && (
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <h3 className="font-bold text-govt-navy uppercase">Inspection Record History</h3>
              <Link to="/inspections" className="bg-govt-blue text-white text-xs font-semibold px-2.5 py-1 rounded">
                + New Inspection
              </Link>
            </div>
            {inspections.length === 0 ? (
              <div className="text-slate-500 py-4">No drone inspections recorded for this dam.</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {inspections.map((insp) => (
                  <div key={insp.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-govt-navy">{insp.inspection_code}</div>
                      <div className="text-slate-500">{new Date(insp.inspection_date).toLocaleDateString()} — {insp.inspection_type}</div>
                    </div>
                    <Link to={`/inspections/${insp.id}`} className="text-govt-blue font-bold hover:underline">
                      View Drone Dataset
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'defects' && (
          <div className="space-y-3 text-xs">
            <h3 className="font-bold text-govt-navy uppercase border-b border-slate-200 pb-1">Verified Structural Defects</h3>
            {defects.length === 0 ? (
              <div className="text-slate-500 py-4">No defects recorded for this dam.</div>
            ) : (
              <div className="space-y-2">
                {defects.map((defc) => (
                  <div key={defc.id} className="p-3 bg-slate-50 rounded border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-govt-navy mr-2">{defc.defect_code}</span>
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-300 mr-2">
                        {defc.defect_type}
                      </span>
                      <span className="text-slate-600">Est Length: {defc.estimated_length_mm || 0} mm</span>
                    </div>
                    <span className="font-semibold text-slate-700">{defc.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="space-y-3 text-xs">
            <h3 className="font-bold text-govt-navy uppercase border-b border-slate-200 pb-1">Detailed Risk Index Analysis</h3>
            {risk ? (
              <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-3">
                <div className="text-lg font-bold text-rose-900">
                  Calculated Risk Score: {risk.risk_score} / 100 ({risk.risk_level})
                </div>
                <p className="text-slate-600">
                  Explainable safety index computed from active defect count, severity ratings, structural zone criticality, and maintenance history.
                </p>
              </div>
            ) : (
              <div className="text-slate-500">Risk index unavailable.</div>
            )}
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-3 text-xs">
            <h3 className="font-bold text-govt-navy uppercase border-b border-slate-200 pb-1">Work Orders & Repair History</h3>
            {workOrders.length === 0 ? (
              <div className="text-slate-500 py-4">No maintenance work orders filed for this dam.</div>
            ) : (
              <div className="space-y-2">
                {workOrders.map((wo) => (
                  <div key={wo.id} className="p-3 bg-slate-50 rounded border border-slate-200 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-govt-navy">{wo.work_order_code}</div>
                      <div className="text-slate-600">{wo.description}</div>
                    </div>
                    <span className="font-bold text-amber-800">{wo.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
