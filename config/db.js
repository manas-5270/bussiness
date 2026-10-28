const mongoose = require('mongoose');

let mongod = null;

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/business_budget_optimizer';

  // Attempt connection to specified MONGODB_URI first
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500, // Quick timeout if local daemon isn't running
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.warn(`[Database] External MongoDB connection failed (${err.message}).`);
    console.log(`[Database] Initializing seamless embedded in-memory MongoDB instance for zero-friction local development...`);

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongod = await MongoMemoryServer.create({
        instance: {
          dbName: 'business_budget_optimizer'
        }
      });
      const memoryUri = mongod.getUri();
      const conn = await mongoose.connect(memoryUri);
      console.log(`[Database] Embedded In-Memory MongoDB running successfully at ${memoryUri}`);
      return conn;
    } catch (memErr) {
      console.error(`[Database] Failed to initialize embedded MongoDB:`, memErr.message);
      throw memErr;
    }
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
};

module.exports = { connectDB, disconnectDB };
