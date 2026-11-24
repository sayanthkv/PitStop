import { BluetoothProfile } from '../models/BluetoothProfile.js';
import { bluetoothProfileSchema } from '../validators/schemas.js';

export async function getBluetoothProfiles(req, res, next) {
  try {
    const profiles = await BluetoothProfile.find({ user: req.user._id }).sort({ updatedAt: -1 });
    return res.json({ success: true, profiles });
  } catch (error) {
    next(error);
  }
}

export async function saveBluetoothProfile(req, res, next) {
  try {
    const data = bluetoothProfileSchema.parse(req.body);
    const profile = await BluetoothProfile.findOneAndUpdate(
      { user: req.user._id, deviceId: data.deviceId },
      {
        $set: {
          deviceName: data.deviceName,
          serviceUuids: data.serviceUuids,
          decoders: data.decoders,
          notes: data.notes,
        },
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Bluetooth profile and decoders saved.',
      profile,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteBluetoothProfile(req, res, next) {
  try {
    const { id } = req.params;
    await BluetoothProfile.findOneAndDelete({ _id: id, user: req.user._id });
    return res.json({ success: true, message: 'Profile deleted.' });
  } catch (error) {
    next(error);
  }
}
