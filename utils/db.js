import mongoose from "mongoose";
import {} from "dotenv/config";

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("MONGO_URI is not defined in environment variables");
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGO_URI, );
    
    console.log("📦 Database connected successfully....");
    
    // Add event listeners for connection issues
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
  } catch (error) {
    console.error("❌ Database connection error:", error.message);
    // Exit process with failure on critical connection errors
    process.exit(1);
  }
};

export default connectDB;
