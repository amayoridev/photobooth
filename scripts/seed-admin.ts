import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/photobooth';

const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  name: { type: String, default: 'Super Admin' },
  role: { type: String, default: 'superadmin' },
}, { timestamps: true });

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

async function seed() {
  console.log('Connecting to MongoDB Atlas at:', MONGODB_URI);
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2500 });
  } catch {
    console.log('ℹ️ MongoDB not running locally. Updated Standalone MemoryDB with admin:admin credentials.');
    return;
  }

  // 1. Seed admin:admin
  const existingShort = await Admin.findOne({ email: 'admin' });
  if (!existingShort) {
    const passwordHash = await bcrypt.hash('admin', 10);
    await Admin.create({
      email: 'admin',
      passwordHash,
      name: 'Administrator (admin)',
      role: 'superadmin',
    });
    console.log('✅ Created admin account: admin / admin');
  }

  // 2. Seed admin@photobooth.com:admin123456
  const existingFull = await Admin.findOne({ email: 'admin@photobooth.com' });
  if (!existingFull) {
    const passwordHash = await bcrypt.hash('admin123456', 10);
    await Admin.create({
      email: 'admin@photobooth.com',
      passwordHash,
      name: 'Super Administrator',
      role: 'superadmin',
    });
    console.log('✅ Created admin account: admin@photobooth.com / admin123456');
  }

  console.log('🎉 Database seeding completed!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding Error:', err);
  process.exit(1);
});
