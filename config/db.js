const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log(`Database connected: ${mongoose.connection.host}`.bgCyan);
  } catch (err) {
    console.error('Database connection failed:'.red, err);
    if (err.code === 'ENOTFOUND' && err.syscall === 'querySrv') {
      console.error(
        '\nDNS could not resolve your MongoDB Atlas host (querySrv ENOTFOUND). ' +
          'That hostname is not on the public internet — usually wrong URI, deleted cluster, or typo.\n' +
          'Fix: MongoDB Atlas → Database → Connect → copy the current mongodb+srv:// URI into MONGO_URL, ' +
          'or use local MongoDB: MONGO_URL=mongodb://127.0.0.1:27017/yourdb\n'.yellow
      );
    }
    throw err;
  }
};

module.exports = connectDB;

