export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
