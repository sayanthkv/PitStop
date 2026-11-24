import mongoose from 'mongoose';

const parkingSpotSchema = new mongoose.Schema(
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
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    accuracy: {
      type: Number,
      default: null,
    },
    parkedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    note: {
      type: String,
      default: '',
    },
    photoUrl: {
      type: String,
      default: null,
    },
    photoPublicId: {
      type: String,
      default: null,
    },
    isPickedUp: {
      type: Boolean,
      default: false,
    },
    pickedUpAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

parkingSpotSchema.index({ user: 1, vehicle: 1, parkedAt: -1 });
parkingSpotSchema.index({ user: 1, isPickedUp: 1, parkedAt: -1 });

export const ParkingSpot = mongoose.model('ParkingSpot', parkingSpotSchema);
