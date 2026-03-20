import { type NextFunction, type Request, type Response } from "express";
import { type ZodTypeAny, type infer as zInfer } from "zod";

import { AppError } from "./error-handler";

type RequestSchemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

type InferSchemas<T extends RequestSchemas> = {
  body: T["body"] extends ZodTypeAny ? zInfer<T["body"]> : undefined;
  query: T["query"] extends ZodTypeAny ? zInfer<T["query"]> : undefined;
  params: T["params"] extends ZodTypeAny ? zInfer<T["params"]> : undefined;
};

export function validateRequest<T extends RequestSchemas>(schemas: T) {
  return (
    req: Request,
    _res: Response,
    next: NextFunction
  ): void => {
    type Segment = "body" | "query" | "params";
    const validated: Partial<Record<Segment, unknown>> = {};
    const checks: Array<[Segment, ZodTypeAny]> = [];

    if (schemas.body) checks.push(["body", schemas.body]);
    if (schemas.query) checks.push(["query", schemas.query]);
    if (schemas.params) checks.push(["params", schemas.params]);

    for (const [segment, schema] of checks) {
      const parsed = schema.safeParse(req[segment]);

      if (!parsed.success) {
        const details = parsed.error.issues
          .map((issue) => `${issue.path.join(".") || segment}: ${issue.message}`)
          .join("; ");

        return next(new AppError(`Invalid request ${segment}: ${details}`, 400));
      }

      validated[segment] = parsed.data;
    }

    req.validated = validated as Partial<InferSchemas<T>>;

    next();
  };
}


export function requireValidatedBody<T>(req: Request): T {
  if (!req.validated?.body) {
    throw new AppError("Validated request body is missing", 500, true, "INTERNAL_ERROR");
  }

  return req.validated.body as T;
}

