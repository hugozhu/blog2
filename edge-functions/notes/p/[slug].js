// EdgeOne Pages Edge Function:
//   https://hugozhu.site/notes/p/<slug>  ->  Supabase Edge Function `pub-note?slug=<slug>`
// Published ai-notepad notes are rendered server-side by pub-note. The URL is printed by
// `ai-notepad publish` (skills/ai-notepad/cli) and shown in the notepad UI.
// Supabase serves function responses on *.supabase.co as text/plain, so restore text/html.
const UPSTREAM = 'https://xryosrxuoqwohyqxszhs.supabase.co/functions/v1/pub-note';

export async function onRequest({ request, params }) {
  const target = `${UPSTREAM}?slug=${encodeURIComponent(params.slug || '')}`;

  const headers = new Headers();
  for (const name of ['accept', 'accept-language', 'user-agent', 'x-forwarded-for']) {
    const v = request.headers.get(name);
    if (v) headers.set(name, v);
  }

  const resp = await fetch(target, { method: 'GET', headers, redirect: 'manual' });
  const out = new Headers(resp.headers);
  out.set('content-type', 'text/html; charset=utf-8');
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: out });
}
