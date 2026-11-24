import mongoose from 'mongoose';

const alertStateSchema = new mongoose.Schema(
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
    alertKey: {
      type: String,
      required: true, // e.g. 'doc_insurance_expiring', 'service_due_3000', 'low_fuel', 'odo_nudge'
    },
    type: {
      type: String,
      enum: ['document', 'service', 'fuel', 'odometer'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'warning',
    },
    isDismissed: {
      type: Boolean,
      default: false,
    },
    dismissedAt: {
      type: Date,
      default: null,
    },
    snoozedUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

alertStateSchema.index({ user: 1, vehicle: 1, alertKey: 1 }, { unique: true });

export const AlertState = mongoose.model('AlertState', alertStateSchema);
