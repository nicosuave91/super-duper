import { FastifyRequest, FastifyReply } from 'fastify'

export function requireRole(requiredRole: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const roles = request.user?.roles ?? []

    if (!roles.includes(requiredRole)) {
      request.log.warn({ roles, requiredRole }, 'Access denied: missing role')
      return reply.status(403).send({ error: 'Forbidden: insufficient role' })
    }
  }
}
