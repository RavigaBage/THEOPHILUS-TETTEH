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
                role: 'admin'
            });
            console.log('✅ Default admin user created (admin@iac.com / Admin@1234)');
        }
    } catch (err) {
        console.error('Error seeding initial user:', err.message);
    }
};

const connectDB = async () => {
    const uri = process.env.MONGO_URL || 'mongodb://localhost:27017/Iac_db';
    try {
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 2000,
        });
        console.log(`MongoDB connected: ${conn.connection.host}`);
        await seedInitialData();
    } catch (error) {
        console.log(`MongoDB connection to ${uri} failed (${error.message}). Falling back to MongoMemoryServer...`);
        try {
            mongoServer = await MongoMemoryServer.create();
            const memoryUri = mongoServer.getUri();
            const conn = await mongoose.connect(memoryUri);
            console.log(`MongoDB Memory Server connected at: ${memoryUri}`);
            await seedInitialData();
        } catch (memError) {
            console.error('Failed to start MongoMemoryServer:', memError.message);
            process.exit(1);
        }
    }
};

module.exports = connectDB;
