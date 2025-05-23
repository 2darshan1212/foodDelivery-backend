/**
 * Enhanced server startup script with improved error reporting
 */
import '../index.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup error reporting
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Log to file
  const errorLog = path.join(__dirname, '../logs/error.log');
  fs.mkdir(path.dirname(errorLog), { recursive: true }, (err) => {
    if (err) return console.error('Could not create logs directory:', err);
    
    fs.appendFile(
      errorLog,
      `[${new Date().toISOString()}] Unhandled Rejection: ${reason}\n`,
      (err) => {
        if (err) console.error('Could not write to error log:', err);
      }
    );
  });
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  // Log to file
  const errorLog = path.join(__dirname, '../logs/error.log');
  fs.mkdir(path.dirname(errorLog), { recursive: true }, (err) => {
    if (err) return console.error('Could not create logs directory:', err);
    
    fs.appendFile(
      errorLog,
      `[${new Date().toISOString()}] Uncaught Exception: ${error.stack || error}\n`,
      (err) => {
        if (err) console.error('Could not write to error log:', err);
      }
    );
  });
  
  // Exit with error
  process.exit(1);
});

console.log('Server startup script running with enhanced error reporting enabled.'); 