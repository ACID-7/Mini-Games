import { createGameApi } from '../../lib/game-engine.mjs';
import { createFirebaseStore } from '../../lib/firebase-store.mjs';

export default async (request) => {
  const api = createGameApi(createFirebaseStore());
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/^\/\.netlify\/functions\/api/, '') || '/';
  let body = {};

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }
  }

  const result = await api.handle({
    method: request.method,
    pathname,
    searchParams: url.searchParams,
    body
  });

  return Response.json(result.data, {
    status: result.status,
    headers: { 'Cache-Control': 'no-store' }
  });
};
