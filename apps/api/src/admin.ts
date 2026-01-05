import type { FastifyInstance } from 'fastify';
import { requireJwt, requirePermission, getRequestId } from './auth/epic2Auth';

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  app.get('/admin/me', async (req) => {
    await requireJwt(req);
    requirePermission(req, 'admin:read');

    return {
      ok: true,
      request_id: getRequestId(req),
    };
  });
}
