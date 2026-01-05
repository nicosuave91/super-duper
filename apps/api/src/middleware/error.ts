import { FastifyError, FastifyRequest, FastifyReply } from 'fastify'

export async function errorMiddleware(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error({ err: error }, 'Internal server error')

  const statusCode = error.statusCode ?? 500
  const message = statusCode === 500
    ? 'Internal server error'
    : error.message

  reply.status(statusCode).send({
    error: error.name,
    message,
  })
}
