import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const locationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number]
    },
    city: String,
    address: String,
    source: {
      type: String,
      enum: ['gps', 'estimated', 'manual'],
      default: 'manual'
    },
    accuracy: Number,
    pincode: {
      type: String
    }
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    notifications: {
      requestAlerts: { type: Boolean, default: true },
      donorMatches: { type: Boolean, default: true },
      statusUpdates: { type: Boolean, default: true },
      nearbyCampaigns: { type: Boolean, default: false },
      emailDigest: { type: Boolean, default: false },
    },
    accessibility: {
      reducedMotion: { type: Boolean, default: false },
      highContrast: { type: Boolean, default: false },
      largerText: { type: Boolean, default: false },
      keyboardShortcuts: { type: Boolean, default: true },
    },
    donorSearch: {
      defaultRadiusKm: { type: Number, default: 10, min: 2, max: 50 },
      availableOnly: { type: Boolean, default: true },
      prioritizeNearest: { type: Boolean, default: true },
      autoRefresh: { type: Boolean, default: true },
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  hasPassword: {
    type: Boolean,
    default: true
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['donor', 'requester', 'admin'],
    default: 'requester'
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  needsOnboarding: {
    type: Boolean,
    default: false
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: function() { return this.role === 'donor'; }
  },
  location: {
    type: locationSchema,
    default: undefined
  },
  availability: {
    type: Boolean,
    default: true
  },
  settings: {
    type: settingsSchema,
    default: () => ({})
  },
  lastDonated: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for geo-spatial queries
userSchema.index({ location: '2dsphere' });

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  const coords = this.location?.coordinates;
  const hasValidLocation =
    this.location?.type === 'Point' &&
    Array.isArray(coords) &&
    coords.length >= 2 &&
    Number.isFinite(Number(coords[0])) &&
    Number.isFinite(Number(coords[1]));

  if (this.location && !hasValidLocation) {
    this.location = undefined;
  }

  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  this.hasPassword = true;
  next();
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
