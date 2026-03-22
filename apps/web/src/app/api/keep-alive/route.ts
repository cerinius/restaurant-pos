import { NextResponse } from 'next/server';

const HEALTH_PATH = '/health';

function getHealthUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    return null;
  }

  return new URL(HEALTH_PATH, apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`);
}

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return true;
  }

  const authorization = request.headers.get('authorization');
  return authorization === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const healthUrl = getHealthUrl();

  if (!healthUrl) {
    return NextResponse.json(
      { ok: false, error: 'NEXT_PUBLIC_API_URL is not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'user-agent': 'restaurant-pos-keep-alive',
      },
    });

    const body = await response.text();

    return NextResponse.json(
      {
        ok: response.ok,
        status: response.status,
        healthUrl: healthUrl.toString(),
        body,
      },
      { status: response.ok ? 200 : 502 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to reach API health endpoint',
        healthUrl: healthUrl.toString(),
      },
      { status: 502 }
    );
  }
}
