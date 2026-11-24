import mongoose from 'mongoose';

const fuelEntrySchema = new mongoose.Schema(
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
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    odometer: {
      type: Number,
      required: true,
      min: 0,
    },
    litres: {
      type: Number,
      required: true,
      min: 0.1,
    },
    pricePerLitre: {
      type: Number,
      required: true,
      min: 1,
    },
    totalCost: {
      type: Number,
      required: true,
      min: 1,
    },
    isFullTank: {
      type: Boolean,
      default: true,
    },
    station: {
      type: String,
      default: '',
    },
    note: {
      type: String,
      default: '',
    },
    receiptUrl: {
      type: String,
      default: null,
    },
    receiptPublicId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

fuelEntrySchema.index({ user: 1, vehicle: 1, date: -1 });
fuelEntrySchema.index({ user: 1, vehicle: 1, odometer: 1 });

export const FuelEntry = mongoose.model('FuelEntry', fuelEntrySchema);
