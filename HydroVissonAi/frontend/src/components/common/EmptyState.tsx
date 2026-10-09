import React from 'react';
import { Database, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ElementType;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = Database
}) => {
  return (
    <div className="bg-white border border-govt-border p-8 rounded text-center my-4 shadow-sm">
      <div className="mx-auto w-12 h-12 rounded-full bg-govt-light border border-govt-border flex items-center justify-center text-slate-500 mb-3">
        <Icon className="w-6 h-6 text-govt-blue" />
      </div>
      <h3 className="text-base font-bold text-govt-navy mb-1">{title}</h3>
      <p className="text-xs text-slate-600 max-w-md mx-auto mb-4 leading-relaxed">{description}</p>
      
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-3.5 py-1.5 border border-transparent text-xs font-semibold rounded text-white bg-govt-blue hover:bg-blue-900 transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
