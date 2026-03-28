import { env } from "@/config/env.js";

type LogLevel = "debug" | "info" | "warn" | "error";

const levelWeight: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function shouldLog(level: LogLevel): boolean {
  return levelWeight[level] >= levelWeight[env.LOG_LEVEL];
}

function serializeError(error: unknown): Record<string, string> | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack ?? ""
  };
}

function write(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(metadata ?? {})
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  debug(message: string, metadata?: Record<string, unknown>): void {
    write("debug", message, metadata);
  },
  info(message: string, metadata?: Record<string, unknown>): void {
    write("info", message, metadata);
  },
  warn(message: string, metadata?: Record<string, unknown>): void {
    write("warn", message, metadata);
  },
  error(message: string, metadata?: Record<string, unknown>): void {
    write("error", message, metadata);
  },
  errorWithCause(message: string, error: unknown, metadata?: Record<string, unknown>): void {
    write("error", message, {
      ...(metadata ?? {}),
      error: serializeError(error)
    });
  }
};
