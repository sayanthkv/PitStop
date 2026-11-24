import mongoose from 'mongoose';

const gpsPointSchema = new mongoose.Schema(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    altitude: { type: Number, default: null },
    accuracy: { type: Number, default: null },
    speed: { type: Number, default: null },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema(
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
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    distanceKm: {
      type: Number,
      required: true,
      min: 0,
    },
    movingTimeSec: {
      type: Number,
      default: 0,
    },
    totalTimeSec: {
      type: Number,
      default: 0,
    },
    avgSpeedKmh: {
      type: Number,
      default: 0,
    },
    maxSpeedKmh: {
      type: Number,
      default: 0,
    },
    startOdometer: {
      type: Number,
      default: null,
    },
    endOdometer: {
      type: Number,
      default: null,
    },
    isOdometerSynced: {
      type: Boolean,
      default: false,
    },
    label: {
      type: String,
      enum: ['commute', 'leisure', 'errand', 'touring', 'other'],
      default: 'commute',
    },
    note: {
      type: String,
      default: '',
    },
    hasRouteData: {
      type: Boolean,
      default: true,
    },
    routePoints: [gpsPointSchema],
  },
  { timestamps: true }
);

rideSchema.index({ user: 1, vehicle: 1, startTime: -1 });

export const Ride = mongoose.model('Ride', rideSchema);
