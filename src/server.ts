import { app } from "@/app.js";
import { connectDatabase, disconnectDatabase } from "@/config/database.js";
import { env } from "@/config/env.js";
import { logger } from "@/shared/utils/logger.js";

let shuttingDown = false;

async function startServer(): Promise<void> {
  await connectDatabase(env.MONGODB_URI);
  logger.info("Database connection established");

  const server = app.listen(env.PORT, () => {
    logger.info("API server listening", {
      port: env.PORT,
      environment: env.NODE_ENV
    });
  });

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.warn("Shutdown signal received", { signal });

    server.close(async () => {
      await disconnectDatabase();
      logger.info("HTTP server closed and database disconnected");
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("Forced shutdown timeout reached", { timeoutMs: 10_000 });
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
}

startServer().catch((error: unknown) => {
  logger.errorWithCause("Failed to start server", error);
  process.exit(1);
});
