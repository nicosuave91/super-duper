import { FastifyRequest, FastifyReply } from 'fastify'
import { validateJwt } from '../auth/jwt'

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing Authorization header' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = await validateJwt(token)
    request.user = payload  // Inject into request context
  } catch (err) {
    request.log.warn({ err }, 'Invalid JWT')
    return reply.status(401).send({ error: 'Invalid or expired token' })
  }
}
