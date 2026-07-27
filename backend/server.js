require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const connectDB = require('./src/config/db');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const SocketService = require("./src/services/socketService");
const {registerAgentService} = require("./src/services/RegisterDevice");
const { initServices } = require("./src/services");
const createProtectedRoutes =require('./src/routes/protected');
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});
const socketService = new SocketService(io);
socketService.emitToDevice("LAB-PC-01", "cmd:test", {
    message: "Hello from server 🎯"
});
connectDB();

app.use(express.json());
const IpRateLimiter = rateLimit({
   windowMs: 15 * 60 * 1000,
    max: 50,
    message: { message: 'Too many requests from this IP' },
});

app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))
const { commandService } = initServices(socketService);
app.use(IpRateLimiter);
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/public', require('./src/routes/public'));
app.use('/api', createProtectedRoutes(commandService));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use((err,req,res,next)=>{
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        message: err.message || 'Internal server error',
    });
});



const PORT = process.env.PORT || 5000


io.on("connection", (socket) => {
    console.log("🟢 Agent connected:", socket.id);



    socket.on("disconnect", () => {
        console.log("🔴 Agent disconnected:", socket.id);
    });

    socket.on("agent:register", async (data) => {
        socket.join(`device:${data.deviceId}`);
        await registerAgentService(data);
        socketService.registerDevice(data.deviceId, socket);

        console.log('devices registered');
        
    });

    socket.on("cmd:test", (payload) => {
    console.log("📨 Test command received:", payload);

    socket.emit("cmd:test:response", {
      message: "Agent received command successfully 🎯",
      time: Date.now()
    });
  });

});

app.get("/test", (req, res) => {
    io.emit("cmd:test", { message:''});
    res.send("Test command sent");
});
server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
});