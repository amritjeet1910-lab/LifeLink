import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import BloodRequest from './models/BloodRequest.js';

dotenv.config();

const users = [
  {
    name: 'System Admin',
    email: 'admin@lifelink.com',
    password: 'admin123',
    role: 'admin',
    location: {
      type: 'Point',
      coordinates: [75.5762, 31.3260],
      city: 'Jalandhar',
      pincode: '144001'
    }
  },
  {
    name: 'Aman Deep',
    email: 'aman@example.com',
    password: 'password123',
    role: 'donor',
    bloodGroup: 'O+',
    location: {
      type: 'Point',
      coordinates: [75.5842, 31.3160], // Near Model Town
      city: 'Jalandhar',
      pincode: '144003'
    },
    availability: true
  },
  {
    name: 'Priya Sharma',
    email: 'priya@example.com',
    password: 'password123',
    role: 'donor',
    bloodGroup: 'A-',
    location: {
      type: 'Point',
      coordinates: [75.5662, 31.3360], // Near Rama Mandi
      city: 'Jalandhar',
      pincode: '144005'
    },
    availability: true
  },
  {
    name: 'Rajinder Singh',
    email: 'rajinder@example.com',
    password: 'password123',
    role: 'donor',
    bloodGroup: 'B+',
    location: {
      type: 'Point',
      coordinates: [75.5962, 31.3460], // Near Cantonment
      city: 'Jalandhar',
      pincode: '144008'
    },
    availability: true
  },
  {
    name: 'Sonia Verma',
    email: 'sonia@example.com',
    password: 'password123',
    role: 'requester',
    location: {
      type: 'Point',
      coordinates: [75.5700, 31.3200],
      city: 'Jalandhar',
      pincode: '144001'
    }
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await BloodRequest.deleteMany({});
    console.log('🗑️  Existing data cleared.');

    // Seed Users
    // We use the model create so that the pre-save hooks (password hashing) trigger
    const createdUsers = await User.create(users);
    console.log('👥 Users seeded successfully.');

    // Seed Blood Requests
    const requester = createdUsers.find(u => u.role === 'requester');
    const donor = createdUsers.find(u => u.role === 'donor' && u.bloodGroup === 'O+');

    const requests = [
      {
        requester: requester._id,
        bloodGroup: 'O+',
        urgency: 'Urgent',
        location: {
          type: 'Point',
          coordinates: [75.5762, 31.3260],
          address: 'Civil Hospital, Jalandhar',
          pincode: '144001'
        },
        hospitalName: 'Civil Hospital',
        status: 'Pending'
      },
      {
        requester: requester._id,
        bloodGroup: 'B+',
        urgency: 'Normal',
        location: {
          type: 'Point',
          coordinates: [75.5962, 31.3460],
          address: 'Military Hospital, Jalandhar Cantt',
          pincode: '144008'
        },
        hospitalName: 'Military Hospital',
        status: 'Completed',
        donor: donor._id,
        completedAt: new Date()
      }
    ];

    await BloodRequest.create(requests);
    console.log('🩸 Blood requests seeded successfully.');

    console.log('📊 Seeding complete!');
    process.exit();
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
};

seedDB();
