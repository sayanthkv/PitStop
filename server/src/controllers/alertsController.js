import { AlertState } from '../models/AlertState.js';
import { Vehicle } from '../models/Vehicle.js';
import { VehicleDocument } from '../models/VehicleDocument.js';
import { ServiceEntry } from '../models/ServiceEntry.js';
import { ServiceInterval } from '../models/ServiceInterval.js';
import { OdometerReading } from '../models/OdometerReading.js';
import { FuelEntry } from '../models/FuelEntry.js';
import { PushSubscription } from '../models/PushSubscription.js';
import {
  calculateDocumentExpiry,
  calculateServiceDue,
  checkOdometerNudge,
  calculateFuelEstimate,
  calculateMileageHistory,
} from '../utils/calculations.js';
import { isPushEnabled } from '../services/pushNotification.js';

export async function getActiveAlerts(req, res, next) {
  try {
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });
    if (!vehicle) {
      return res.json({ success: true, alerts: [] });
    }

    const computedAlerts = [];
    const now = new Date();

    // 1. Document Expiry Alerts
    const docs = await VehicleDocument.find({ user: req.user._id, vehicle: vehicle._id });
    for (const doc of docs) {
      const exp = calculateDocumentExpiry(doc.expiryDate);
      if (exp.isUrgent) {
        const severity = exp.status === 'expired' ? 'critical' : exp.status === 'expiring_very_soon' ? 'critical' : 'warning';
        computedAlerts.push({
          alertKey: `doc_${doc._id}`,
          type: 'document',
          title: `${doc.title} ${exp.status === 'expired' ? 'Expired' : 'Expiring Soon'}`,
          message: exp.status === 'expired'
            ? `Your ${doc.title} expired ${Math.abs(exp.daysRemaining)} days ago. Renew immediately to stay compliant.`
            : `Your ${doc.title} expires in ${exp.daysRemaining} days (${new Date(doc.expiryDate).toLocaleDateString()}).`,
          severity,
          link: '/documents',
          referenceId: doc._id,
        });
      }
    }

    // 2. Service Due Alert
    const interval = (await ServiceInterval.findOne({ user: req.user._id, vehicle: vehicle._id })) || {
      kmInterval: 3000,
      monthInterval: 3,
      averageKmPerDay: 15,
    };
    const lastService = await ServiceEntry.findOne({
      user: req.user._id,
      vehicle: vehicle._id,
      serviceType: { $in: ['general service', 'oil change'] },
    }).sort({ odometer: -1 });

    const serviceDue = calculateServiceDue({
      currentOdometer: vehicle.currentOdometer,
      lastServiceOdometer: lastService ? lastService.odometer : 0,
      lastServiceDate: lastService ? lastService.date : vehicle.purchaseDate,
      serviceIntervalKm: interval.kmInterval,
      serviceIntervalMonths: interval.monthInterval,
      averageKmPerDay: interval.averageKmPerDay || 15,
    });

    if (serviceDue.isDue) {
      computedAlerts.push({
        alertKey: `service_due_${Math.floor(vehicle.currentOdometer / interval.kmInterval)}`,
        type: 'service',
        title: serviceDue.status === 'overdue' ? 'Service Overdue' : 'Service Due Soon',
        message: serviceDue.status === 'overdue'
          ? `Scooter is due for service! ${serviceDue.kmDrivenSinceService} km driven since last service.`
          : `Service due in ${serviceDue.kmRemaining} km or ${serviceDue.daysRemainingDate ?? 0} days.`,
        severity: serviceDue.status === 'overdue' ? 'critical' : 'warning',
        link: '/service',
        progress: serviceDue.maxProgress,
      });
    }

    // 3. Low Fuel Alert
    const fuelEntries = await FuelEntry.find({ user: req.user._id, vehicle: vehicle._id }).sort({ odometer: 1 });
    const mileage = calculateMileageHistory(fuelEntries).overallAverageMileage || 38;
    const lastFull = [...fuelEntries].reverse().find((e) => e.isFullTank);

    const fuelEstimate = calculateFuelEstimate({
      tankCapacity: vehicle.tankCapacity,
      reserveLevel: vehicle.reserveLevel,
      currentOdometer: vehicle.currentOdometer,
      lastFullFillOdometer: lastFull ? lastFull.odometer : (vehicle.currentOdometer - 50),
      averageMileage: mileage,
      manualCorrection: vehicle.manualFuelCorrection?.litres !== null ? vehicle.manualFuelCorrection : null,
    });

    if (fuelEstimate.isReserveAlert) {
      computedAlerts.push({
        alertKey: 'fuel_low_reserve',
        type: 'fuel',
        title: 'Low Fuel Reserve Warning',
        message: `Estimated ~${fuelEstimate.estimatedLitres}L remaining (~${fuelEstimate.rangeKm} km range). Please refuel soon.`,
        severity: 'warning',
        link: '/fuel',
      });
    }

    // 4. Odometer Inactivity Nudge
    const latestReading = await OdometerReading.findOne({
      user: req.user._id,
      vehicle: vehicle._id,
    }).sort({ date: -1 });

    const isNudge = checkOdometerNudge(latestReading ? latestReading.date : vehicle.createdAt, 14);
    if (isNudge) {
      computedAlerts.push({
        alertKey: 'odo_nudge_14d',
        type: 'odometer',
        title: 'Update Odometer',
        message: 'No odometer reading logged in over 14 days. Tap to record your current km.',
        severity: 'info',
        link: '/odometer',
      });
    }

    // Fetch existing AlertState (dismissed or snoozed)
    const alertStates = await AlertState.find({ user: req.user._id, vehicle: vehicle._id }).lean();
    const stateMap = new Map(alertStates.map((s) => [s.alertKey, s]));

    // Filter out dismissed or currently snoozed alerts
    const activeAlerts = computedAlerts.filter((alert) => {
      const state = stateMap.get(alert.alertKey);
      if (!state) return true;
      if (state.isDismissed) return false;
      if (state.snoozedUntil && new Date(state.snoozedUntil) > now) return false;
      return true;
    });

    return res.json({
      success: true,
      alerts: activeAlerts,
      pushEnabled: isPushEnabled(),
    });
  } catch (error) {
    next(error);
  }
}

export async function dismissAlert(req, res, next) {
  try {
    const { key } = req.params;
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });

    await AlertState.findOneAndUpdate(
      { user: req.user._id, vehicle: vehicle?._id, alertKey: key },
      {
        $set: {
          isDismissed: true,
          dismissedAt: new Date(),
          type: 'document',
          title: key,
          message: 'Dismissed by user',
        },
      },
      { upsert: true }
    );

    return res.json({ success: true, message: 'Alert dismissed.' });
  } catch (error) {
    next(error);
  }
}

export async function snoozeAlert(req, res, next) {
  try {
    const { key } = req.params;
    const { days = 3 } = req.body;
    const vehicle = await Vehicle.findOne({ user: req.user._id, isPrimary: true });

    const snoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await AlertState.findOneAndUpdate(
      { user: req.user._id, vehicle: vehicle?._id, alertKey: key },
      {
        $set: {
          isDismissed: false,
          snoozedUntil,
          type: 'document',
          title: key,
          message: 'Snoozed by user',
        },
      },
      { upsert: true }
    );

    return res.json({ success: true, message: `Alert snoozed for ${days} days.` });
  } catch (error) {
    next(error);
  }
}

export async function subscribePush(req, res, next) {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: 'Invalid push subscription.' });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        user: req.user._id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent: req.headers['user-agent'] || '',
      },
      { upsert: true, new: true }
    );

    return res.json({ success: true, message: 'Push subscription registered.' });
  } catch (error) {
    next(error);
  }
}
