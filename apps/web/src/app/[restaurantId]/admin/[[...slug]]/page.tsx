import type { ComponentType } from 'react';
import { notFound } from 'next/navigation';

import RestaurantAdminDashboardPage from '@/modules/restaurant-admin/DashboardPage';
import AuditPage from '@/app/admin/audit/page';
import CombosPage from '@/app/admin/combos/page';
import DiscountsPage from '@/app/admin/discounts/page';
import FloorPage from '@/app/admin/floor/page';
import GiftCardsPage from '@/app/admin/gift-cards/page';
import GuestsPage from '@/app/admin/guests/page';
import HappyHoursPage from '@/app/admin/happy-hours/page';
import IntelligencePage from '@/app/admin/intelligence/page';
import InventoryPage from '@/app/admin/inventory/page';
import MarketingPage from '@/app/admin/marketing/page';
import MenuPage from '@/app/admin/menu/page';
import ModifiersPage from '@/app/admin/modifiers/page';
import OrdersPage from '@/app/admin/orders/page';
import PricingPage from '@/app/admin/pricing/page';
import ReportsPage from '@/app/admin/reports/page';
import ReservationsPage from '@/app/admin/reservations/page';
import SettingsPage from '@/app/admin/settings/page';
import StaffPage from '@/app/admin/staff/page';
import StationsPage from '@/app/admin/stations/page';
import SupportPage from '@/app/admin/support/page';
import TaxesPage from '@/app/admin/taxes/page';
import WorkflowsPage from '@/app/admin/workflows/page';
import WorkforcePage from '@/app/admin/workforce/page';
import { OPERATIONS_INTELLIGENCE_ENABLED } from '@/lib/features';

const PAGE_MAP: Record<string, ComponentType> = {
  '': RestaurantAdminDashboardPage,
  audit: AuditPage,
  combos: CombosPage,
  discounts: DiscountsPage,
  floor: FloorPage,
  'gift-cards': GiftCardsPage,
  guests: GuestsPage,
  'happy-hours': HappyHoursPage,
  inventory: InventoryPage,
  marketing: MarketingPage,
  menu: MenuPage,
  modifiers: ModifiersPage,
  orders: OrdersPage,
  pricing: PricingPage,
  reports: ReportsPage,
  reservations: ReservationsPage,
  settings: SettingsPage,
  staff: StaffPage,
  stations: StationsPage,
  support: SupportPage,
  taxes: TaxesPage,
  workforce: WorkforcePage,
  workflows: WorkflowsPage,
};

if (OPERATIONS_INTELLIGENCE_ENABLED) {
  PAGE_MAP.intelligence = IntelligencePage;
}

export default function RestaurantAdminPage({
  params,
}: {
  params: { slug?: string[] };
}) {
  const key = params.slug?.join('/') || '';
  const Page = PAGE_MAP[key];

  if (!Page) {
    notFound();
  }

  return <Page />;
}
