import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  className?: string;
  alt: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  fallbackSrc,
  alt,
  className = '',
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState<string | undefined>(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(src);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (!hasError) {
      if (fallbackSrc && imgSrc !== fallbackSrc) {
        setImgSrc(fallbackSrc);
      } else {
        setHasError(true);
      }
    }
  };

  if (hasError || !imgSrc) {
    return (
      <div
        className={`bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-3 text-slate-400 select-none ${className}`}
      >
        <Building2 className="w-8 h-8 text-slate-500 mb-1 opacity-70" />
        <span className="text-[11px] font-semibold text-slate-400 text-center line-clamp-1">
          {alt || 'Dam Infrastructure Asset'}
        </span>
        <span className="text-[9px] text-slate-500">HydroVision AI Verified Photo</span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={handleError}
      className={className}
      {...props}
    />
  );
};

