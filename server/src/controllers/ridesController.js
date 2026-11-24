import { Ride } from '../models/Ride.js';
import { Vehicle } from '../models/Vehicle.js';
import { OdometerReading } from '../models/OdometerReading.js';
import { ParkingSpot } from '../models/ParkingSpot.js';
import { FuelPrice } from '../models/FuelPrice.js';
import { FuelEntry } from '../models/FuelEntry.js';
import { simplifyRoute, calculateMileageHistory } from '../utils/calculations.js';
import { rideSchema } from '../validators/schemas.js';

export async function saveRide(req, res, next) {
  try {
    const data = rideSchema.parse(req.body);
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    let simplifiedPoints = [];
    if (data.hasRouteData && Array.isArray(data.routePoints) && data.routePoints.length > 0) {
      simplifiedPoints = simplifyRoute(data.routePoints, 0.00005, 500);
    }

    const startOdo = vehicle.currentOdometer;
    const endOdo = Math.round((startOdo + data.distanceKm) * 10) / 10;

    const ride = new Ride({
      user: req.user._id,
      vehicle: vehicle._id,
      startTime: data.startTime,
      endTime: data.endTime,
      distanceKm: data.distanceKm,
      movingTimeSec: data.movingTimeSec,
      totalTimeSec: data.totalTimeSec,
      avgSpeedKmh: data.avgSpeedKmh,
      maxSpeedKmh: data.maxSpeedKmh,
      startOdometer: startOdo,
      endOdometer: endOdo,
      isOdometerSynced: data.isOdometerSynced || false,
      label: data.label || 'commute',
      note: data.note || '',
      hasRouteData: data.hasRouteData,
      routePoints: simplifiedPoints,
    });

    await ride.save();

    // Auto-update vehicle odometer if synced
    if (data.isOdometerSynced && data.distanceKm > 0) {
      vehicle.currentOdometer = endOdo;
      await vehicle.save();

      await OdometerReading.create({
        user: req.user._id,
        vehicle: vehicle._id,
        reading: endOdo,
        date: data.endTime,
        source: 'ride',
        note: `Ride (${data.distanceKm} km, ${data.label})`,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Ride saved successfully.',
      ride,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRides(req, res, next) {
  try {
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const rides = await Ride.find({ user: req.user._id, vehicle: vehicle._id })
      .select('-routePoints') // Omit heavy route points for list view
      .sort({ startTime: -1 })
      .lean();

    return res.json({
      success: true,
      rides,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRideById(req, res, next) {
  try {
    const { id } = req.params;
    const ride = await Ride.findOne({ _id: id, user: req.user._id });

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    return res.json({
      success: true,
      ride,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteRide(req, res, next) {
  try {
    const { id } = req.params;
    const ride = await Ride.findOneAndDelete({ _id: id, user: req.user._id });
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }
    return res.json({ success: true, message: 'Ride deleted.' });
  } catch (error) {
    next(error);
  }
}

export async function getRidesSummary(req, res, next) {
  try {
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const weekRides = await Ride.find({
      user: req.user._id,
      vehicle: vehicle._id,
      startTime: { $gte: startOfWeek },
    }).lean();

    const totalKm = weekRides.reduce((sum, r) => sum + r.distanceKm, 0);
    const rideCount = weekRides.length;

    // Fuel and cost estimate for week
    const fuelEntries = await FuelEntry.find({ user: req.user._id }).sort({ odometer: 1 });
    const mileage = calculateMileageHistory(fuelEntries).overallAverageMileage || 38;
    const latestPrice = await FuelPrice.findOne({ user: req.user._id }).sort({ date: -1 });
    const price = latestPrice ? latestPrice.rate : 102;

    const estimatedFuelUsed = Math.round((totalKm / mileage) * 100) / 100;
    const estimatedCost = Math.round(estimatedFuelUsed * price);

    return res.json({
      success: true,
      summary: {
        totalKm: Math.round(totalKm * 10) / 10,
        rideCount,
        estimatedFuelUsed,
        estimatedCost,
        daysCovered: 7,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function syncRideOdometer(req, res, next) {
  try {
    const { id } = req.params;
    const ride = await Ride.findOne({ _id: id, user: req.user._id });
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    if (ride.isOdometerSynced) {
      return res.status(400).json({ success: false, message: 'Ride is already synced to odometer.' });
    }

    const vehicle = await Vehicle.findById(ride.vehicle);
    const newOdo = Math.round((vehicle.currentOdometer + ride.distanceKm) * 10) / 10;
    vehicle.currentOdometer = newOdo;
    await vehicle.save();

    await OdometerReading.create({
      user: req.user._id,
      vehicle: vehicle._id,
      reading: newOdo,
      date: ride.endTime,
      source: 'ride',
      note: `Ride sync (+${ride.distanceKm} km)`,
    });

    ride.isOdometerSynced = true;
    ride.endOdometer = newOdo;
    await ride.save();

    return res.json({
      success: true,
      message: 'Added to odometer successfully.',
      currentOdometer: newOdo,
    });
  } catch (error) {
    next(error);
  }
}

export async function eraseAllLocationData(req, res, next) {
  try {
    // Strip routePoints from all rides
    await Ride.updateMany(
      { user: req.user._id },
      { $set: { routePoints: [], hasRouteData: false } }
    );

    // Delete all parking coordinates or records
    await ParkingSpot.deleteMany({ user: req.user._id });

    return res.json({
      success: true,
      message: 'All GPS routes and parking location data have been permanently erased.',
    });
  } catch (error) {
    next(error);
  }
}
