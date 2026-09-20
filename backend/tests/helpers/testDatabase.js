import mongoose from "mongoose";

export const testMongoUri =
  process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017/landzo_auth_test";

const assertTestDatabase = () => {
  const dbName = mongoose.connection.db?.databaseName || "";

  if (!dbName.toLowerCase().includes("test")) {
    throw new Error(`Refusing to mutate non-test database: ${dbName}`);
  }
};

export const connectTestDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    return;
  }

  await mongoose.connect(testMongoUri);
  assertTestDatabase();
};

export const resetTestDatabase = async () => {
  assertTestDatabase();
  await mongoose.connection.db.dropDatabase();
};

export const clearTestDatabase = async () => {
  assertTestDatabase();
  const collections = await mongoose.connection.db.collections();

  await Promise.all(collections.map((collection) => collection.deleteMany({})));
};

export const disconnectTestDatabase = async () => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  assertTestDatabase();
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
};
