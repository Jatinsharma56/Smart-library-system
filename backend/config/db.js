const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
  try {
    let uri = process.env.MONGO_URI;

    // Use memory DB if local is not configured, to let the user run it instantly!
    if (uri === 'mongodb://localhost:27017/library_management') {
      console.log('--- Using Instant Memory Database --- (Data will reset on restart)');
      const mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
