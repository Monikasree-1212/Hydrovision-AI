import React, { useEffect, useState } from 'react';
import { Dam } from '../types';
import { DamService } from '../services/api';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Building, Search, Plus, MapPin, Layers, ArrowRight, X, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DamDirectoryPage: React.FC = () => {
  const [dams, setDams] = useState<Dam[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { role } = useAuth();
  const { language, t } = useLanguage();

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [stateName, setStateName] = useState('');
  const [district, setDistrict] = useState('');
  const [damType, setDamType] = useState('Concrete Gravity');
  const [height, setHeight] = useState('110');
  const [lat, setLat] = useState('31.41');
  const [lng, setLng] = useState('76.43');
  const [creating, setCreating] = useState(false);

  const fetchDams = async () => {
    setLoading(true);
    try {
      const data = await DamService.getDams(search);
      setDams(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDams();
  }, [search]);

  const handleCreateDam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await DamService.createDam({
        name,
        code: code.toUpperCase(),
        state: stateName,
        district,
        dam_type: damType,
        height_meters: parseFloat(height),
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
      });
      setIsModalOpen(false);
      setName('');
      setCode('');
      setStateName('');
      setDistrict('');
      fetchDams();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create dam.');
    } finally {
      setCreating(false);
    }
  };

  const canCreate = role === 'AUTHORITY' || role === 'DAM_OPERATOR';

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title={language === 'HI' ? 'राष्ट्रीय बाँध अवसंरचना निर्देशिका' : 'National Dam Infrastructure Directory'}
        description={language === 'HI' ? 'निगरानीधीन बाँध परिसंपत्तियों, ऊंचाई विनिर्देशों, जीपीएस निर्देशांकों और परिचालन स्थिति का केंद्रीय रजिस्टर।' : 'Central register of monitored dam assets, height specifications, spatial PostGIS coordinates, and operational status.'}
        category={language === 'HI' ? 'मॉड्यूल 02 — बाँध प्रबंधन' : 'MODULE 02 — DAM MANAGEMENT'}
        breadcrumbs={[{ name: t('nav_dashboard'), path: '/' }, { name: t('nav_dams') }]}
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchDams}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-govt-border text-govt-navy hover:bg-slate-50 font-semibold rounded text-xs transition shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === 'HI' ? 'रीफ्रेश' : 'Refresh'}</span>
            </button>
            {canCreate && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center space-x-1.5 bg-govt-blue hover:bg-blue-900 text-white font-bold text-xs px-4 py-2 rounded transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'HI' ? 'नया बाँध पंजीकृत करें' : 'Register New Dam'}</span>
              </button>
            )}
          </div>
        }
      />

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-govt-border shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={language === 'HI' ? 'बाँध का नाम, कोड या राज्य से खोजें...' : 'Search by dam name, code, or state...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-govt-border rounded-md text-sm focus:ring-1 focus:ring-govt-blue outline-none bg-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-slate-500 font-medium">Loading dam infrastructure directory...</div>
      ) : dams.length === 0 ? (
        <EmptyState
          title="No dams have been registered"
          description={search ? "No dams match your search query." : "No dam infrastructure records currently exist in the database. Register a dam to begin inspection monitoring."}
          actionLabel={canCreate ? "Register Dam Structure" : undefined}
          onAction={canCreate ? () => setIsModalOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dams.map((d) => (
            <div key={d.id} className="bg-white p-5 rounded-lg border border-govt-border shadow-sm flex flex-col justify-between hover:border-govt-blue transition space-y-4">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{d.code}</span>
                    <h3 className="text-lg font-bold text-govt-navy leading-tight">{d.name}</h3>
                  </div>
                  <span className="bg-emerald-100 text-emerald-900 text-xs font-bold px-2.5 py-1 rounded border border-emerald-300">
                    {d.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm text-slate-600 border-t border-b border-slate-100 py-3">
                  <div className="flex items-center space-x-1.5 text-slate-700">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{d.district}, {d.state}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 pt-1">
                    <span>Type: <strong className="text-slate-800">{d.dam_type}</strong></span>
                    <span>Height: <strong className="text-slate-800">{d.height_meters} m</strong></span>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    GPS: {d.latitude}° N, {d.longitude}° E
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Link
                  to={`/dams/${d.id}`}
                  className="text-xs font-bold text-govt-blue hover:underline flex items-center space-x-1"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to={`/digital-twin/${d.id}`}
                  className="text-xs font-bold text-amber-800 hover:underline flex items-center space-x-1"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>3D Digital Twin</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Dam Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-govt-border max-w-lg w-full p-6 shadow-xl relative space-y-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-govt-navy border-b border-govt-border pb-3 uppercase">
              Register New Dam Structure
            </h2>

            <form onSubmit={handleCreateDam} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dam Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bhakra Dam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dam Code (Unique)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BHK-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dam Type</label>
                  <select
                    value={damType}
                    onChange={(e) => setDamType(e.target.value)}
                    className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue bg-white"
                  >
                    <option value="Concrete Gravity">Concrete Gravity</option>
                    <option value="Embankment">Embankment Dam</option>
                    <option value="Arch Dam">Arch Dam</option>
                    <option value="Rockfill">Rockfill Dam</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    required
                    placeholder="Himachal Pradesh"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">District</label>
                  <input
                    type="text"
                    required
                    placeholder="Bilaspur"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Height (m)</label>
                  <input
                    type="number"
                    required
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Latitude (°N)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Longitude (°E)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full px-3 py-2 border border-govt-border rounded outline-none focus:border-govt-blue"
                  />
                </div>
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
                  {creating ? 'Saving...' : 'Register Dam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
