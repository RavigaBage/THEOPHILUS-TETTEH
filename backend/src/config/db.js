const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');

let mongoServer;

const seedInitialData = async () => {
  try {
    const adminExists = await User.findOne({ email: 'admin@iac.com' });

    if (!adminExists) {
      await User.create({
        name: 'Administrator',
        email: 'admin@iac.com',
        password: 'Admin@1234',
        role: 'admin',
      });

      console.log('✅ Default admin user created (admin@iac.com)');
    }
  } catch (err) {
    console.error('❌ Error seeding default admin:', err.message);
  }
};

const connectDB = async () => {
  const uri = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/Iac_db';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    await seedInitialData();
  } catch (err) {
    console.log(`ℹ️ Local MongoDB not found (${err.message}). Starting MongoMemoryServer...`);
    try {
      mongoServer = await MongoMemoryServer.create();
      const memoryUri = mongoServer.getUri();
      const conn = await mongoose.connect(memoryUri);
      console.log(`✅ MongoDB Memory Server connected at: ${memoryUri}`);
      await seedInitialData();
    } catch (memErr) {
      console.error('❌ Failed to start MongoMemoryServer:', memErr.message);
      process.exit(1);
    }
  }
};

module.exports = connectDB;