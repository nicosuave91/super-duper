import { randomUUID } from 'node:crypto';
import type { FastifyRequest } from 'fastify';

export function getOrCreateRequestId(req: FastifyRequest): string {
  const header = req.headers['x-request-id'];
  if (typeof header === 'string' && header.trim()) return header.trim();
  if (Array.isArray(header) && header[0]?.trim()) return header[0].trim();
  return randomUUID();
}
