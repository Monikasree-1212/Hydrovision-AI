import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Building, ClipboardCheck, History, ArrowRightLeft, AlertTriangle, 
  CheckCircle2, TrendingUp, TrendingDown, RefreshCw, Eye, EyeOff, MapPin, Box, Image as ImageIcon,
  Sliders, Info, HelpCircle
} from 'lucide-react';
import { 
  Dam, Inspection, HistoricalInspectionTimelineItem, DefectComparisonItem,
  HistoricalComparisonResponse, ComparisonStatus, DeteriorationStatus
} from '../types';
import { DamService, InspectionService, HistoricalService } from '../services/api';

export const HistoricalComparisonPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const damIdParam = searchParams.get('damId');
  const currentInspIdParam = searchParams.get('currentId');
  const historicalInspIdParam = searchParams.get('historicalId');

  const [dams, setDams] = useState<Dam[]>([]);
  const [selectedDamId, setSelectedDamId] = useState<number>(damIdParam ? parseInt(damIdParam, 10) : 1);
  
  const [timeline, setTimeline] = useState<HistoricalInspectionTimelineItem[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  
  const [selectedCurrentInspId, setSelectedCurrentInspId] = useState<number | null>(
    currentInspIdParam ? parseInt(currentInspIdParam, 10) : null
  );
  const [selectedHistoricalInspId, setSelectedHistoricalInspId] = useState<number | null>(
    historicalInspIdParam ? parseInt(historicalInspIdParam, 10) : null
  );

  const [matchRadiusMeters, setMatchRadiusMeters] = useState<number>(10.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [comparing, setComparing] = useState<boolean>(false);
  
  const [comparisonResult, setComparisonResult] = useState<HistoricalComparisonResponse | null>(null);
  const [selectedComparison, setSelectedComparison] = useState<DefectComparisonItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Load dams on mount
  useEffect(() => {
    const loadDams = async () => {
      try {
        const damList = await DamService.getDams();
        setDams(damList);
        if (damList.length > 0 && !damIdParam) {
          setSelectedDamId(damList[0].id);
        }
      } catch (err) {
        console.error("Failed to load dams:", err);
      }
    };
    loadDams();
  }, []);

  // Load dam inspections & timeline when selectedDamId changes
  useEffect(() => {
    const loadDamInspections = async () => {
      if (!selectedDamId) return;
      setLoading(true);
      try {
        const [tlRes, inspList] = await Promise.all([
          HistoricalService.getDamInspectionTimeline(selectedDamId),
          InspectionService.getInspections(selectedDamId)
        ]);

        setTimeline(tlRes.timeline || []);
        setInspections(inspList || []);

        if (inspList && inspList.length > 0) {
          // Sort chronologically desc
          const sorted = [...inspList].sort((a, b) => 
            new Date(b.inspection_date).getTime() - new Date(a.inspection_date).getTime()
          );

          // Current inspection: latest or query param
          const currentId = currentInspIdParam ? parseInt(currentInspIdParam, 10) : sorted[0].id;
          setSelectedCurrentInspId(currentId);

          // Historical compare-with inspection: 2nd latest or query param
          if (historicalInspIdParam) {
            setSelectedHistoricalInspId(parseInt(historicalInspIdParam, 10));
          } else if (sorted.length > 1) {
            const histItem = sorted.find(i => i.id !== currentId);
            setSelectedHistoricalInspId(histItem ? histItem.id : null);
          } else {
            setSelectedHistoricalInspId(null);
          }
        } else {
          setSelectedCurrentInspId(null);
          setSelectedHistoricalInspId(null);
        }
      } catch (err) {
        console.error("Failed to load timeline:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDamInspections();
  }, [selectedDamId]);

  // Run historical comparison when selected inspections or match radius change
  const handleRunComparison = async () => {
    if (!selectedCurrentInspId) return;
    setComparing(true);
    try {
      const res = await HistoricalService.compareInspections(
        selectedCurrentInspId,
        selectedHistoricalInspId || undefined,
        matchRadiusMeters
      );
      setComparisonResult(res);
      if (res.comparisons && res.comparisons.length > 0) {
        setSelectedComparison(res.comparisons[0]);
      } else {
        setSelectedComparison(null);
      }

      // Update search params
      setSearchParams({
        damId: selectedDamId.toString(),
        currentId: selectedCurrentInspId.toString(),
        historicalId: selectedHistoricalInspId ? selectedHistoricalInspId.toString() : ''
      });
    } catch (err) {
      console.error("Failed to run comparison:", err);
    } finally {
      setComparing(false);
    }
  };

  useEffect(() => {
    if (selectedCurrentInspId && !loading) {
      handleRunComparison();
    }
  }, [selectedCurrentInspId, selectedHistoricalInspId, loading]);

  const getStatusBadgeClass = (status: ComparisonStatus) => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'UNCHANGED':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'INCREASING':
        return 'bg-amber-100 text-amber-900 border-amber-400 font-semibold';
      case 'DECREASING':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'RECURRING':
        return 'bg-purple-100 text-purple-800 border-purple-300 font-semibold';
      case 'RESOLVED':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'NOT_OBSERVED':
        return 'bg-amber-50 text-amber-800 border-amber-300 italic';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getDeteriorationBadgeClass = (status: DeteriorationStatus) => {
    switch (status) {
      case 'STABLE':
        return 'bg-emerald-600 text-white';
      case 'MONITORING':
        return 'bg-amber-500 text-white';
      case 'DETERIORATING':
        return 'bg-orange-600 text-white font-bold';
      case 'SIGNIFICANTLY_DETERIORATING':
        return 'bg-red-700 text-white font-black animate-pulse';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  const filteredComparisons = (comparisonResult?.comparisons || []).filter(c => {
    if (statusFilter === 'ALL') return true;
    return c.comparison_status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border-l-4 border-govt-blue p-5 rounded-r shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <History className="w-6 h-6 text-govt-blue" />
              <h1 className="text-xl font-bold text-govt-navy uppercase tracking-wide">
                Historical Inspection Comparison & Deterioration Analysis
              </h1>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Official Database-Driven Multi-Cycle Inspection Verification & Spatial Trend Engine
            </p>
          </div>
          <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded text-xs text-amber-800">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Strict Zero-Synthetic Data Enforcement active. Real DB records required.</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Dam & Inspection Selection */}
      <div className="bg-govt-navy text-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Dam Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
              Select Dam Structure
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <select
                className="w-full bg-slate-800 border border-slate-600 rounded pl-9 pr-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-amber-400 outline-none"
                value={selectedDamId}
                onChange={(e) => setSelectedDamId(parseInt(e.target.value, 10))}
              >
                {dams.map(dam => (
                  <option key={dam.id} value={dam.id}>{dam.name} ({dam.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Current Inspection Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
              Current Inspection
            </label>
            <div className="relative">
              <ClipboardCheck className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5" />
              <select
                className="w-full bg-slate-800 border border-slate-600 rounded pl-9 pr-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-amber-400 outline-none"
                value={selectedCurrentInspId || ''}
                onChange={(e) => setSelectedCurrentInspId(parseInt(e.target.value, 10))}
                disabled={inspections.length === 0}
              >
                {inspections.map(insp => (
                  <option key={insp.id} value={insp.id}>
                    {insp.inspection_code} ({new Date(insp.inspection_date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Historical Compare-With Inspection Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
              Compare With Historical Inspection
            </label>
            <div className="relative">
              <History className="w-4 h-4 text-amber-400 absolute left-3 top-2.5" />
              <select
                className="w-full bg-slate-800 border border-slate-600 rounded pl-9 pr-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-amber-400 outline-none"
                value={selectedHistoricalInspId || ''}
                onChange={(e) => setSelectedHistoricalInspId(e.target.value ? parseInt(e.target.value, 10) : null)}
                disabled={inspections.length <= 1}
              >
                <option value="">-- Auto Preceding Inspection --</option>
                {inspections
                  .filter(i => i.id !== selectedCurrentInspId)
                  .map(insp => (
                    <option key={insp.id} value={insp.id}>
                      {insp.inspection_code} ({new Date(insp.inspection_date).toLocaleDateString()})
                    </option>
                  ))
                }
              </select>
            </div>
          </div>

          {/* Configurable Spatial Radius */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
              Historical Matching Radius (m)
            </label>
            <div className="relative flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-blue-400 absolute left-3 top-2.5" />
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                className="w-full bg-slate-800 border border-slate-600 rounded pl-9 pr-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-amber-400 outline-none"
                value={matchRadiusMeters}
                onChange={(e) => setMatchRadiusMeters(parseFloat(e.target.value) || 10.0)}
              />
              <button
                onClick={handleRunComparison}
                disabled={comparing}
                className="bg-amber-500 hover:bg-amber-600 text-govt-navy font-bold px-3 py-1.5 rounded text-xs transition flex items-center space-x-1 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${comparing ? 'animate-spin' : ''}`} />
                <span>Compare</span>
              </button>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">Configurable software matching parameter</span>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-govt-navy uppercase tracking-wide flex items-center space-x-2">
          <History className="w-4 h-4 text-govt-blue" />
          <span>Dam Inspection Timeline</span>
        </h2>
        {timeline.length === 0 ? (
          <p className="text-xs text-slate-500">No inspection cycles recorded for this dam.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {timeline.map((item, idx) => {
              const isSelectedCurrent = item.id === selectedCurrentInspId;
              const isSelectedHist = item.id === selectedHistoricalInspId;

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded border text-xs space-y-1.5 transition ${
                    isSelectedCurrent
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300'
                      : isSelectedHist
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-govt-navy">{item.inspection_code}</span>
                    {isSelectedCurrent && <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded uppercase">Current</span>}
                    {isSelectedHist && <span className="bg-amber-600 text-white text-[9px] px-1.5 py-0.5 rounded uppercase">Historical</span>}
                  </div>
                  <div className="text-slate-600 flex justify-between">
                    <span>Date:</span>
                    <span className="font-semibold">{new Date(item.inspection_date).toLocaleDateString()}</span>
                  </div>
                  <div className="text-slate-600 flex justify-between">
                    <span>Coverage:</span>
                    <span className="font-semibold text-slate-800">{item.coverage_percentage}%</span>
                  </div>
                  <div className="border-t border-slate-200 pt-1 mt-1 grid grid-cols-3 gap-1 text-[10px] text-center">
                    <div className="bg-white p-1 rounded border">
                      <span className="block font-bold text-govt-blue">{item.verified_defects}</span>
                      <span className="text-slate-500">Verified</span>
                    </div>
                    <div className="bg-white p-1 rounded border">
                      <span className="block font-bold text-emerald-600">{item.spatially_located_defects}</span>
                      <span className="text-slate-500">Mapped</span>
                    </div>
                    <div className="bg-white p-1 rounded border">
                      <span className="block font-bold text-slate-500">{item.unmapped_defects}</span>
                      <span className="text-slate-500">Unmapped</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Status & Empty States Banner */}
      {comparisonResult?.status === 'UNAVAILABLE' && (
        <div className="bg-slate-100 border-2 border-dashed border-slate-400 p-6 rounded-lg text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 uppercase tracking-wide">
            HISTORICAL COMPARISON UNAVAILABLE
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            A previous verified inspection is required for comparison. Please upload and verify at least two inspection cycles for this dam structure.
          </p>
        </div>
      )}

      {comparisonResult?.status === 'NO_MATCHABLE_DEFECTS' && (
        <div className="bg-amber-50 border-2 border-dashed border-amber-400 p-6 rounded-lg text-center space-y-2">
          <Info className="w-8 h-8 text-amber-600 mx-auto" />
          <h3 className="text-base font-bold text-amber-900 uppercase tracking-wide">
            NO MATCHABLE HISTORICAL DEFECTS
          </h3>
          <p className="text-xs text-amber-800 max-w-md mx-auto">
            Previous inspection records exist, but spatial comparison is unavailable. All current defects have been classified as <span className="font-bold">NEW</span>.
          </p>
        </div>
      )}

      {/* Summary Metrics Bar */}
      {comparisonResult && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-center">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Current Defects</span>
            <span className="text-lg font-bold text-govt-navy">{comparisonResult.summary.total_current_defects}</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-center">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Historical Defects</span>
            <span className="text-lg font-bold text-slate-700">{comparisonResult.summary.total_historical_defects}</span>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-center">
            <span className="text-[10px] text-blue-700 font-semibold uppercase block">New</span>
            <span className="text-lg font-bold text-blue-900">{comparisonResult.summary.new_count}</span>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-center">
            <span className="text-[10px] text-amber-800 font-semibold uppercase block">Increasing</span>
            <span className="text-lg font-bold text-amber-900">{comparisonResult.summary.increasing_count}</span>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-center">
            <span className="text-[10px] text-emerald-700 font-semibold uppercase block">Decreasing</span>
            <span className="text-lg font-bold text-emerald-900">{comparisonResult.summary.decreasing_count}</span>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 text-center">
            <span className="text-[10px] text-purple-700 font-semibold uppercase block">Recurring</span>
            <span className="text-lg font-bold text-purple-900">{comparisonResult.summary.recurring_count}</span>
          </div>
          <div className="bg-teal-50 p-3 rounded-lg border border-teal-200 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] text-teal-700 font-semibold uppercase block">Resolved / Not Obs.</span>
            <span className="text-lg font-bold text-teal-900">
              {comparisonResult.summary.resolved_count} / {comparisonResult.summary.not_observed_count}
            </span>
          </div>
        </div>
      )}

      {/* Main Comparison Section: Table & Side-by-Side Detail */}
      {comparisonResult && comparisonResult.comparisons.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Table List (Left / Top 7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-govt-navy uppercase">Defect Comparison Records</span>
              
              {/* Filter Tabs */}
              <div className="flex space-x-1 overflow-x-auto">
                {['ALL', 'NEW', 'INCREASING', 'DECREASING', 'UNCHANGED', 'RECURRING', 'RESOLVED'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition uppercase ${
                      statusFilter === st
                        ? 'bg-govt-blue text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto flex-grow max-h-[550px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px] sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Defect Type</th>
                    <th className="p-2.5">Current / Hist.</th>
                    <th className="p-2.5">Meas. Change</th>
                    <th className="p-2.5">Deterioration</th>
                    <th className="p-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredComparisons.map((c, i) => {
                    const isSelected = selectedComparison === c;
                    return (
                      <tr
                        key={i}
                        onClick={() => setSelectedComparison(c)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-amber-50/80 font-medium border-l-4 border-l-amber-500' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-2.5">
                          <span className={`inline-block px-2 py-0.5 rounded border text-[10px] ${getStatusBadgeClass(c.comparison_status)}`}>
                            {c.comparison_status}
                          </span>
                        </td>
                        <td className="p-2.5 font-bold text-govt-navy">
                          {c.current_defect?.defect_type || c.historical_defect?.defect_type || 'N/A'}
                        </td>
                        <td className="p-2.5">
                          <span className="block text-slate-900 font-semibold">
                            {c.current_defect?.defect_code || 'None'}
                          </span>
                          <span className="block text-slate-500 text-[10px]">
                            vs {c.historical_defect?.defect_code || 'None'}
                          </span>
                        </td>
                        <td className="p-2.5">
                          {c.measurement_change_mm !== null && c.measurement_change_mm !== undefined ? (
                            <span className={c.measurement_change_mm > 0 ? 'text-amber-700 font-bold' : c.measurement_change_mm < 0 ? 'text-emerald-700' : 'text-slate-600'}>
                              {c.measurement_change_mm > 0 ? '+' : ''}{c.measurement_change_mm} mm
                              {c.measurement_change_pct ? ` (${c.measurement_change_pct > 0 ? '+' : ''}${c.measurement_change_pct}%)` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">Measurement N/A</span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] uppercase ${getDeteriorationBadgeClass(c.deterioration_status)}`}>
                            {c.deterioration_status}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedComparison(c); }}
                            className="text-govt-blue hover:text-govt-navy font-semibold underline text-[11px]"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side-by-Side Comparison Inspector Drawer (Right 5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg shadow-sm p-4 space-y-4">
            <h3 className="text-xs font-bold text-govt-navy uppercase tracking-wide border-b border-slate-200 pb-2 flex items-center justify-between">
              <span>Side-by-Side Inspection Inspector</span>
              {selectedComparison && (
                <span className={`px-2 py-0.5 rounded text-[10px] border ${getStatusBadgeClass(selectedComparison.comparison_status)}`}>
                  {selectedComparison.comparison_status}
                </span>
              )}
            </h3>

            {!selectedComparison ? (
              <p className="text-xs text-slate-500 italic py-8 text-center">
                Select a defect comparison row from the table to view side-by-side historical media and deterioration details.
              </p>
            ) : (
              <div className="space-y-4 text-xs">
                {/* 2-Column Side-by-Side Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Historical Defect Box */}
                  <div className="bg-amber-50/60 p-3 rounded border border-amber-200 space-y-2">
                    <div className="font-bold text-amber-900 border-b border-amber-200 pb-1 flex items-center justify-between text-[11px]">
                      <span>HISTORICAL DEFECT</span>
                      <span className="text-[10px] text-amber-700">{selectedComparison.historical_defect?.defect_code || 'N/A'}</span>
                    </div>

                    {selectedComparison.historical_defect ? (
                      <>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Type & Severity</span>
                          <span className="font-bold text-slate-800">
                            {selectedComparison.historical_defect.defect_type} ({selectedComparison.historical_defect.severity})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Measurement</span>
                          <span className="font-semibold text-slate-800">
                            {selectedComparison.historical_defect.estimated_length_mm
                              ? `${selectedComparison.historical_defect.estimated_length_mm} mm`
                              : 'Measurement unavailable'}
                          </span>
                          <span className="text-[9px] text-slate-500 block italic">
                            (Estimated Image Measurement)
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Location Precision</span>
                          <span className="font-semibold text-slate-700 uppercase text-[10px]">
                            {selectedComparison.historical_defect.location_precision || 'UNAVAILABLE'}
                          </span>
                        </div>

                        {/* Image Preview */}
                        <div className="mt-2 pt-2 border-t border-amber-200">
                          <div className="w-full h-24 bg-slate-200 rounded flex items-center justify-center overflow-hidden border border-slate-300 relative">
                            {selectedComparison.historical_defect.image_url ? (
                              <img 
                                src={selectedComparison.historical_defect.image_url} 
                                alt="Historical Defect Source" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-center text-slate-500">
                                <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                                <span className="text-[9px] block">Source Media Available</span>
                              </div>
                            )}
                          </div>
                          <Link
                            to={`/defects?defectId=${selectedComparison.historical_defect.id}`}
                            className="mt-1.5 w-full bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold py-1 rounded text-center block transition uppercase"
                          >
                            View Historical Image
                          </Link>
                        </div>
                      </>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic py-4">No matching historical defect record found.</p>
                    )}
                  </div>

                  {/* Current Defect Box */}
                  <div className="bg-emerald-50/60 p-3 rounded border border-emerald-200 space-y-2">
                    <div className="font-bold text-emerald-900 border-b border-emerald-200 pb-1 flex items-center justify-between text-[11px]">
                      <span>CURRENT DEFECT</span>
                      <span className="text-[10px] text-emerald-700">{selectedComparison.current_defect?.defect_code || 'N/A'}</span>
                    </div>

                    {selectedComparison.current_defect ? (
                      <>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Type & Severity</span>
                          <span className="font-bold text-slate-800">
                            {selectedComparison.current_defect.defect_type} ({selectedComparison.current_defect.severity})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Measurement</span>
                          <span className="font-semibold text-slate-800">
                            {selectedComparison.current_defect.estimated_length_mm
                              ? `${selectedComparison.current_defect.estimated_length_mm} mm`
                              : 'Measurement unavailable'}
                          </span>
                          <span className="text-[9px] text-slate-500 block italic">
                            (Estimated Image Measurement)
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Location Precision</span>
                          <span className="font-semibold text-slate-700 uppercase text-[10px]">
                            {selectedComparison.current_defect.location_precision || 'UNAVAILABLE'}
                          </span>
                        </div>

                        {/* Image Preview */}
                        <div className="mt-2 pt-2 border-t border-emerald-200">
                          <div className="w-full h-24 bg-slate-200 rounded flex items-center justify-center overflow-hidden border border-slate-300 relative">
                            {selectedComparison.current_defect.image_url ? (
                              <img 
                                src={selectedComparison.current_defect.image_url} 
                                alt="Current Defect Source" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-center text-slate-500">
                                <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                                <span className="text-[9px] block">Source Media Available</span>
                              </div>
                            )}
                          </div>
                          <Link
                            to={`/defects?defectId=${selectedComparison.current_defect.id}`}
                            className="mt-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1 rounded text-center block transition uppercase"
                          >
                            View Current Image
                          </Link>
                        </div>
                      </>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic py-4">Defect absent in current inspection cycle.</p>
                    )}
                  </div>
                </div>

                {/* Change Analysis Summary Box */}
                <div className="bg-slate-900 text-white p-3.5 rounded-lg space-y-2.5">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide block border-b border-slate-800 pb-1">
                    Deterioration & Spatial Change Metrics
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Spatial Distance</span>
                      <span className="font-bold text-white">
                        {selectedComparison.match_distance_meters !== null && selectedComparison.match_distance_meters !== undefined
                          ? `${selectedComparison.match_distance_meters} meters`
                          : 'Spatial match N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Severity Change</span>
                      <span className="font-bold text-amber-300">
                        {selectedComparison.severity_change || 'UNCHANGED'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Absolute Measurement Change</span>
                      <span className="font-bold text-white">
                        {selectedComparison.measurement_change_mm !== null && selectedComparison.measurement_change_mm !== undefined
                          ? `${selectedComparison.measurement_change_mm > 0 ? '+' : ''}${selectedComparison.measurement_change_mm} mm`
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Percentage Growth Rate</span>
                      <span className="font-bold text-white">
                        {selectedComparison.measurement_change_pct !== null && selectedComparison.measurement_change_pct !== undefined
                          ? `${selectedComparison.measurement_change_pct > 0 ? '+' : ''}${selectedComparison.measurement_change_pct}%`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Historical Match Confidence Score */}
                  {selectedComparison.match_confidence !== null && selectedComparison.match_confidence !== undefined && (
                    <div className="pt-1">
                      <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="text-slate-300 font-semibold">Historical Match Confidence</span>
                        <span className="text-amber-400 font-bold">{(selectedComparison.match_confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-400 h-full rounded-full" 
                          style={{ width: `${selectedComparison.match_confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 block mt-0.5 italic">
                        Calculated from spatial proximity, defect type agreement, and location precision metadata.
                      </span>
                    </div>
                  )}

                  {/* Decision Support Deterioration Classification */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-300 uppercase font-semibold">Decision-Support Deterioration Status</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${getDeteriorationBadgeClass(selectedComparison.deterioration_status)}`}>
                      {selectedComparison.deterioration_status}
                    </span>
                  </div>
                </div>

                {/* Direct Cross-Module Links */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    to={`/gis?damId=${selectedDamId}`}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-1.5 px-3 rounded text-center text-[11px] flex items-center justify-center space-x-1 transition uppercase border border-slate-700"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Open in GIS Map</span>
                  </Link>

                  <Link
                    to={`/digital-twin/${selectedDamId}`}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-1.5 px-3 rounded text-center text-[11px] flex items-center justify-center space-x-1 transition uppercase border border-slate-700"
                  >
                    <Box className="w-3.5 h-3.5 text-blue-400" />
                    <span>Open Digital Twin</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
