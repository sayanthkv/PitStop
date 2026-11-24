import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    nickname: {
      type: String,
      required: true,
      trim: true,
      default: 'My NTORQ',
    },
    model: {
      type: String,
      required: true,
      trim: true,
      default: 'TVS NTORQ 125 Race Edition',
    },
    year: {
      type: Number,
      required: true,
      default: 2023,
    },
    registrationNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    fuelType: {
      type: String,
      default: 'Petrol',
    },
    tankCapacity: {
      type: Number,
      required: true, // entered by user, never hardcoded
      min: 1,
    },
    reserveLevel: {
      type: Number,
      required: true,
      default: 1.0, // default 1 litre
      min: 0.1,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    currentOdometer: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    photoUrl: {
      type: String,
      default: null,
    },
    photoPublicId: {
      type: String,
      default: null,
    },
    manualFuelCorrection: {
      litres: { type: Number, default: null },
      odometer: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },
    isPrimary: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

vehicleSchema.index({ user: 1, isPrimary: 1 });

export const Vehicle = mongoose.model('Vehicle', vehicleSchema);
