// EdgeOne Pages Edge Function:
//   https://hugozhu.site/api/functions/v1/*  ->  Supabase Edge Functions
// Used by ai-notepad (/notes) for DingTalk login (dingtalk-auth / dingtalk-sso / dingtalk-callback).
// Same behaviour as the `handle /api/functions/v1/*` block in us4's Caddyfile.
const UPSTREAM = 'https://xryosrxuoqwohyqxszhs.supabase.co';

export async function onRequest({ request }) {
  const url = new URL(request.url);
  const target = UPSTREAM + url.pathname.replace(/^\/api/, '') + url.search;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('x-forwarded-host');

  const init = { method: request.method, headers, redirect: 'manual' };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  const resp = await fetch(target, init);
  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: resp.headers,
  });
}
