// Script to list all users
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/user.model.js';

// Load environment variables
dotenv.config();

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// List all users
const listUsers = async () => {
  try {
    // Connect to database
    const conn = await connectDB();

    // Find all users
    const users = await User.find({}).select('username email isAdmin');

    if (users.length === 0) {
      console.log('No users found in the database');
      process.exit(0);
    }

    console.log('\nUsers in the database:');
    console.log('---------------------');
    users.forEach(user => {
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`Admin: ${user.isAdmin ? 'Yes' : 'No'}`);
      console.log('---------------------');
    });
    
    // Disconnect
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Run the script
listUsers(); 