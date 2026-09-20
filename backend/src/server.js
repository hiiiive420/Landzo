import { once } from "node:events";
import { pathToFileURL } from "node:url";

import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { connectMongoDB, disconnectMongoDB } from "./db/mongodb.js";
import { logger, sanitizeErrorMessage } from "./common/logging/logger.js";
import { bootstrapSystemRoles } from "./modules/roles-permissions/role.service.js";

const closeHttpServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

export const startServer = async () => {
  const env = loadEnv();

  await connectMongoDB(env.MONGODB_URI);
  await bootstrapSystemRoles();

  const app = createApp({ env });
  const server = app.listen(env.PORT);

  await once(server, "listening");

  logger.info("LANDZO API server started", {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
  });

  let shuttingDown = false;

  const shutdown = async (signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.info("Shutdown signal received", { signal });

    const forcedExit = setTimeout(() => {
      logger.error("Forced shutdown after timeout", { signal });
      process.exit(1);
    }, 10000);
    forcedExit.unref();

    try {
      await closeHttpServer(server);
      await disconnectMongoDB();
      clearTimeout(forcedExit);
      process.exit(0);
    } catch (error) {
      logger.error("Graceful shutdown failed", {
        signal,
        errorName: error?.name,
      });
      clearTimeout(forcedExit);
      process.exit(1);
    }
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  return server;
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch((error) => {
    logger.error("Server startup failed", {
      errorName: error?.name,
      errorCode: error?.code,
      reason: process.env.NODE_ENV === "production" ? undefined : sanitizeErrorMessage(error),
    });
    process.exit(1);
  });
}
