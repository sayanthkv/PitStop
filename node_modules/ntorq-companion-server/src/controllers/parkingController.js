import { ParkingSpot } from '../models/ParkingSpot.js';
import { Vehicle } from '../models/Vehicle.js';
import { parkingSpotSchema } from '../validators/schemas.js';

export async function parkHere(req, res, next) {
  try {
    const data = parkingSpotSchema.parse(req.body);
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    // Mark previous spots as picked up
    await ParkingSpot.updateMany(
      { user: req.user._id, vehicle: vehicle._id, isPickedUp: false },
      { $set: { isPickedUp: true, pickedUpAt: new Date() } }
    );

    const spot = new ParkingSpot({
      user: req.user._id,
      vehicle: vehicle._id,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy || null,
      parkedAt: data.parkedAt || new Date(),
      note: data.note || '',
      photoUrl: data.photoUrl || null,
      isPickedUp: false,
    });

    await spot.save();

    // Maintain max 20 spots
    const totalSpots = await ParkingSpot.countDocuments({ user: req.user._id });
    if (totalSpots > 20) {
      const oldestSpots = await ParkingSpot.find({ user: req.user._id })
        .sort({ parkedAt: 1 })
        .limit(totalSpots - 20);
      const idsToDelete = oldestSpots.map((s) => s._id);
      await ParkingSpot.deleteMany({ _id: { $in: idsToDelete } });
    }

    return res.status(201).json({
      success: true,
      message: 'Parking location saved.',
      spot,
    });
  } catch (error) {
    next(error);
  }
}

export async function getLatestParkingSpot(req, res, next) {
  try {
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    // Find latest active (unpicked) spot, or fallback to most recent spot
    let spot = await ParkingSpot.findOne({
      user: req.user._id,
      vehicle: vehicle._id,
      isPickedUp: false,
    }).sort({ parkedAt: -1 });

    if (!spot) {
      spot = await ParkingSpot.findOne({
        user: req.user._id,
        vehicle: vehicle._id,
      }).sort({ parkedAt: -1 });
    }

    return res.json({
      success: true,
      spot,
    });
  } catch (error) {
    next(error);
  }
}

export async function getParkingHistory(req, res, next) {
  try {
    const spots = await ParkingSpot.find({ user: req.user._id })
      .sort({ parkedAt: -1 })
      .limit(20)
      .lean();

    return res.json({
      success: true,
      spots,
    });
  } catch (error) {
    next(error);
  }
}

export async function markSpotPickedUp(req, res, next) {
  try {
    const { id } = req.params;
    const spot = await ParkingSpot.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { $set: { isPickedUp: true, pickedUpAt: new Date() } },
      { new: true }
    );

    if (!spot) {
      return res.status(404).json({ success: false, message: 'Parking spot not found.' });
    }

    return res.json({
      success: true,
      message: 'Marked as picked up.',
      spot,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteParkingSpot(req, res, next) {
  try {
    const { id } = req.params;
    const spot = await ParkingSpot.findOneAndDelete({ _id: id, user: req.user._id });
    if (!spot) {
      return res.status(404).json({ success: false, message: 'Parking spot not found.' });
    }
    return res.json({ success: true, message: 'Parking spot deleted.' });
  } catch (error) {
    next(error);
  }
}
