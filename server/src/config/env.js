/**
 * Environment Variable Loader
 * Loads and validates environment variables using dotenv.
 */
import dotenv from 'dotenv';

// Load .env file from the server root directory
dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/oneclick',
  JWT_SECRET: process.env.JWT_SECRET || 'oneclick-dev-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
};

// Warn if using default JWT secret in production
if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'oneclick-dev-secret-change-in-production') {
  console.warn('⚠️  WARNING: Using default JWT_SECRET in production. Please set a strong secret!');
}

export default env;
