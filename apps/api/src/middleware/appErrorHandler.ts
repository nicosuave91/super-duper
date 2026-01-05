import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors/appError";
import { getRequestId } from "../auth/epic2Auth";

export function appErrorHandler(err: any, req: FastifyRequest, reply: FastifyReply) {
  const request_id = getRequestId(req);

  if (err instanceof AppError) {
    return reply.code(err.status).send({
      request_id,
      error_code: err.error_code,
      message: err.message,
      details: err.details ?? null,
    });
  }

  const status = typeof err?.statusCode === "number" ? err.statusCode : 500;
  const message = status >= 500 ? "Unexpected server error" : (err?.message ?? "Request failed");

  req.log.error({ err, request_id }, "Unhandled error");

  return reply.code(status).send({
    request_id,
    error_code: "error",
    message,
    details: null,
  });
}
