// Script to make a user an admin
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
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Make user an admin
const makeAdmin = async (email) => {
  try {
    // Connect to database
    await connectDB();

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    // Update user to admin
    user.isAdmin = true;
    await user.save();

    console.log(`User ${user.username} (${user.email}) is now an admin`);
    
    // Disconnect
    mongoose.disconnect();
    console.log('MongoDB disconnected');
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Check if email is provided as command line argument
if (process.argv.length < 3) {
  console.error('Please provide an email address');
  console.log('Example: node makeAdmin.js user@example.com');
  process.exit(1);
}

// Get email from command line
const email = process.argv[2];

// Make user an admin
makeAdmin(email); 