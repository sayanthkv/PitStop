import mongoose from 'mongoose';

const odometerCorrectionSchema = new mongoose.Schema({
  previousValue: { type: Number, required: true },
  newValue: { type: Number, required: true },
  reason: { type: String, required: true },
  correctedAt: { type: Date, default: Date.now },
});

const odometerReadingSchema = new mongoose.Schema(
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
    reading: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      enum: ['manual', 'ride', 'fuel', 'service'],
      default: 'manual',
    },
    note: {
      type: String,
      default: '',
    },
    corrections: [odometerCorrectionSchema],
  },
  { timestamps: true }
);

odometerReadingSchema.index({ user: 1, vehicle: 1, date: -1 });

export const OdometerReading = mongoose.model('OdometerReading', odometerReadingSchema);
