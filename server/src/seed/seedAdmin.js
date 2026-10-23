/**
 * Seed Admin Script
 * Creates the initial super_admin user if one doesn't already exist.
 * Run with: npm run seed
 */
import mongoose from 'mongoose';
import User from '../models/User.js';
import env from '../config/env.js';

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if a super_admin already exists
    const existingAdmin = await User.findOne({ role: 'super_admin' });

    if (existingAdmin) {
      console.log('ℹ️  Super admin already exists:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log('   Skipping seed. No changes made.');
    } else {
      // Create the default super admin
      const admin = await User.create({
        name: 'Super Admin',
        email: 'admin@1click.com',
        passwordHash: 'admin123456',
        role: 'super_admin',
      });

      console.log('🎉 Super admin created successfully!');
      console.log('   ─────────────────────────────────');
      console.log(`   Name:     ${admin.name}`);
      console.log(`   Email:    ${admin.email}`);
      console.log(`   Password: admin123456`);
      console.log(`   Role:     ${admin.role}`);
      console.log('   ─────────────────────────────────');
      console.log('   ⚠️  Change this password immediately in production!');
    }

    // Disconnect and exit
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedAdmin();
