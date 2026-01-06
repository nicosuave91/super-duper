import { z, ZodError } from "zod";
import { AppError } from "./errors/appError";

export function parseOrThrow<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  context?: { where?: "query" | "body" | "params"; route?: string }
): z.infer<T> {
  const parsed = schema.safeParse(data);
  if (parsed.success) return parsed.data;

  const details = {
    where: context?.where ?? "body",
    route: context?.route ?? "",
    issues: parsed.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
      code: i.code,
    })),
  };

  throw new AppError(400, "validation.invalid", "Invalid request", details);
}

export function zodErrorToAppError(err: unknown) {
  if (!(err instanceof ZodError)) return null;

  return new AppError(400, "validation.invalid", "Invalid request", {
    issues: err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
      code: i.code,
    })),
  });
}
