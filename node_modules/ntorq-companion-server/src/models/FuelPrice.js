import mongoose from 'mongoose';

const fuelPriceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rate: {
      type: Number,
      required: true,
      min: 1,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    fuelType: {
      type: String,
      default: 'Petrol',
    },
    location: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

fuelPriceSchema.index({ user: 1, date: -1 });

export const FuelPrice = mongoose.model('FuelPrice', fuelPriceSchema);
