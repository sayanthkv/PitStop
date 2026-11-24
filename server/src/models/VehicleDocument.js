import mongoose from 'mongoose';

const renewalHistorySchema = new mongoose.Schema({
  previousExpiryDate: { type: Date, required: true },
  newExpiryDate: { type: Date, required: true },
  renewedAt: { type: Date, default: Date.now },
  premium: { type: Number, default: null },
  notes: { type: String, default: '' },
});

const vehicleDocumentSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: [
        'insurance',
        'puc',
        'registration_rc',
        'road_tax',
        'fitness',
        'driving_license',
        'custom',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    provider: {
      type: String,
      default: '',
    },
    policyNumber: {
      type: String,
      default: '',
    },
    startDate: {
      type: Date,
      default: null,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    premium: {
      type: Number,
      default: null,
    },
    attachmentUrl: {
      type: String,
      default: null,
    },
    attachmentPublicId: {
      type: String,
      default: null,
    },
    attachmentType: {
      type: String,
      enum: ['image', 'pdf', null],
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
    renewalHistory: [renewalHistorySchema],
  },
  { timestamps: true }
);

vehicleDocumentSchema.index({ user: 1, vehicle: 1, expiryDate: 1 });
vehicleDocumentSchema.index({ user: 1, expiryDate: 1 });

export const VehicleDocument = mongoose.model('VehicleDocument', vehicleDocumentSchema);
