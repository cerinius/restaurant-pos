'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { XMarkIcon } from '@heroicons/react/24/outline';

type DrawerSide = 'right' | 'bottom';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: DrawerSide;
  /** Extra class on the panel */
  className?: string;
  /** Hide the built-in header */
  noHeader?: boolean;
}

const VARIANTS = {
  right: {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit:    { x: '100%', opacity: 0 },
  },
  bottom: {
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit:    { y: '100%', opacity: 0 },
  },
};

export function Drawer({ open, onClose, title, children, side = 'right', className, noHeader = false }: DrawerProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="drawer-overlay"
            onClick={onClose}
            aria-hidden
          />

          {/* Panel */}
          <motion.div
            key="drawer-panel"
            {...VARIANTS[side]}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className={clsx(
              'drawer-panel',
              side === 'right'  && 'drawer-panel-right',
              side === 'bottom' && 'drawer-panel-bottom',
              className,
            )}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {!noHeader && (
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
                <p className="text-base font-bold text-white">{title}</p>
                <button
                  onClick={onClose}
                  className="touch-target inline-flex items-center justify-center rounded-2xl bg-white/5 px-3 text-slate-300 hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

