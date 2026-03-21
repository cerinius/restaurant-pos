'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS_PIE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

type SalesByHour = {
  hour: number | string;
  sales: number;
};

type PaymentBreakdown = {
  method: string;
  amount: number;
};

type DailyBreakdown = {
  date: string;
  sales: number;
};

type SalesReport = {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  totalTips: number;
  salesByHour: SalesByHour[];
  paymentBreakdown: PaymentBreakdown[];
  dailyBreakdown?: DailyBreakdown[];
};

type ItemMixRow = {
  id?: string;
  name: string;
  category?: string;
  quantitySold: number;
  revenue: number;
  averagePrice: number;
  revenuePercent?: number;
};

type StaffRow = {
  id?: string;
  name: string;
  ordersHandled?: number;
  sales?: number;
  tips?: number;
  avgOrderValue?: number;
};

type VoidsDiscountsReport = {
  voidCount?: number;
  voidAmount?: number;
  discountCount?: number;
  discountAmount?: number;
  topVoids?: Array<{
    id?: string;
    itemName?: string;
    reason?: string;
    amount?: number;
    voidedBy?: string;
    createdAt?: string;
  }>;
  topDiscounts?: Array<{
    id?: string;
    name?: string;
    type?: string;
    value?: number;
    amount?: number;
    appliedBy?: string;
    createdAt?: string;
  }>;
};

function currency(value?: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function ReportsPage() {
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [activeTab, setActiveTab] = useState<'sales' | 'items' | 'staff' | 'voids'>('sales');

  const { data: salesData, refetch: refetchSales, isLoading: salesLoading } = useQuery({
    queryKey: ['report-sales', dateFrom, dateTo],
    queryFn: () => api.getSalesReport({ dateFrom, dateTo }),
  });

  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['report-items', dateFrom, dateTo],
    queryFn: () => api.getItemMixReport({ dateFrom, dateTo }),
    enabled: activeTab === 'items',
  });

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['report-staff', dateFrom, dateTo],
    queryFn: () => api.getStaffReport({ dateFrom, dateTo }),
    enabled: activeTab === 'staff',
  });

  const { data: voidsData, isLoading: voidsLoading } = useQuery({
    queryKey: ['report-voids', dateFrom, dateTo],
    queryFn: () => api.getVoidsDiscountsReport({ dateFrom, dateTo }),
    enabled: activeTab === 'voids',
  });

  const sales: SalesReport | undefined = salesData?.data;
  const items: ItemMixRow[] = itemsData?.data || [];
  const staff: StaffRow[] = staffData?.data || [];
  const voids: VoidsDiscountsReport | undefined = voidsData?.data;

  const tabs = [
    { id: 'sales', label: 'Sales Overview' },
    { id: 'items', label: 'Item Mix' },
    { id: 'staff', label: 'Staff Performance' },
    { id: 'voids', label: 'Voids & Discounts' },
  ] as const;

  const filteredHourly = useMemo(
    () => sales?.salesByHour?.filter((h) => Number(h.sales) > 0) || [],
    [sales],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-700 bg-slate-950/50 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-slate-100">Reports</h1>

          <div className="flex items-center gap-3">
            <div>
              <label className="label text-xs">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="label text-xs">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input py-1.5 text-sm"
              />
            </div>

            <button onClick={() => refetchSales()} className="btn-secondary mt-5 py-1.5 text-sm">
              Run
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                activeTab === t.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'sales' && (
          <>
            {salesLoading && (
              <div className="card p-6 text-slate-300">Loading sales report...</div>
            )}

            {!salesLoading && sales && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    { label: 'Net Sales', value: currency(sales.totalSales) },
                    { label: 'Total Orders', value: sales.totalOrders },
                    { label: 'Avg Order', value: currency(sales.averageOrderValue) },
                    { label: 'Total Tips', value: currency(sales.totalTips) },
                  ].map((k) => (
                    <div key={k.label} className="card p-4">
                      <p className="mb-1 text-xs text-slate-400">{k.label}</p>
                      <p className="text-2xl font-black text-slate-100">{k.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="card p-5">
                    <h3 className="mb-4 font-bold text-slate-100">Sales by Hour</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={filteredHourly} barSize={16}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                          dataKey="hour"
                          tickFormatter={(h) => `${h}h`}
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                        />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: 8,
                          }}
                        />
                        <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Sales ($)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="card p-5">
                    <h3 className="mb-4 font-bold text-slate-100">Payment Methods</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={sales.paymentBreakdown || []}
                          dataKey="amount"
                          nameKey="method"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ method, percent }: any) =>
                            `${method} ${((percent || 0) * 100).toFixed(0)}%`
                          }
                        >
                          {(sales.paymentBreakdown || []).map((_, i) => (
                            <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: 8,
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {sales.dailyBreakdown && sales.dailyBreakdown.length > 1 && (
                  <div className="card p-5">
                    <h3 className="mb-4 font-bold text-slate-100">Daily Sales</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={sales.dailyBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: 8,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="sales"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                          name="Sales ($)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'items' && (
          <>
            {itemsLoading && <div className="card p-6 text-slate-300">Loading item mix...</div>}

            {!itemsLoading && (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800">
                      <tr>
                        {['Item', 'Category', 'Qty Sold', 'Revenue', 'Avg Price', 'Revenue %'].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                            No item report data found.
                          </td>
                        </tr>
                      ) : (
                        items.map((item, index) => (
                          <tr key={item.id || `${item.name}-${index}`} className="border-t border-slate-800">
                            <td className="px-4 py-3 text-slate-100">{item.name}</td>
                            <td className="px-4 py-3 text-slate-300">{item.category || '-'}</td>
                            <td className="px-4 py-3 text-slate-300">{item.quantitySold}</td>
                            <td className="px-4 py-3 text-slate-300">{currency(item.revenue)}</td>
                            <td className="px-4 py-3 text-slate-300">{currency(item.averagePrice)}</td>
                            <td className="px-4 py-3 text-slate-300">
                              {Number(item.revenuePercent || 0).toFixed(1)}%
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'staff' && (
          <>
            {staffLoading && <div className="card p-6 text-slate-300">Loading staff report...</div>}

            {!staffLoading && (
              <div className="space-y-6">
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-800">
                        <tr>
                          {['Staff', 'Orders', 'Sales', 'Tips', 'Avg Order'].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {staff.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                              No staff report data found.
                            </td>
                          </tr>
                        ) : (
                          staff.map((member, index) => (
                            <tr
                              key={member.id || `${member.name}-${index}`}
                              className="border-t border-slate-800"
                            >
                              <td className="px-4 py-3 text-slate-100">{member.name}</td>
                              <td className="px-4 py-3 text-slate-300">{member.ordersHandled || 0}</td>
                              <td className="px-4 py-3 text-slate-300">{currency(member.sales)}</td>
                              <td className="px-4 py-3 text-slate-300">{currency(member.tips)}</td>
                              <td className="px-4 py-3 text-slate-300">
                                {currency(member.avgOrderValue)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {staff.length > 0 && (
                  <div className="card p-5">
                    <h3 className="mb-4 font-bold text-slate-100">Staff Sales</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={staff}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: 8,
                          }}
                        />
                        <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'voids' && (
          <>
            {voidsLoading && <div className="card p-6 text-slate-300">Loading voids and discounts...</div>}

            {!voidsLoading && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    { label: 'Void Count', value: voids?.voidCount || 0 },
                    { label: 'Void Amount', value: currency(voids?.voidAmount) },
                    { label: 'Discount Count', value: voids?.discountCount || 0 },
                    { label: 'Discount Amount', value: currency(voids?.discountAmount) },
                  ].map((k) => (
                    <div key={k.label} className="card p-4">
                      <p className="mb-1 text-xs text-slate-400">{k.label}</p>
                      <p className="text-2xl font-black text-slate-100">{k.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="card overflow-hidden">
                    <div className="border-b border-slate-800 px-4 py-3">
                      <h3 className="font-bold text-slate-100">Recent Voids</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-800">
                          <tr>
                            {['Item', 'Reason', 'Amount', 'Voided By'].map((h) => (
                              <th
                                key={h}
                                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(voids?.topVoids || []).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                                No void data found.
                              </td>
                            </tr>
                          ) : (
                            (voids?.topVoids || []).map((row, index) => (
                              <tr
                                key={row.id || `${row.itemName}-${index}`}
                                className="border-t border-slate-800"
                              >
                                <td className="px-4 py-3 text-slate-100">{row.itemName || '-'}</td>
                                <td className="px-4 py-3 text-slate-300">{row.reason || '-'}</td>
                                <td className="px-4 py-3 text-slate-300">{currency(row.amount)}</td>
                                <td className="px-4 py-3 text-slate-300">{row.voidedBy || '-'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="card overflow-hidden">
                    <div className="border-b border-slate-800 px-4 py-3">
                      <h3 className="font-bold text-slate-100">Recent Discounts</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-800">
                          <tr>
                            {['Name', 'Type', 'Value', 'Amount', 'Applied By'].map((h) => (
                              <th
                                key={h}
                                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(voids?.topDiscounts || []).length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                                No discount data found.
                              </td>
                            </tr>
                          ) : (
                            (voids?.topDiscounts || []).map((row, index) => (
                              <tr
                                key={row.id || `${row.name}-${index}`}
                                className="border-t border-slate-800"
                              >
                                <td className="px-4 py-3 text-slate-100">{row.name || '-'}</td>
                                <td className="px-4 py-3 text-slate-300">{row.type || '-'}</td>
                                <td className="px-4 py-3 text-slate-300">
                                  {row.type === 'PERCENTAGE'
                                    ? `${Number(row.value || 0).toFixed(2)}%`
                                    : currency(row.value)}
                                </td>
                                <td className="px-4 py-3 text-slate-300">{currency(row.amount)}</td>
                                <td className="px-4 py-3 text-slate-300">{row.appliedBy || '-'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}