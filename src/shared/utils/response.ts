import type { Response } from "express";

import type { ApiErrorResponse, ApiSuccessResponse } from "@/shared/types/api-response.js";

export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  data: T,
  meta: Record<string, unknown> = {}
): Response<ApiSuccessResponse<T>> {
  return res.status(statusCode).json({
    success: true,
    data,
    meta
  });
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string
): Response<ApiErrorResponse> {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    }
  });
}
