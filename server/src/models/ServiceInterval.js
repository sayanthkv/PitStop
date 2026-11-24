import mongoose from 'mongoose';

const serviceIntervalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    kmInterval: {
      type: Number,
      required: true,
      default: 3000,
    },
    monthInterval: {
      type: Number,
      required: true,
      default: 3,
    },
    averageKmPerDay: {
      type: Number,
      default: 15,
    },
  },
  { timestamps: true }
);

serviceIntervalSchema.index({ user: 1, vehicle: 1 }, { unique: true });

export const ServiceInterval = mongoose.model('ServiceInterval', serviceIntervalSchema);
