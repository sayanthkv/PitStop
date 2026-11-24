import { Vehicle } from '../models/Vehicle.js';
import { User } from '../models/User.js';
import { OdometerReading } from '../models/OdometerReading.js';
import { ServiceInterval } from '../models/ServiceInterval.js';
import { vehicleSetupSchema, vehicleUpdateSchema, manualFuelCorrectionSchema } from '../validators/schemas.js';

export async function setupVehicle(req, res, next) {
  try {
    const data = vehicleSetupSchema.parse(req.body);

    const vehicle = new Vehicle({
      user: req.user._id,
      nickname: data.nickname,
      model: data.model,
      year: data.year,
      registrationNumber: data.registrationNumber,
      fuelType: data.fuelType,
      tankCapacity: data.tankCapacity,
      reserveLevel: data.reserveLevel,
      purchaseDate: data.purchaseDate || new Date(),
      currentOdometer: data.currentOdometer,
      photoUrl: data.photoUrl || null,
      isPrimary: true,
    });

    await vehicle.save();

    // Link vehicle as primary to User
    await User.findByIdAndUpdate(req.user._id, { primaryVehicle: vehicle._id });

    // Seed initial odometer reading
    if (data.currentOdometer > 0) {
      await OdometerReading.create({
        user: req.user._id,
        vehicle: vehicle._id,
        reading: data.currentOdometer,
        source: 'manual',
        note: 'Initial odometer reading from setup',
      });
    }

    // Seed default service interval
    await ServiceInterval.findOneAndUpdate(
      { user: req.user._id, vehicle: vehicle._id },
      { kmInterval: 3000, monthInterval: 3, averageKmPerDay: 15 },
      { upsert: true, new: true }
    );

    return res.status(201).json({
      success: true,
      message: 'Vehicle configured successfully.',
      vehicle,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPrimaryVehicle(req, res, next) {
  try {
    let vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });
    if (!vehicle) {
      vehicle = await Vehicle.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    }
    return res.json({
      success: true,
      vehicle,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateVehicle(req, res, next) {
  try {
    const data = vehicleUpdateSchema.parse(req.body);
    const vehicle = await Vehicle.findOneAndUpdate(
      { user: req.user._id, isPrimary: true },
      { $set: data },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    return res.json({
      success: true,
      message: 'Vehicle updated successfully.',
      vehicle,
    });
  } catch (error) {
    next(error);
  }
}

export async function manualFuelCorrection(req, res, next) {
  try {
    const data = manualFuelCorrectionSchema.parse(req.body);
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const currentOdo = data.odometer !== undefined ? data.odometer : vehicle.currentOdometer;

    vehicle.manualFuelCorrection = {
      litres: data.litres,
      odometer: currentOdo,
      updatedAt: new Date(),
    };
    await vehicle.save();

    return res.json({
      success: true,
      message: 'Manual fuel correction saved.',
      manualFuelCorrection: vehicle.manualFuelCorrection,
    });
  } catch (error) {
    next(error);
  }
}
