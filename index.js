const express = require('express');
const mongoose = require('mongoose');  
const colors = require('colors');
const errorHandle = require('./middlewares/errorMiddleware');
require('dotenv').config();

const app = express();


const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log(`Database connected: ${mongoose.connection.host}`.bgCyan);
    } catch (error) {
        console.error('Database connection failed:'.red, error);
        process.exit(1);
    }
};

connectDB()

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/zoho/booking', require('./routes/zohoRoutes'));

// app.use('/api/bitrix', require('./routes/bitrix24Routes'));


app.use(errorHandle);

app.listen(process.env.PORT, () => console.log(`Server started on Port: ${process.env.PORT}`.yellow));

