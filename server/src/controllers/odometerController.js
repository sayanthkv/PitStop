import { OdometerReading } from '../models/OdometerReading.js';
import { Vehicle } from '../models/Vehicle.js';
import { Ride } from '../models/Ride.js';
import { ServiceInterval } from '../models/ServiceInterval.js';
import {
  validateOdometerReading,
  checkOdometerNudge,
  calculateServiceDue,
} from '../utils/calculations.js';
import { odometerReadingSchema, odometerCorrectionSchema } from '../validators/schemas.js';

export async function addOdometerReading(req, res, next) {
  try {
    const data = odometerReadingSchema.parse(req.body);
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    // Get latest reading
    const latest = await OdometerReading.findOne({
      user: req.user._id,
      vehicle: vehicle._id,
    }).sort({ reading: -1 });

    const latestValue = latest ? latest.reading : vehicle.currentOdometer;
    const validation = validateOdometerReading(data.reading, latestValue);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const reading = new OdometerReading({
      user: req.user._id,
      vehicle: vehicle._id,
      reading: data.reading,
      date: data.date || new Date(),
      source: data.source || 'manual',
      note: data.note || '',
    });

    await reading.save();

    // Update vehicle's current odometer if new reading is higher
    if (data.reading > vehicle.currentOdometer) {
      vehicle.currentOdometer = data.reading;
      await vehicle.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Odometer reading saved.',
      reading,
      currentOdometer: vehicle.currentOdometer,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOdometerReadings(req, res, next) {
  try {
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const readings = await OdometerReading.find({
      user: req.user._id,
      vehicle: vehicle._id,
    })
      .sort({ date: -1, reading: -1 })
      .lean();

    return res.json({
      success: true,
      readings,
    });
  } catch (error) {
    next(error);
  }
}

export async function correctOdometerReading(req, res, next) {
  try {
    const { id } = req.params;
    const data = odometerCorrectionSchema.parse(req.body);

    const reading = await OdometerReading.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!reading) {
      return res.status(404).json({ success: false, message: 'Odometer reading not found.' });
    }

    const previousValue = reading.reading;
    reading.corrections.push({
      previousValue,
      newValue: data.newValue,
      reason: data.reason,
      correctedAt: new Date(),
    });
    reading.reading = data.newValue;
    await reading.save();

    // Recompute highest reading for vehicle
    const vehicle = await Vehicle.findById(reading.vehicle);
    if (vehicle) {
      const highest = await OdometerReading.findOne({
        user: req.user._id,
        vehicle: vehicle._id,
      }).sort({ reading: -1 });

      if (highest) {
        vehicle.currentOdometer = highest.reading;
        await vehicle.save();
      }
    }

    return res.json({
      success: true,
      message: 'Odometer reading successfully corrected with audit trail.',
      reading,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOdometerStats(req, res, next) {
  try {
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const readings = await OdometerReading.find({
      user: req.user._id,
      vehicle: vehicle._id,
    }).sort({ date: 1 });

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate km this week and this month from readings & rides
    let kmThisWeek = 0;
    let kmThisMonth = 0;

    const recentReadings = await OdometerReading.find({
      user: req.user._id,
      vehicle: vehicle._id,
      date: { $gte: startOfMonth },
    }).sort({ date: 1 });

    if (recentReadings.length >= 2) {
      kmThisMonth = Math.max(0, recentReadings[recentReadings.length - 1].reading - recentReadings[0].reading);
    }

    const weekReadings = recentReadings.filter((r) => new Date(r.date) >= startOfWeek);
    if (weekReadings.length >= 2) {
      kmThisWeek = Math.max(0, weekReadings[weekReadings.length - 1].reading - weekReadings[0].reading);
    } else if (kmThisMonth > 0) {
      kmThisWeek = Math.round(kmThisMonth / 4);
    }

    // Longest ride
    const longestRide = await Ride.findOne({
      user: req.user._id,
      vehicle: vehicle._id,
    }).sort({ distanceKm: -1 });

    // Average km/day calculation
    let avgKmPerDay = 15;
    if (readings.length >= 2) {
      const first = readings[0];
      const last = readings[readings.length - 1];
      const dayDiff = Math.max(1, (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24));
      const totalKm = Math.max(0, last.reading - first.reading);
      avgKmPerDay = Math.round((totalKm / dayDiff) * 10) / 10 || 15;
    }

    // Service projection
    const interval = (await ServiceInterval.findOne({ user: req.user._id, vehicle: vehicle._id })) || {
      kmInterval: 3000,
      monthInterval: 3,
    };

    const serviceProjection = calculateServiceDue({
      currentOdometer: vehicle.currentOdometer,
      lastServiceOdometer: 0,
      serviceIntervalKm: interval.kmInterval,
      averageKmPerDay: avgKmPerDay,
    });

    const latestReading = readings.length > 0 ? readings[readings.length - 1] : null;
    const isNudgeActive = checkOdometerNudge(latestReading ? latestReading.date : vehicle.createdAt, 14);

    return res.json({
      success: true,
      stats: {
        currentOdometer: vehicle.currentOdometer,
        kmThisWeek,
        kmThisMonth,
        avgKmPerDay,
        longestRideKm: longestRide ? longestRide.distanceKm : 0,
        isNudgeActive,
        projectedServiceDate: serviceProjection.projectedKmDate,
        daysToService: Math.round((new Date(serviceProjection.projectedKmDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      },
    });
  } catch (error) {
    next(error);
  }
}
