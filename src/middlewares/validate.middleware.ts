import { type NextFunction, type Request, type Response } from "express";
import type { ZodTypeAny } from "zod";

import { AppError } from "./error-handler";

type RequestSchemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

export function validateRequest(schemas: RequestSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const checks: Array<["body" | "query" | "params", ZodTypeAny]> = [];

    if (schemas.body) checks.push(["body", schemas.body]);
    if (schemas.query) checks.push(["query", schemas.query]);
    if (schemas.params) checks.push(["params", schemas.params]);

    for (const [segment, schema] of checks) {
      const parsed = schema.safeParse(req[segment]);

      if (!parsed.success) {
        const details = parsed.error.issues
          .map((issue) => `${issue.path.join(".") || segment}: ${issue.message}`)
          .join("; ");

        next(new AppError(`Invalid request ${segment}: ${details}`, 400));
        return;
      }

      req[segment] = parsed.data;
    }

    next();
  };
}
