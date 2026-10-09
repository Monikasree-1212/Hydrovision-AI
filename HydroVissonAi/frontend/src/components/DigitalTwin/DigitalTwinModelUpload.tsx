import React, { useState } from 'react';
import { X, Upload, FileCode, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { DigitalTwinService } from '../../services/api';
import { DigitalTwinModel } from '../../types';

interface DigitalTwinModelUploadProps {
  damId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newModel: DigitalTwinModel) => void;
}

export const DigitalTwinModelUpload: React.FC<DigitalTwinModelUploadProps> = ({
  damId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState<string>('Dam 3D Engineering Twin');
  const [version, setVersion] = useState<string>('v1.0.0');
  const [description, setDescription] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const ext = selected.name.split('.').pop()?.toLowerCase();
      if (ext !== 'glb' && ext !== 'gltf') {
        setError('Only .glb and .gltf 3D model formats are supported.');
        setFile(null);
        return;
      }
      if (selected.size > 200 * 1024 * 1024) {
        setError('Model file size exceeds the 200MB maximum limit.');
        setFile(null);
        return;
      }
      setError(null);
      setFile(selected);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a valid GLB or GLTF model file.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('version', version);
      if (description) formData.append('description', description);
      formData.append('is_active', isActive ? 'true' : 'false');

      const created = await DigitalTwinService.uploadModel(damId, formData);
      setUploading(false);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      console.error('Failed to upload digital twin model:', err);
      const detail = err.response?.data?.detail || 'Failed to upload 3D model. Please verify file and RBAC authorization.';
      setError(detail);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-slate-100 text-base">Upload 3D Digital Twin Model</h3>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* File Picker */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              3D Model File (.glb, .gltf) <span className="text-rose-400">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-lg p-5 text-center bg-slate-950 cursor-pointer transition-colors relative">
              <input
                type="file"
                accept=".glb,.gltf"
                onChange={handleFileChange}
                disabled={uploading}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileCode className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              {file ? (
                <div>
                  <p className="font-semibold text-blue-400 font-mono text-xs">{file.name}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-slate-300 font-medium">Click or drag GLB / GLTF file to upload</p>
                  <p className="text-[10px] text-slate-500 mt-1">Max file size: 200MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Model Name */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Model Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Version String */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Model Version Tag</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g. v1.0.0"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Provide survey details, photogrammetry source, or CAD revision..."
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Set Active Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-slate-300 cursor-pointer">
              Set as Active Digital Twin Model immediately
            </label>
          </div>

          {/* Submit */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium transition-colors shadow-sm"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Uploading Model...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload Digital Twin</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
