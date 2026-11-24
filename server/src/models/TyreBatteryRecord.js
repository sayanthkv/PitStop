import mongoose from 'mongoose';

const tyreBatteryRecordSchema = new mongoose.Schema(
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
    itemType: {
      type: String,
      enum: ['front_tyre', 'rear_tyre', 'battery', 'spark_plug', 'brake_pads'],
      required: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    modelOrSpec: {
      type: String,
      default: '',
    },
    installDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    installOdometer: {
      type: Number,
      required: true,
      min: 0,
    },
    warrantyMonths: {
      type: Number,
      default: null,
    },
    expectedLifespanKm: {
      type: Number,
      default: 20000,
    },
    notes: {
      type: String,
      default: '',
    },
    isCurrent: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

tyreBatteryRecordSchema.index({ user: 1, vehicle: 1, itemType: 1 });

export const TyreBatteryRecord = mongoose.model('TyreBatteryRecord', tyreBatteryRecordSchema);
