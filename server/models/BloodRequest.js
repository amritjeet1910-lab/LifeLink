import mongoose from 'mongoose';

const bloodRequestSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  urgency: {
    type: String,
    enum: ['Urgent', 'Normal'],
    default: 'Normal'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: String,
    pincode: {
      type: String,
      required: true
    }
  },
  hospitalName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  statusHistory: [
    {
      status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Completed', 'Cancelled'],
        required: true
      },
      at: {
        type: Date,
        default: Date.now
      },
      by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      note: String
    }
  ],
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acceptedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for geo-spatial queries
bloodRequestSchema.index({ location: '2dsphere' });

export default mongoose.model('BloodRequest', bloodRequestSchema);
