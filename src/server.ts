import { app } from "@/app.js";
import { connectDatabase, disconnectDatabase } from "@/config/database.js";
import { env } from "@/config/env.js";

let shuttingDown = false;

async function startServer(): Promise<void> {
  await connectDatabase(env.MONGODB_URI);

  const server = app.listen(env.PORT, () => {
    // Keep startup logs lightweight and environment-aware.
    console.log(`API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.log(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });

    setTimeout(() => {
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
  const message = error instanceof Error ? error.message : "Unknown startup error";
  console.error(`Failed to start server: ${message}`);
  process.exit(1);
});
