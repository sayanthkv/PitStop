import { ServiceEntry } from '../models/ServiceEntry.js';
import { ServiceInterval } from '../models/ServiceInterval.js';
import { TyreBatteryRecord } from '../models/TyreBatteryRecord.js';
import { Vehicle } from '../models/Vehicle.js';
import { OdometerReading } from '../models/OdometerReading.js';
import { calculateServiceDue } from '../utils/calculations.js';
import {
  serviceEntrySchema,
  serviceIntervalSchema,
  tyreBatterySchema,
} from '../validators/schemas.js';

export async function addServiceEntry(req, res, next) {
  try {
    const data = serviceEntrySchema.parse(req.body);
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const entry = new ServiceEntry({
      user: req.user._id,
      vehicle: vehicle._id,
      date: data.date || new Date(),
      odometer: data.odometer,
      serviceType: data.serviceType,
      workshop: data.workshop || '',
      cost: data.cost,
      notes: data.notes || '',
      receiptUrl: data.receiptUrl || null,
      nextDueKm: data.nextDueKm || null,
      nextDueDate: data.nextDueDate || null,
    });

    await entry.save();

    // Auto-update vehicle odometer if higher
    if (data.odometer > vehicle.currentOdometer) {
      vehicle.currentOdometer = data.odometer;
      await vehicle.save();

      await OdometerReading.create({
        user: req.user._id,
        vehicle: vehicle._id,
        reading: data.odometer,
        date: data.date || new Date(),
        source: 'service',
        note: `Service: ${data.serviceType}`,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Service entry logged.',
      entry,
    });
  } catch (error) {
    next(error);
  }
}

export async function getServiceEntries(req, res, next) {
  try {
    const { type } = req.query;
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const query = { user: req.user._id, vehicle: vehicle._id };
    if (type) query.serviceType = type;

    const entries = await ServiceEntry.find(query).sort({ date: -1, odometer: -1 }).lean();
    const totalCost = entries.reduce((sum, e) => sum + (e.cost || 0), 0);

    return res.json({
      success: true,
      entries,
      totalCost,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteServiceEntry(req, res, next) {
  try {
    const { id } = req.params;
    const entry = await ServiceEntry.findOneAndDelete({ _id: id, user: req.user._id });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Service entry not found.' });
    }
    return res.json({ success: true, message: 'Service entry deleted.' });
  } catch (error) {
    next(error);
  }
}

export async function getServiceDue(req, res, next) {
  try {
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    let interval = await ServiceInterval.findOne({ user: req.user._id, vehicle: vehicle._id });
    if (!interval) {
      interval = { kmInterval: 3000, monthInterval: 3, averageKmPerDay: 15 };
    }

    // Find latest general service or oil change
    const lastService = await ServiceEntry.findOne({
      user: req.user._id,
      vehicle: vehicle._id,
      serviceType: { $in: ['general service', 'oil change'] },
    }).sort({ odometer: -1 });

    const dueInfo = calculateServiceDue({
      currentOdometer: vehicle.currentOdometer,
      lastServiceOdometer: lastService ? lastService.odometer : 0,
      lastServiceDate: lastService ? lastService.date : vehicle.purchaseDate,
      serviceIntervalKm: interval.kmInterval,
      serviceIntervalMonths: interval.monthInterval,
      averageKmPerDay: interval.averageKmPerDay || 15,
    });

    return res.json({
      success: true,
      serviceDue: {
        ...dueInfo,
        lastServiceOdometer: lastService ? lastService.odometer : null,
        lastServiceDate: lastService ? lastService.date : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getServiceIntervals(req, res, next) {
  try {
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });
    const interval = await ServiceInterval.findOne({ user: req.user._id, vehicle: vehicle?._id });
    return res.json({
      success: true,
      interval: interval || { kmInterval: 3000, monthInterval: 3, averageKmPerDay: 15 },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateServiceIntervals(req, res, next) {
  try {
    const data = serviceIntervalSchema.parse(req.body);
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });

    const interval = await ServiceInterval.findOneAndUpdate(
      { user: req.user._id, vehicle: vehicle._id },
      { $set: data },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      message: 'Service intervals updated.',
      interval,
    });
  } catch (error) {
    next(error);
  }
}

// Tyre and Battery Trackers
export async function getTyreBatteryRecords(req, res, next) {
  try {
    const records = await TyreBatteryRecord.find({ user: req.user._id }).sort({ installDate: -1 });
    return res.json({ success: true, records });
  } catch (error) {
    next(error);
  }
}

export async function addTyreBatteryRecord(req, res, next) {
  try {
    const data = tyreBatterySchema.parse(req.body);
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });

    // Mark previous item of same type as not current
    await TyreBatteryRecord.updateMany(
      { user: req.user._id, vehicle: vehicle._id, itemType: data.itemType },
      { $set: { isCurrent: false } }
    );

    const record = new TyreBatteryRecord({
      user: req.user._id,
      vehicle: vehicle._id,
      ...data,
      isCurrent: true,
    });
    await record.save();

    return res.status(201).json({ success: true, message: 'Record saved.', record });
  } catch (error) {
    next(error);
  }
}
