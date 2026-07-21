const mongoose = require('mongoose')

const connectDB = async ()=>{
    try{
        mongoose.set('bufferCommands', false);
        const conn = await mongoose.connect(process.env.MONGO_URL)
        .catch(err => console.warn('MongoDB not connected — some features may not work'));
        if (conn){
            console.log(`MongoDB connected: ${conn.connection.host}`);
            console.log("Connected DB:", mongoose.connection.db?.databaseName);
            console.log("Host:", mongoose.connection.host);
        }
    }catch(error){
        console.warn(`Database not connected — using mock`);
    }
}
module.exports  = connectDB;