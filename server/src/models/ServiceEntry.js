import mongoose from 'mongoose';

const serviceEntrySchema = new mongoose.Schema(
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
    serviceType: {
      type: String,
      enum: [
        'general service',
        'oil change',
        'tyre',
        'battery',
        'brake',
        'chain/belt',
        'air filter',
        'repair',
        'wash',
        'other',
      ],
      required: true,
    },
    workshop: {
      type: String,
      default: '',
    },
    cost: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
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
    nextDueKm: {
      type: Number,
      default: null,
    },
    nextDueDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

serviceEntrySchema.index({ user: 1, vehicle: 1, date: -1 });

export const ServiceEntry = mongoose.model('ServiceEntry', serviceEntrySchema);
