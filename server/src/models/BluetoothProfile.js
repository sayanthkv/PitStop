import mongoose from 'mongoose';

const characteristicDecoderSchema = new mongoose.Schema(
  {
    characteristicUuid: { type: String, required: true },
    label: { type: String, required: true },
    offset: { type: Number, default: 0 },
    byteLength: { type: Number, default: 1 }, // 1, 2, 4
    isLittleEndian: { type: Boolean, default: true },
    scale: { type: Number, default: 1.0 },
    unit: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const bluetoothProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceName: {
      type: String,
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
    },
    serviceUuids: [String],
    decoders: [characteristicDecoderSchema],
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

bluetoothProfileSchema.index({ user: 1, deviceId: 1 }, { unique: true });

export const BluetoothProfile = mongoose.model('BluetoothProfile', bluetoothProfileSchema);
