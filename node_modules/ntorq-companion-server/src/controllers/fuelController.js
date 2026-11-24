import { FuelEntry } from '../models/FuelEntry.js';
import { FuelPrice } from '../models/FuelPrice.js';
import { Vehicle } from '../models/Vehicle.js';
import { OdometerReading } from '../models/OdometerReading.js';
import {
  calculateMileageHistory,
  calculateFuelEstimate,
  calculateFillCosts,
  estimateTripCost,
} from '../utils/calculations.js';
import { fuelEntrySchema, fuelPriceSchema } from '../validators/schemas.js';

export async function addFuelEntry(req, res, next) {
  try {
    const data = fuelEntrySchema.parse(req.body);
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    // Capacity warning
    const exceedsCapacity = data.litres > vehicle.tankCapacity;

    const entry = new FuelEntry({
      user: req.user._id,
      vehicle: vehicle._id,
      date: data.date || new Date(),
      odometer: data.odometer,
      litres: data.litres,
      pricePerLitre: data.pricePerLitre,
      totalCost: data.totalCost,
      isFullTank: data.isFullTank,
      station: data.station || '',
      note: data.note || '',
      receiptUrl: data.receiptUrl || null,
    });

    await entry.save();

    // Auto-record today's fuel price
    await FuelPrice.create({
      user: req.user._id,
      rate: data.pricePerLitre,
      date: data.date || new Date(),
      location: data.station || '',
    });

    // Auto-update odometer if higher
    if (data.odometer > vehicle.currentOdometer) {
      vehicle.currentOdometer = data.odometer;
      await vehicle.save();

      await OdometerReading.create({
        user: req.user._id,
        vehicle: vehicle._id,
        reading: data.odometer,
        date: data.date || new Date(),
        source: 'fuel',
        note: `Fuel log: ${data.litres}L at ${data.station || 'Station'}`,
      });
    }

    // If full tank, reset manual correction
    if (data.isFullTank) {
      vehicle.manualFuelCorrection = {
        litres: null,
        odometer: null,
        updatedAt: null,
      };
      await vehicle.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Fuel entry logged successfully.',
      entry,
      exceedsCapacityWarning: exceedsCapacity
        ? `Warning: Entered ${data.litres}L exceeds your configured tank capacity of ${vehicle.tankCapacity}L.`
        : null,
    });
  } catch (error) {
    next(error);
  }
}

export async function getFuelEntries(req, res, next) {
  try {
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const entries = await FuelEntry.find({
      user: req.user._id,
      vehicle: vehicle._id,
    })
      .sort({ odometer: -1, date: -1 })
      .lean();

    const mileageHistory = calculateMileageHistory(entries);

    // Rule-based insights
    const insights = [];
    if (mileageHistory.entriesWithMileage.length >= 2) {
      const recentCalculated = mileageHistory.entriesWithMileage
        .filter((e) => e.calculatedMileage !== null)
        .slice(-2);

      if (recentCalculated.length === 2) {
        const prev = recentCalculated[0].calculatedMileage;
        const current = recentCalculated[1].calculatedMileage;
        const dropPct = ((prev - current) / prev) * 100;

        if (dropPct >= 20) {
          insights.push({
            type: 'warning',
            title: 'Mileage Drop Detected',
            message: `Mileage dropped by ${Math.round(dropPct)}% (from ${prev} km/l to ${current} km/l). Check tyre pressure, air filter, or schedule an engine service.`,
          });
        }
      }
    }

    return res.json({
      success: true,
      entries,
      mileageHistory,
      insights,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteFuelEntry(req, res, next) {
  try {
    const { id } = req.params;
    const entry = await FuelEntry.findOneAndDelete({ _id: id, user: req.user._id });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Fuel entry not found.' });
    }
    return res.json({ success: true, message: 'Fuel entry deleted.' });
  } catch (error) {
    next(error);
  }
}

export async function getFuelEstimate(req, res, next) {
  try {
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const entries = await FuelEntry.find({
      user: req.user._id,
      vehicle: vehicle._id,
    }).sort({ odometer: 1 });

    const mileageStats = calculateMileageHistory(entries);
    const avgMileage = mileageStats.overallAverageMileage || 38;

    const lastFullFill = [...entries].reverse().find((e) => e.isFullTank);

    const estimate = calculateFuelEstimate({
      tankCapacity: vehicle.tankCapacity,
      reserveLevel: vehicle.reserveLevel,
      currentOdometer: vehicle.currentOdometer,
      lastFullFillOdometer: lastFullFill ? lastFullFill.odometer : (vehicle.currentOdometer - 50),
      averageMileage: avgMileage,
      manualCorrection: vehicle.manualFuelCorrection?.litres !== null ? vehicle.manualFuelCorrection : null,
    });

    const latestPrice = await FuelPrice.findOne({ user: req.user._id }).sort({ date: -1 });
    const currentRate = latestPrice ? latestPrice.rate : 102;

    const fillCosts = calculateFillCosts({
      tankCapacity: vehicle.tankCapacity,
      currentFuelLeft: estimate.estimatedLitres,
      fuelPricePerLitre: currentRate,
    });

    return res.json({
      success: true,
      estimate: {
        ...estimate,
        averageMileage: avgMileage,
        last5Mileage: mileageStats.last5AverageMileage || avgMileage,
        petrolRate: currentRate,
        ...fillCosts,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getFuelPrices(req, res, next) {
  try {
    const prices = await FuelPrice.find({ user: req.user._id }).sort({ date: -1 }).limit(30);
    const latest = prices.length > 0 ? prices[0].rate : 102;
    return res.json({
      success: true,
      latestRate: latest,
      prices,
    });
  } catch (error) {
    next(error);
  }
}

export async function addFuelPrice(req, res, next) {
  try {
    const data = fuelPriceSchema.parse(req.body);
    const price = await FuelPrice.create({
      user: req.user._id,
      rate: data.rate,
      date: data.date || new Date(),
      location: data.location || '',
    });
    return res.status(201).json({ success: true, message: 'Price recorded.', price });
  } catch (error) {
    next(error);
  }
}

export async function calculateTripCostEstimate(req, res, next) {
  try {
    const { distanceKm, isRoundTrip } = req.query;
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });
    const latestPrice = await FuelPrice.findOne({ user: req.user._id }).sort({ date: -1 });
    const entries = await FuelEntry.find({ user: req.user._id }).sort({ odometer: 1 });
    const mileageStats = calculateMileageHistory(entries);

    const avgMileage = mileageStats.overallAverageMileage || 38;
    const price = latestPrice ? latestPrice.rate : 102;

    const estimate = calculateFuelEstimate({
      tankCapacity: vehicle?.tankCapacity || 5.8,
      reserveLevel: vehicle?.reserveLevel || 1.0,
      currentOdometer: vehicle?.currentOdometer || 0,
      lastFullFillOdometer: 0,
      averageMileage: avgMileage,
    });

    const result = estimateTripCost({
      distanceKm: Number(distanceKm) || 10,
      isRoundTrip: isRoundTrip === 'true',
      fuelPricePerLitre: price,
      averageMileage: avgMileage,
      currentFuelLeft: estimate.estimatedLitres,
    });

    return res.json({ success: true, tripEstimate: result });
  } catch (error) {
    next(error);
  }
}
