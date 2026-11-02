import http from 'node:http';
import { DomainError, NotFoundError, ValidationError, ConflictError } from '../domain/errors.js';

const statusFor = (e) =>
  e instanceof ValidationError ? 400 : e instanceof NotFoundError ? 404 : e instanceof ConflictError ? 409 : 500;

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    throw new ValidationError('corps JSON invalide', 'invalid_json');
  }
}

function send(res, status, body, headers = {}) {
  if (body === undefined) {
    res.writeHead(status, headers).end();
    return;
  }
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}

// Couche HTTP fine : parse la requête, appelle le service, traduit erreurs -> codes de statut.
export function createApp(service) {
  const routes = [
    ['GET', /^\/rooms$/, async () => [200, await service.listRooms()]],
    ['GET', /^\/rooms\/([^/]+)\/bookings$/, async ({ params, query }) =>
      [200, await service.getPlanning(params[0], query.get('from'), query.get('to'))]],
    ['POST', /^\/rooms\/([^/]+)\/bookings$/, async ({ params, req }) => {
      const dto = await service.createBooking(params[0], await readJson(req));
      return [201, dto, { location: `/bookings/${dto.id}` }];
    }],
    ['GET', /^\/bookings\/([^/]+)$/, async ({ params }) => [200, await service.getBooking(params[0])]],
    ['DELETE', /^\/bookings\/([^/]+)$/, async ({ params }) => {
      await service.cancelBooking(params[0]);
      return [204];
    }],
    ['GET', /^\/members\/([^/]+)\/bookings$/, async ({ params }) =>
      [200, await service.listMemberBookings(params[0])]],
  ];

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      for (const [method, re, handler] of routes) {
        const m = re.exec(url.pathname);
        if (m && req.method === method) {
          const [status, body, headers] = await handler({
            req, query: url.searchParams, params: m.slice(1).map(decodeURIComponent),
          });
          return send(res, status, body, headers);
        }
      }
      send(res, 404, { error: 'route_not_found', message: 'route inconnue' });
    } catch (e) {
      if (e instanceof DomainError) return send(res, statusFor(e), { error: e.code, message: e.message });
      console.error(e);
      send(res, 500, { error: 'internal_error', message: 'erreur interne' });
    }
  });
}
