const mongoose = require('mongoose')

const connectDB = async ()=>{
    try{
        
        const conn = await mongoose.connect(process.env.MONGO_URL);
        console.log(`MongoDB connected: ${conn.connection.host}`);
        
    }catch(error){
        console.log(`MongoDB could not connect: ${error.message}`);
        process.exit(1);
    }
}
module.exports  = connectDB;