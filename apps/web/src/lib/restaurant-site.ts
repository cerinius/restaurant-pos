const DEFAULT_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export interface RestaurantSiteHour {
  day: (typeof DEFAULT_DAYS)[number];
  open: string;
  close: string;
  closed: boolean;
}

export interface RestaurantSiteSettings {
  enabled: boolean;
  announcement: string;
  heroHeadline: string;
  heroDescription: string;
  cuisine: string;
  neighborhood: string;
  priceRange: string;
  orderUrl: string;
  reservationUrl: string;
  storyTitle: string;
  storyBody: string;
  themeAccent: string;
  highlights: string[];
  hours: RestaurantSiteHour[];
}

function toText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function toBool(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

export function getDefaultRestaurantSiteSettings(restaurant?: {
  name?: string | null;
  serviceMode?: string | null;
}): RestaurantSiteSettings {
  const name = restaurant?.name || 'Your restaurant';
  const mode =
    restaurant?.serviceMode === 'BAR'
      ? 'cocktails, food, and regulars'
      : restaurant?.serviceMode === 'QUICK_SERVICE'
        ? 'speed, consistency, and convenience'
        : 'hospitality, timing, and memorable service';

  return {
    enabled: true,
    announcement: 'Now taking reservations and online orders.',
    heroHeadline: `${name}, presented beautifully online.`,
    heroDescription: `${name} can use this premium homepage to share its menu, hours, ordering links, and story in one polished guest-facing experience built right into RestaurantOS.`,
    cuisine: 'Modern hospitality',
    neighborhood: 'Downtown',
    priceRange: '$$',
    orderUrl: '',
    reservationUrl: '',
    storyTitle: 'Built for guests who notice the details',
    storyBody: `Use this page to tell the story of ${name}, highlight signature dishes, and make it easy for guests to book, order, and plan a visit. It is designed for ${mode}.`,
    themeAccent: '#f59e0b',
    highlights: [
      'Menu always synced from RestaurantOS',
      'Shareable public homepage for every location',
      'Online ordering and reservation links in one place',
    ],
    hours: DEFAULT_DAYS.map((day, index) => ({
      day,
      open: index < 5 ? '11:00 AM' : '10:00 AM',
      close: index < 4 ? '09:00 PM' : index < 6 ? '10:00 PM' : '08:00 PM',
      closed: false,
    })),
  };
}

export function normalizeRestaurantSiteSettings(
  rawSettings: any,
  restaurant?: {
    name?: string | null;
    serviceMode?: string | null;
  }
): RestaurantSiteSettings {
  const defaults = getDefaultRestaurantSiteSettings(restaurant);
  const publicSite = rawSettings?.publicSite || {};
  const rawHours = Array.isArray(publicSite.hours) ? publicSite.hours : [];
  const rawHighlights = Array.isArray(publicSite.highlights) ? publicSite.highlights : [];

  return {
    enabled: toBool(publicSite.enabled, defaults.enabled),
    announcement: toText(publicSite.announcement, defaults.announcement),
    heroHeadline: toText(publicSite.heroHeadline, defaults.heroHeadline),
    heroDescription: toText(publicSite.heroDescription, defaults.heroDescription),
    cuisine: toText(publicSite.cuisine, defaults.cuisine),
    neighborhood: toText(publicSite.neighborhood, defaults.neighborhood),
    priceRange: toText(publicSite.priceRange, defaults.priceRange),
    orderUrl: toText(publicSite.orderUrl),
    reservationUrl: toText(publicSite.reservationUrl),
    storyTitle: toText(publicSite.storyTitle, defaults.storyTitle),
    storyBody: toText(publicSite.storyBody, defaults.storyBody),
    themeAccent: toText(publicSite.themeAccent, defaults.themeAccent),
    highlights: defaults.highlights.map((fallback, index) => toText(rawHighlights[index], fallback)),
    hours: defaults.hours.map((fallback) => {
      const match = rawHours.find((entry: any) => entry?.day === fallback.day);
      return {
        day: fallback.day,
        open: toText(match?.open, fallback.open),
        close: toText(match?.close, fallback.close),
        closed: toBool(match?.closed, fallback.closed),
      };
    }),
  };
}

export function withRestaurantSiteSettings(rawSettings: any, siteSettings: RestaurantSiteSettings) {
  return {
    ...(rawSettings || {}),
    publicSite: {
      enabled: siteSettings.enabled,
      announcement: siteSettings.announcement,
      heroHeadline: siteSettings.heroHeadline,
      heroDescription: siteSettings.heroDescription,
      cuisine: siteSettings.cuisine,
      neighborhood: siteSettings.neighborhood,
      priceRange: siteSettings.priceRange,
      orderUrl: siteSettings.orderUrl,
      reservationUrl: siteSettings.reservationUrl,
      storyTitle: siteSettings.storyTitle,
      storyBody: siteSettings.storyBody,
      themeAccent: siteSettings.themeAccent,
      highlights: siteSettings.highlights.map((item) => item.trim()).filter(Boolean),
      hours: siteSettings.hours.map((entry) => ({
        day: entry.day,
        open: entry.open,
        close: entry.close,
        closed: entry.closed,
      })),
    },
  };
}

export function formatRestaurantHours(entry: RestaurantSiteHour) {
  return entry.closed ? 'Closed' : `${entry.open} - ${entry.close}`;
}

export const RESTAURANT_SITE_DAYS = DEFAULT_DAYS;
