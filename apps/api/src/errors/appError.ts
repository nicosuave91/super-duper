import type { ErrorCode } from './errorCodes';

export class AppError extends Error {
  public readonly status: number;
  public readonly error_code: ErrorCode;
  public readonly details?: unknown;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.error_code = code;
    this.details = details;
  }
}
