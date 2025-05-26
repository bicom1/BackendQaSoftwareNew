require('dotenv').config(); 
const express = require('express');
const colors = require('colors'); 
const mongoose = require('mongoose'); 

const app = express();
const PORT = process.env.PORT || 3000;



const connectDB = async () => {
    if (!process.env.MONGO_URL) {
        console.warn("MONGO_URL not found in .env, skipping MongoDB connection.".yellow);
        return;
    }
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log(`Database connected: ${mongoose.connection.host}`.bgCyan);
    } catch (error) {
        console.error('Database connection failed:'.red, error);
        process.exit(1);
    }
};
connectDB();



app.use(express.json());

app.use(express.urlencoded({ extended: false }));


app.use((req, res, next) => {
        console.log('--- GLOBAL DEBUG: Request Received ---'.magenta);
        console.log('Timestamp:'.magenta, new Date().toISOString());
        console.log('Method:'.magenta, req.method);
        console.log('URL:'.magenta, req.originalUrl);
        console.log('Headers:'.magenta, JSON.stringify(req.headers, null, 2));
        console.log('Parsed Body (req.body):'.magenta, JSON.stringify(req.body, null, 2)); // CRUCIAL!
  
    next();
});

app.get('/', (req, res) => {
    res.send('Bitrix24 API Caller Service is Running!');
});

app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/bitrix24', require('./routes/bitrix24Routes'));


app.use((err, req, res, next) => {
    console.error("Unhandled Error Caught by Global Handler:".red, err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'An unexpected server error occurred.'
    });
});

app.listen(PORT, () => {
    console.log(`Server started on Port: ${String(PORT).bgWhite}`.yellow);
    if (!process.env.BITRIX_API_BASE_URL) {
        console.warn("WARNING: BITRIX_API_BASE_URL is not defined in .env. Bitrix24 calls will fail.".bgRed.white);
    } else {
        console.log(`Bitrix24 API Base URL configured: ${process.env.BITRIX_API_BASE_URL}`.cyan);
    }
});