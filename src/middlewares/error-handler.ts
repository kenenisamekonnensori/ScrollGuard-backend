import { type NextFunction, type Request, type Response } from "express";

import { sendError } from "../shared/utils/response";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
  }
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = statusCode === 400 ? "INVALID_INPUT" : statusCode === 404 ? "NOT_FOUND" : "INTERNAL_ERROR";

  sendError(res, statusCode, code, err.message);
}
