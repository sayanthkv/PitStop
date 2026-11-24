import { describe, it, expect } from 'vitest';
import {
  haversineDistanceKm,
  processGpsTrack,
  simplifyRoute,
  validateOdometerReading,
  checkOdometerNudge,
  calculateMileageHistory,
  calculateFuelEstimate,
  estimateTripCost,
  calculateFillCosts,
  calculateServiceDue,
  calculateDocumentExpiry,
} from '../utils/calculations.js';

describe('Calculations Utility Tests', () => {
  describe('Haversine and GPS Filtering', () => {
    it('calculates accurate distance between known points', () => {
      // Bangalore Majestic to Indiranagar: approx 7.5 - 8.5 km
      const majLat = 12.9767, majLon = 77.5713;
      const indLat = 12.9784, indLon = 77.6408;
      const dist = haversineDistanceKm(majLat, majLon, indLat, indLon);
      expect(dist).toBeGreaterThan(7.0);
      expect(dist).toBeLessThan(8.0);
    });

    it('filters out noisy points (> 30m accuracy) and stationary jitter', () => {
      const now = Date.now();
      const noisyTrack = [
        { latitude: 12.9716, longitude: 77.5946, accuracy: 8, timestamp: now },
        // stationary jitter (< 2m from previous)
        { latitude: 12.971601, longitude: 77.594601, accuracy: 6, timestamp: now + 1000 },
        // inaccurate point (> 30m accuracy)
        { latitude: 12.9750, longitude: 77.5990, accuracy: 55, timestamp: now + 2000 },
        // valid moving point
        { latitude: 12.9730, longitude: 77.5960, accuracy: 12, timestamp: now + 10000, speed: 8 },
        // another valid moving point
        { latitude: 12.9750, longitude: 77.5980, accuracy: 10, timestamp: now + 20000, speed: 10 },
      ];

      const result = processGpsTrack(noisyTrack, { maxAccuracyMeters: 30, jitterThresholdMeters: 3 });

      // Noisy point with accuracy 55 and jitter should be dropped
      expect(result.filteredPoints.length).toBe(3);
      expect(result.totalDistanceKm).toBeGreaterThan(0.3);
      expect(result.maxSpeedKmh).toBeGreaterThan(0);
      expect(result.movingTimeSec).toBeGreaterThan(0);
    });

    it('simplifies route using Douglas-Peucker without losing endpoints', () => {
      const points = [];
      for (let i = 0; i < 20; i++) {
        points.push({ latitude: 12.0 + i * 0.001, longitude: 77.0 + (i % 2 === 0 ? 0.00005 : 0) });
      }
      const simplified = simplifyRoute(points, 0.0001, 10);
      expect(simplified.length).toBeLessThanOrEqual(10);
      expect(simplified[0].latitude).toBe(points[0].latitude);
      expect(simplified[simplified.length - 1].latitude).toBe(points[points.length - 1].latitude);
    });
  });

  describe('Full-to-Full Mileage Calculation & Missed/Partial Fills', () => {
    it('calculates full-to-full mileage accurately with an intermediate partial fill', () => {
      // Scenario:
      // Fill 1: 10,000 km, full tank (baseline)
      // Fill 2 (missed/partial): 10,120 km, 2.5 L, partial fill (e.g. ₹250 quick petrol)
      // Fill 3: 10,250 km, 4.0 L, full tank
      // Total km between full tanks = 10,250 - 10,000 = 250 km
      // Total litres consumed = 2.5 + 4.0 = 6.5 L
      // Mileage = 250 / 6.5 = 38.46 km/l
      const entries = [
        { odometer: 10000, litres: 5.0, isFullTank: true, date: '2026-01-01' },
        { odometer: 10120, litres: 2.5, isFullTank: false, date: '2026-01-05' },
        { odometer: 10250, litres: 4.0, isFullTank: true, date: '2026-01-10' },
      ];

      const history = calculateMileageHistory(entries);

      expect(history.totalCalculatedFills).toBe(1);
      expect(history.overallAverageMileage).toBeCloseTo(38.46, 1);
      expect(history.entriesWithMileage[1].isPartial).toBe(true);
      expect(history.entriesWithMileage[1].calculatedMileage).toBeNull();
      expect(history.entriesWithMileage[2].calculatedMileage).toBeCloseTo(38.46, 1);
      expect(history.entriesWithMileage[2].kmSinceLastFull).toBe(250);
      expect(history.entriesWithMileage[2].litresUsed).toBe(6.5);
    });

    it('computes last 5 fills average correctly', () => {
      const entries = [
        { odometer: 1000, litres: 5.0, isFullTank: true, date: '2026-01-01' },
        { odometer: 1200, litres: 5.0, isFullTank: true, date: '2026-01-05' }, // 40 km/l
        { odometer: 1400, litres: 5.0, isFullTank: true, date: '2026-01-10' }, // 40 km/l
        { odometer: 1600, litres: 5.0, isFullTank: true, date: '2026-01-15' }, // 40 km/l
        { odometer: 1800, litres: 5.0, isFullTank: true, date: '2026-01-20' }, // 40 km/l
        { odometer: 2000, litres: 5.0, isFullTank: true, date: '2026-01-25' }, // 40 km/l
      ];
      const history = calculateMileageHistory(entries);
      expect(history.overallAverageMileage).toBe(40);
      expect(history.last5AverageMileage).toBe(40);
      expect(history.bestMileage).toBe(40);
      expect(history.worstMileage).toBe(40);
    });
  });

  describe('Estimated Fuel and Range after Ride', () => {
    it('estimates remaining fuel and range after driving', () => {
      // Tank 5.8L, avg mileage 40 km/l
      // Full fill at 5000 km
      // Current odometer after a 120 km ride is 5120 km
      // Fuel used = 120 / 40 = 3.0 L
      // Remaining = 5.8 - 3.0 = 2.8 L
      // Percentage = (2.8 / 5.8) * 100 = 48.27%
      // Range = 2.8 * 40 = 112 km
      const result = calculateFuelEstimate({
        tankCapacity: 5.8,
        reserveLevel: 1.0,
        currentOdometer: 5120,
        lastFullFillOdometer: 5000,
        averageMileage: 40,
      });

      expect(result.estimatedLitres).toBeCloseTo(2.8, 1);
      expect(result.percentage).toBe(48);
      expect(result.rangeKm).toBe(112);
      expect(result.isReserveAlert).toBe(false);
    });

    it('triggers reserve alert when fuel is <= reserve level', () => {
      // 5000 to 5200 km = 200 km. 200 / 40 = 5.0 L used. Remaining = 0.8 L <= reserve (1.0 L)
      const result = calculateFuelEstimate({
        tankCapacity: 5.8,
        reserveLevel: 1.0,
        currentOdometer: 5200,
        lastFullFillOdometer: 5000,
        averageMileage: 40,
      });

      expect(result.estimatedLitres).toBeCloseTo(0.8, 1);
      expect(result.isReserveAlert).toBe(true);
    });

    it('respects manual fuel level correction', () => {
      // User manually sets "I see about 2.0 litres left" at 5100 km
      // Now odometer is 5140 km (40 km driven since correction)
      // Fuel used = 40 / 40 = 1.0 L
      // Remaining = 2.0 - 1.0 = 1.0 L
      const result = calculateFuelEstimate({
        tankCapacity: 5.8,
        reserveLevel: 1.0,
        currentOdometer: 5140,
        lastFullFillOdometer: 5000,
        averageMileage: 40,
        manualCorrection: { litres: 2.0, odometer: 5100, timestamp: new Date() },
      });

      expect(result.estimatedLitres).toBe(1.0);
      expect(result.isReserveAlert).toBe(true);
    });
  });

  describe('Odometer Validation and Nudge', () => {
    it('validates that reading cannot be lower than previous', () => {
      expect(validateOdometerReading(5000, 4800).isValid).toBe(true);
      expect(validateOdometerReading(5000, 5000).isValid).toBe(true);

      const invalid = validateOdometerReading(4700, 4800);
      expect(invalid.isValid).toBe(false);
      expect(invalid.error).toContain('cannot be lower');

      const negative = validateOdometerReading(-10, 0);
      expect(negative.isValid).toBe(false);
    });

    it('triggers nudge after 14 days without an update', () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

      expect(checkOdometerNudge(tenDaysAgo, 14)).toBe(false);
      expect(checkOdometerNudge(fifteenDaysAgo, 14)).toBe(true);
      expect(checkOdometerNudge(null, 14)).toBe(true);
    });
  });

  describe('Trip Cost Estimator and Fill Costs', () => {
    it('estimates trip cost, round trip, and fuel sufficiency', () => {
      // Distance 50 km, round trip -> 100 km
      // Mileage 40 km/l -> 2.5 L needed
      // Petrol price ₹100/L -> Cost ₹250
      // Current fuel left = 2.0 L -> Deficit = 0.5 L
      const trip = estimateTripCost({
        distanceKm: 50,
        isRoundTrip: true,
        fuelPricePerLitre: 100,
        averageMileage: 40,
        currentFuelLeft: 2.0,
      });

      expect(trip.totalDistanceKm).toBe(100);
      expect(trip.fuelNeededLitres).toBe(2.5);
      expect(trip.tripCost).toBe(250);
      expect(trip.isFuelSufficient).toBe(false);
      expect(trip.deficitLitres).toBe(0.5);
      expect(trip.costPerKm).toBe(2.5);
      expect(trip.costPer100Km).toBe(250);
    });

    it('calculates fill costs accurately', () => {
      const costs = calculateFillCosts({
        tankCapacity: 5.8,
        currentFuelLeft: 2.8,
        fuelPricePerLitre: 100,
      });
      expect(costs.costFromEmpty).toBe(580);
      expect(costs.topUpLitres).toBe(3.0);
      expect(costs.costToTopUp).toBe(300);
    });
  });

  describe('Service Due Logic and Projection', () => {
    it('identifies normal, warning (80%), and overdue states', () => {
      // Interval: 3000 km, 3 months
      // Last service at 10,000 km on today
      const now = new Date();

      // At 11,000 km (1000 km done / 3000 km = 33%) -> normal
      const normal = calculateServiceDue({
        currentOdometer: 11000,
        lastServiceOdometer: 10000,
        lastServiceDate: now,
        serviceIntervalKm: 3000,
        serviceIntervalMonths: 3,
      });
      expect(normal.status).toBe('normal');
      expect(normal.kmProgress).toBe(33);

      // At 12,500 km (2500 km done / 3000 km = 83%) -> warning (>= 80%)
      const warning = calculateServiceDue({
        currentOdometer: 12500,
        lastServiceOdometer: 10000,
        lastServiceDate: now,
        serviceIntervalKm: 3000,
        serviceIntervalMonths: 3,
      });
      expect(warning.status).toBe('warning');
      expect(warning.kmProgress).toBe(83);

      // At 13,100 km (3100 km done / 3000 km = 103%) -> overdue
      const overdue = calculateServiceDue({
        currentOdometer: 13100,
        lastServiceOdometer: 10000,
        lastServiceDate: now,
        serviceIntervalKm: 3000,
        serviceIntervalMonths: 3,
      });
      expect(overdue.status).toBe('overdue');
    });

    it('projects date when next service will be reached based on average km/day', () => {
      // 500 km remaining, 25 km/day -> 20 days from now
      const result = calculateServiceDue({
        currentOdometer: 12500,
        lastServiceOdometer: 10000,
        serviceIntervalKm: 3000,
        averageKmPerDay: 25,
      });
      expect(result.kmRemaining).toBe(500);
      expect(result.projectedKmDate).toBeInstanceOf(Date);
      const diffDays = Math.round((result.projectedKmDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(20);
    });
  });

  describe('Document Expiry Urgency', () => {
    it('categorizes document expiry correctly', () => {
      const now = Date.now();
      const expired = new Date(now - 2 * 24 * 60 * 60 * 1000);
      const urgent = new Date(now + 4 * 24 * 60 * 60 * 1000);
      const soon = new Date(now + 20 * 24 * 60 * 60 * 1000);
      const valid = new Date(now + 60 * 24 * 60 * 60 * 1000);

      expect(calculateDocumentExpiry(expired).status).toBe('expired');
      expect(calculateDocumentExpiry(urgent).status).toBe('expiring_very_soon');
      expect(calculateDocumentExpiry(soon).status).toBe('expiring_soon');
      expect(calculateDocumentExpiry(valid).status).toBe('valid');
    });
  });
});
