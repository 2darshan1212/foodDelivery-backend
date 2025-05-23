/**
 * This script checks if all required environment variables are set
 * Run this before starting the server to ensure proper configuration
 */

import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars = [
  'MONGO_URI',
  'SECRET_KEY',
  'PORT'
];

const missingVars = [];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    missingVars.push(envVar);
  }
}

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(variable => {
    console.error(`   - ${variable}`);
  });
  console.error('\nPlease set these variables in your .env file or environment.');
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set.');
}

// Check MongoDB URI format
const mongoUri = process.env.MONGO_URI;
if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
  console.error('❌ Invalid MongoDB URI format. URI should start with mongodb:// or mongodb+srv://');
  process.exit(1);
}

console.log('✅ Environment configuration looks good!'); 