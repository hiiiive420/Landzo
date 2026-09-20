import mongoose from "mongoose";
import { logger } from "../common/logging/logger.js";

export const connectMongoDB = async (mongoUri) => {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });

    logger.info("MongoDB connected");
  } catch (error) {
    logger.error("MongoDB connection failed", {
      errorName: error?.name,
    });
    throw error;
  }
};

export const disconnectMongoDB = async () => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
  logger.info("MongoDB disconnected");
};
