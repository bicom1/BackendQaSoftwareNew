const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log(`Database connected: ${mongoose.connection.host}`.bgCyan);
  } catch (err) {
    console.error('Database connection failed:'.red, err);
    process.exit(1);
  }
};

module.exports = connectDB;
