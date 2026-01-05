import { ZodSchema } from 'zod'
import { FastifyRequest, FastifyReply } from 'fastify'

export function validateBody(schema: ZodSchema<any>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.body)

    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        issues: result.error.errors,
      })
    }

    request.body = result.data  // Use parsed + typed input
  }
}
