const mongoose = require('mongoose');
const { restoreData, startAutoSave } = require('../utils/persistentStorage');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await restoreData();
    startAutoSave();
  } catch (error) {
    console.log(`Atlas MongoDB not reachable (${error.message}). Starting MongoMemoryServer with persistent local backup...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      const conn = await mongoose.connect(mongoUri);
      console.log(`In-Memory MongoDB Connected: ${conn.connection.host}`);
      await restoreData();
      startAutoSave();
    } catch (memError) {
      console.error(`Failed to start MongoMemoryServer: ${memError.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;


