import React from 'react';
import BrandLogo from '@/components/BrandLogo';
import { cn } from '@/lib/utils';

interface BrandLockupProps {
  variant?: 'sidebar' | 'hero';
  className?: string;
}

const BrandLockup: React.FC<BrandLockupProps> = ({ variant = 'sidebar', className }) => {
  if (variant === 'hero') {
    return (
      <div className={cn('flex flex-col items-center text-center', className)}>
        <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] border border-navy-500/70 bg-[radial-gradient(circle_at_top,_rgba(92,153,214,0.22),_rgba(21,36,68,0.96)_62%,_rgba(13,24,47,1)_100%)] shadow-[0_24px_64px_rgba(4,10,24,0.45)] ring-1 ring-white/5">
          <div className="absolute inset-[10px] rounded-[1.3rem] border border-white/5" />
          <BrandLogo imageClassName="relative z-10 h-16 w-16" />
        </div>
        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-[0.34em] text-navy-300">
            National Bank of Cambodia
          </p>
          <h1 className="mt-3 text-4xl font-semibold uppercase tracking-[0.28em] text-primary-foreground">
            NBC
          </h1>
          <p className="mt-2 text-sm text-navy-300">
            Automated warehouse operations portal
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-sidebar-accent to-sidebar-background shadow-[0_12px_30px_rgba(0,0,0,0.28)] ring-1 ring-inset ring-white/5">
        <BrandLogo imageClassName="h-8 w-8" />
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold uppercase tracking-[0.26em] text-sidebar-foreground">
          NBC
        </p>
        <p className="truncate text-[10px] text-sidebar-foreground/55">
          National Bank of Cambodia
        </p>
      </div>
    </div>
  );
};

export default BrandLockup;
