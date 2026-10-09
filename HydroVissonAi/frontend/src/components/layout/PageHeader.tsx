import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  name: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  category?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  category,
  breadcrumbs,
  actions,
  children
}) => {
  return (
    <div className="bg-white p-5 rounded-lg border border-govt-border shadow-sm space-y-3 mb-6">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                {crumb.path && !isLast ? (
                  <Link to={crumb.path} className="hover:text-govt-blue transition font-semibold">
                    {crumb.name}
                  </Link>
                ) : (
                  <span className={isLast ? 'text-govt-navy font-bold' : ''}>{crumb.name}</span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Main Header Content */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {category && (
            <div className="inline-block bg-govt-light px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider text-govt-blue border border-govt-border mb-1">
              {category}
            </div>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-govt-navy tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-slate-600 leading-relaxed max-w-4xl">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center space-x-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {children && <div className="pt-2 border-t border-slate-100">{children}</div>}
    </div>
  );
};
