import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header("x-request-id");
  const id = incoming && incoming.length < 200 ? incoming : crypto.randomUUID();
  (req as any).request_id = id;
  res.setHeader("x-request-id", id);
  next();
}
