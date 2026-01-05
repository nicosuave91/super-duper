import type { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const request_id = (req as any).request_id ?? null;

  const status = typeof err?.status === "number" ? err.status : 500;
  const message =
    status >= 500
      ? "Unexpected server error"
      : err?.message || "Request failed";

  res.status(status).json({
    request_id,
    error_code: err?.error_code ?? "error",
    message,
    details: err?.details ?? null,
  });
}
