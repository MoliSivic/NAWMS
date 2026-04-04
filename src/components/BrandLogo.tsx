import React, { useState } from 'react';
import { Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

const BRAND_LOGO_SRC = '/logo.png';

interface BrandLogoProps {
  alt?: string;
  className?: string;
  imageClassName?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({
  alt = 'NBC logo',
  className,
  imageClassName,
}) => {
  const [imageMissing, setImageMissing] = useState(false);

  return (
    <div className={cn('inline-flex items-center justify-center', className)}>
      {imageMissing ? (
        <Landmark className={cn('text-sidebar-primary', imageClassName)} aria-hidden="true" />
      ) : (
        <img
          src={BRAND_LOGO_SRC}
          alt={alt}
          className={cn('object-contain', imageClassName)}
          draggable={false}
          onError={() => setImageMissing(true)}
        />
      )}
    </div>
  );
};

export default BrandLogo;
