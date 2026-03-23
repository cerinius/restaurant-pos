import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getRestaurantLoginPath } from '@/lib/paths';
import { formatRestaurantHours, normalizeRestaurantSiteSettings } from '@/lib/restaurant-site';
import { getPublicRestaurantSite } from '@/lib/server-api';

export const dynamic = 'force-dynamic';

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace('#', '').trim();
  const normalized =
    value.length === 3
      ? value
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : value;

  if (normalized.length !== 6) {
    return `rgba(245, 158, 11, ${alpha})`;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function buildPhoneHref(phone?: string | null) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : '';
}

function currency(amount: number) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

export default async function RestaurantPublicHomepage({
  params,
}: {
  params: { restaurantId: string };
}) {
  const restaurant = await getPublicRestaurantSite(params.restaurantId);

  if (!restaurant) {
    notFound();
  }

  const site = normalizeRestaurantSiteSettings(restaurant.settings, restaurant);
  const primaryLocation = restaurant.locations?.[0] || null;
  const accent = site.themeAccent || '#f59e0b';
  const accentSoft = hexToRgba(accent, 0.16);
  const accentGlow = hexToRgba(accent, 0.28);
  const phoneHref = buildPhoneHref(restaurant.phone || primaryLocation?.phone);
  const orderHref = site.orderUrl.trim() || phoneHref || '#menu';
  const reservationHref = site.reservationUrl.trim() || phoneHref || '#visit';
  const featuredItems = (restaurant.menu || [])
    .flatMap((category: any) => category.items || [])
    .filter((item: any) => item.isFeatured || item.isPopular)
    .slice(0, 6);
  const menuPreviewItems =
    featuredItems.length > 0
      ? featuredItems
      : (restaurant.menu || []).flatMap((category: any) => category.items || []).slice(0, 6);

  return (
    <main
      className="min-h-screen text-slate-50"
      style={{
        background: `radial-gradient(circle at top left, ${accentGlow}, transparent 28%), radial-gradient(circle at top right, rgba(34,211,238,0.14), transparent 24%), linear-gradient(180deg, #07111f 0%, #0c1728 52%, #020617 100%)`,
      }}
    >
      <div className="border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="section-kicker">Public restaurant homepage</p>
            <h1 className="mt-1 text-lg font-black text-white">{restaurant.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a href="#menu" className="btn-secondary">
              View menu
            </a>
            <Link href={getRestaurantLoginPath(params.restaurantId)} className="btn-secondary">
              Staff sign in
            </Link>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-10 lg:pt-16">
        <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <div
              className="status-chip border-transparent"
              style={{ backgroundColor: accentSoft, color: '#fff' }}
            >
              {site.announcement}
            </div>
            <h2 className="mt-6 max-w-4xl text-5xl font-black leading-[0.96] text-white sm:text-6xl">
              {site.heroHeadline}
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              {site.heroDescription}
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href={orderHref}
                className="btn-primary px-6 py-4 text-base"
                style={{ backgroundColor: accent }}
              >
                {site.orderUrl.trim() ? 'Order online' : phoneHref ? 'Call to order' : 'Explore menu'}
              </a>
              <a href={reservationHref} className="btn-secondary px-6 py-4 text-base">
                {site.reservationUrl.trim() ? 'Reserve a table' : phoneHref ? 'Call for reservations' : 'Plan your visit'}
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Cuisine', value: site.cuisine },
                { label: 'Neighborhood', value: site.neighborhood || 'Local favorite' },
                { label: 'Price range', value: site.priceRange || '$$' },
              ].map((item) => (
                <div key={item.label} className="metric-tile">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-3 text-lg font-bold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel overflow-hidden p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-kicker">Tonight at {restaurant.name}</p>
                <h3 className="mt-2 text-3xl font-black text-white">Guest-ready from the first click</h3>
              </div>
              <div
                className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white"
                style={{ backgroundColor: accentSoft }}
              >
                Premium site
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {site.highlights.map((highlight) => (
                <div key={highlight} className="soft-panel px-4 py-4 text-sm text-slate-200">
                  {highlight}
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="soft-panel p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Location</p>
                <p className="mt-3 text-lg font-bold text-white">{primaryLocation?.name || restaurant.name}</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  {primaryLocation?.address || restaurant.address || 'Address can be added from owner settings.'}
                </p>
              </div>
              <div className="soft-panel p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Contact</p>
                <p className="mt-3 text-sm text-slate-200">{restaurant.phone || primaryLocation?.phone || 'Phone coming soon'}</p>
                <p className="mt-2 text-sm text-slate-300">{restaurant.email || 'hello@example.com'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="card p-8">
            <p className="section-kicker">The story</p>
            <h3 className="mt-3 text-3xl font-black text-white">{site.storyTitle}</h3>
            <p className="mt-5 text-base leading-8 text-slate-300">{site.storyBody}</p>
          </div>

          <div className="card p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-kicker">Guest favorites</p>
                <h3 className="mt-3 text-3xl font-black text-white">Menu highlights worth leading with</h3>
              </div>
              <a href="#menu" className="btn-secondary">
                Full menu
              </a>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {menuPreviewItems.map((item: any) => (
                <div key={item.id} className="soft-panel p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold text-white">{item.name}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-300">
                        {item.description || 'A menu highlight synced directly from RestaurantOS.'}
                      </p>
                    </div>
                    <p className="shrink-0 text-base font-black text-white">{currency(item.basePrice)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="menu" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 max-w-3xl">
          <p className="section-kicker">Full menu</p>
          <h3 className="mt-3 text-4xl font-black text-white">Everything guests need before they walk in</h3>
          <p className="mt-4 text-base leading-8 text-slate-300">
            This menu is pulled from the live restaurant setup, so featured items, descriptions, and prices stay aligned with the operational system.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {(restaurant.menu || []).map((category: any) => (
            <section key={category.id} className="card p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-2xl font-black text-white">{category.name}</h4>
                  <p className="mt-2 text-sm text-slate-400">
                    {category.description || 'Curated for guests to browse quickly and confidently.'}
                  </p>
                </div>
                {category.color && (
                  <span
                    className="h-4 w-4 rounded-full border border-white/10"
                    style={{ backgroundColor: category.color }}
                  />
                )}
              </div>

              <div className="mt-6 space-y-4">
                {(category.items || []).map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 border-b border-white/10 pb-4 last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">{item.name}</p>
                        {item.isPopular && (
                          <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-100">
                            Popular
                          </span>
                        )}
                        {item.isFeatured && (
                          <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-100">
                            Featured
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-slate-400">
                        {item.description || 'Description coming soon.'}
                      </p>
                    </div>
                    <p className="shrink-0 text-base font-black text-white">{currency(item.basePrice)}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section id="visit" className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="card p-6">
            <p className="section-kicker">Visit us</p>
            <h3 className="mt-3 text-3xl font-black text-white">Hours and location</h3>
            <div className="mt-6 space-y-3">
              {site.hours.map((entry) => (
                <div
                  key={entry.day}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <span className="font-semibold text-slate-100">{entry.day}</span>
                  <span className="text-sm text-slate-300">{formatRestaurantHours(entry)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <p className="section-kicker">Plan the experience</p>
            <h3 className="mt-3 text-3xl font-black text-white">Easy next steps for guests</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <a href={orderHref} className="soft-panel p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Order</p>
                <p className="mt-3 text-xl font-black text-white">
                  {site.orderUrl.trim() ? 'Online ordering' : 'Order by phone'}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  Direct guests to the ordering flow that fits your operation right now.
                </p>
              </a>
              <a href={reservationHref} className="soft-panel p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Reserve</p>
                <p className="mt-3 text-xl font-black text-white">
                  {site.reservationUrl.trim() ? 'Reservations' : 'Call ahead seating'}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  Make booking and planning simple from the same branded page.
                </p>
              </a>
            </div>

            <div className="mt-6 soft-panel p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Address</p>
              <p className="mt-3 text-lg font-bold text-white">
                {primaryLocation?.name || restaurant.name}
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                {primaryLocation?.address || restaurant.address || 'Add your location address in owner settings.'}
              </p>
            </div>
          </section>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-slate-950/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>{restaurant.name} on RestaurantOS</p>
          <div className="flex flex-wrap items-center gap-4">
            <a href="#menu" className="hover:text-white">
              Menu
            </a>
            <a href="#visit" className="hover:text-white">
              Hours
            </a>
            <Link href="/" className="hover:text-white">
              Powered by RestaurantOS
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
