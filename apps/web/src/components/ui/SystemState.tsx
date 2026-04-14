'use client';

import Link from 'next/link';
import clsx from 'clsx';
import type { ComponentType, SVGProps } from 'react';

interface SystemStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

interface SystemStateProps {
  eyebrow: string;
  title: string;
  description: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  meta?: string;
  actions?: SystemStateAction[];
  className?: string;
}

export function SystemState({
  eyebrow,
  title,
  description,
  Icon,
  meta,
  actions = [],
  className,
}: SystemStateProps) {
  return (
    <div className={clsx('flex min-h-screen items-center justify-center px-4 py-12 sm:px-6', className)}>
      <div className="state-card w-full max-w-2xl overflow-hidden p-8 sm:p-10">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-amber-300/20 bg-amber-400/10 text-amber-200">
            <Icon className="h-8 w-8" />
          </div>
          <div>
            <p className="section-kicker">{eyebrow}</p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
          </div>
        </div>

        <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">{description}</p>
        {meta && <p className="mt-3 text-sm text-slate-500">{meta}</p>}

        {actions.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-3">
            {actions.map((action) =>
              action.href ? (
                <Link
                  key={action.label}
                  href={action.href}
                  className={action.variant === 'secondary' ? 'btn-secondary' : 'btn-primary'}
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={action.variant === 'secondary' ? 'btn-secondary' : 'btn-primary'}
                >
                  {action.label}
                </button>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
