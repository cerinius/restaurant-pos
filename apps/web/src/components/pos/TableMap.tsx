'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  locationId: string;
  onTableSelect: (table: any) => void;
  selectedTableId?: string;
}

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'table-available',
  OCCUPIED: 'table-occupied',
  RESERVED: 'table-reserved',
  DIRTY: 'table-dirty',
  BLOCKED: 'table-blocked',
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  RESERVED: 'Reserved',
  DIRTY: 'Needs Cleaning',
  BLOCKED: 'Blocked',
};

export function TableMap({ locationId, onTableSelect, selectedTableId }: Props) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tables', locationId],
    queryFn: () => api.getTables({ locationId }),
    refetchInterval: 30000,
  });

  const tables: any[] = data?.data || [];

  const sections = Array.from(
    new Set(tables.map((t: any) => t.section).filter(Boolean))
  ) as string[];

  const filtered = activeSection
    ? tables.filter((t: any) => t.section === activeSection)
    : tables;

  const counts = {
    available: tables.filter((t: any) => t.status === 'AVAILABLE').length,
    occupied: tables.filter((t: any) => t.status === 'OCCUPIED').length,
    dirty: tables.filter((t: any) => t.status === 'DIRTY').length,
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-400 text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p>Loading floor plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-4 px-4 py-2 bg-slate-900 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span className="text-slate-400">{counts.available} Available</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
          <span className="text-slate-400">{counts.occupied} Occupied</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />
          <span className="text-slate-400">{counts.dirty} Dirty</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveSection(null)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              !activeSection ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          {sections.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setActiveSection(s === activeSection ? null : s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                activeSection === s ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 relative">
        <div className="relative" style={{ minWidth: 900, minHeight: 700 }}>
          {filtered.map((table: any) => {
            const isSelected = table.id === selectedTableId;
            const hasOrder = table.orders && table.orders.length > 0;
            const order = hasOrder ? table.orders[0] : null;
            const elapsed = order
              ? Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
              : 0;

            return (
              <motion.button
                key={table.id}
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onTableSelect(table)}
                style={{
                  position: 'absolute',
                  left: table.positionX,
                  top: table.positionY,
                  width: table.width || 80,
                  height: table.height || 80,
                  borderRadius:
                    table.shape === 'circle'
                      ? '50%'
                      : table.shape === 'square'
                        ? '12px'
                        : '12px',
                }}
                className={`border-2 flex flex-col items-center justify-center transition-all
                  ${STATUS_STYLES[table.status] || 'table-available'}
                  ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''}
                  ${table.status === 'BLOCKED' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:brightness-110'}
                `}
              >
                <span className="font-bold text-sm leading-none">{table.name}</span>
                {table.capacity && (
                  <span className="text-xs opacity-70 leading-none mt-0.5">{table.capacity}p</span>
                )}
                {hasOrder && (
                  <span className="text-xs font-semibold leading-none mt-0.5 opacity-90">
                    {elapsed}m
                  </span>
                )}
                {order && (
                  <span className="text-xs leading-none opacity-75 truncate px-1 mt-0.5">
                    ${order.total?.toFixed(0)}
                  </span>
                )}
              </motion.button>
            );
          })}

          {filtered.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
              No tables found. Add tables in Admin → Floor Plan.
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-2 border-t border-slate-700 flex items-center gap-4 shrink-0 bg-slate-900">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className={`w-3 h-3 rounded-sm border ${STATUS_STYLES[status]}`} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}