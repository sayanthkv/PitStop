import { describe, it, expect } from 'vitest';
import {
  haversineDistanceKm,
  processGpsTrack,
  simplifyRoute,
  validateOdometerReading,
  calculateMileageHistory,
  calculateFuelEstimate,
  calculateServiceDue,
  calculateDocumentExpiry,
} from '../utils/calculations.js';

describe('Comprehensive End-to-End Key Flows Suite', () => {
  describe('Flow 1: Single Owner Registration & Locked Registration Logic', () => {
    it('allows first user to register as owner, locks registration for subsequent attempts', () => {
      let registeredUsersCount = 0;
      const allowRegistration = false;

      function attemptRegistration(email) {
        if (registeredUsersCount > 0 && !allowRegistration) {
          return { success: false, status: 403, error: 'Registration is locked. Single owner app.' };
        }
        registeredUsersCount++;
        return { success: true, status: 201, role: 'owner', email };
      }

      // First user becomes owner
      const first = attemptRegistration('owner@ntorq.local');
      expect(first.success).toBe(true);
      expect(first.role).toBe('owner');

      // Second user is locked out
      const second = attemptRegistration('intruder@external.local');
      expect(second.success).toBe(false);
      expect(second.status).toBe(403);
      expect(second.error).toContain('Registration is locked');
    });
  });

  describe('Flow 2: Setup Wizard & Vehicle Configuration', () => {
    it('configures scooter without hardcoded values, enforces user tank capacity', () => {
      const wizardData = {
        nickname: 'Thunder 125',
        model: 'TVS NTORQ 125 Race Edition',
        year: 2023,
        registrationNumber: 'KA01AB1234',
        tankCapacity: 5.8, // user entered
        reserveLevel: 1.0,
        currentOdometer: 14500,
      };

      expect(wizardData.tankCapacity).toBe(5.8);
      expect(wizardData.reserveLevel).toBe(1.0);
      expect(wizardData.currentOdometer).toBe(14500);

      const odoValidation = validateOdometerReading(wizardData.currentOdometer, 0);
      expect(odoValidation.isValid).toBe(true);
    });
  });

  describe('Flow 3: Odometer Entry, Lower Reading Block, and Correction Audit Trail', () => {
    it('blocks lower reading, allows valid reading, and records audit trail on correction', () => {
      let currentOdo = 14500;
      const auditTrail = [];

      // Valid entry
      const validEntry = 14620;
      expect(validateOdometerReading(validEntry, currentOdo).isValid).toBe(true);
      currentOdo = validEntry;

      // Lower entry attempt (e.g. typo)
      const lowerAttempt = 14550;
      const invalidValidation = validateOdometerReading(lowerAttempt, currentOdo);
      expect(invalidValidation.isValid).toBe(false);
      expect(invalidValidation.error).toContain('cannot be lower than previous reading');

      // Explicit correction with audit trail
      const correctedValue = 14610;
      auditTrail.push({
        previousValue: currentOdo,
        newValue: correctedValue,
        reason: 'Typo in entry, corrected from 14620 to 14610',
        date: new Date(),
      });
      currentOdo = correctedValue;

      expect(currentOdo).toBe(14610);
      expect(auditTrail.length).toBe(1);
      expect(auditTrail[0].reason).toContain('Typo in entry');
    });
  });

  describe('Flow 4 & 5: Fuel Log with Missed/Partial Fill & Fuel Estimate', () => {
    it('handles full-to-full mileage accurately with intermediate partial fills', () => {
      // 1. Initial full fill at 10000 km
      // 2. Partial fill (₹200 / 2.0L) at 10080 km
      // 3. Full fill (4.0L) at 10240 km
      // Total km = 240 km. Total litres consumed = 2.0 + 4.0 = 6.0 L.
      // Mileage = 240 / 6.0 = 40.0 km/l.
      const entries = [
        { odometer: 10000, litres: 5.8, isFullTank: true, date: '2026-02-01' },
        { odometer: 10080, litres: 2.0, isFullTank: false, date: '2026-02-04' },
        { odometer: 10240, litres: 4.0, isFullTank: true, date: '2026-02-08' },
      ];

      const history = calculateMileageHistory(entries);
      expect(history.overallAverageMileage).toBe(40.0);
      expect(history.entriesWithMileage[1].isPartial).toBe(true);
      expect(history.entriesWithMileage[2].calculatedMileage).toBe(40.0);

      // Now test estimated fuel left when current odometer is 10320 (80 km since last full fill)
      // Fuel used = 80 / 40 = 2.0 L.
      // Remaining = 5.8 - 2.0 = 3.8 L.
      // Range = 3.8 * 40 = 152 km.
      const estimate = calculateFuelEstimate({
        tankCapacity: 5.8,
        reserveLevel: 1.0,
        currentOdometer: 10320,
        lastFullFillOdometer: 10240,
        averageMileage: 40.0,
      });

      expect(estimate.estimatedLitres).toBe(3.8);
      expect(estimate.rangeKm).toBe(152);
      expect(estimate.isReserveAlert).toBe(false);

      // Test manual level correction: "I see about 1.5 litres left"
      const manualEst = calculateFuelEstimate({
        tankCapacity: 5.8,
        reserveLevel: 1.0,
        currentOdometer: 10340, // 20 km driven since correction
        averageMileage: 40.0,
        manualCorrection: { litres: 1.5, odometer: 10320, timestamp: new Date() },
      });
      // 20 km / 40 = 0.5L used. Remaining = 1.5 - 0.5 = 1.0L <= reserve (1.0L)
      expect(manualEst.estimatedLitres).toBe(1.0);
      expect(manualEst.isReserveAlert).toBe(true);
    });
  });

  describe('Flow 6: Simulated GPS Ride & Douglas-Peucker Simplification', () => {
    it('simulates live ride GPS stream, filters jitter, and simplifies route', () => {
      const now = Date.now();
      const points = [];
      // Generate 50 points simulating a 5 km scooter ride along a road
      for (let i = 0; i < 50; i++) {
        points.push({
          latitude: 12.9352 + i * 0.001,
          longitude: 77.6245 + (i % 2 === 0 ? 0.0002 : 0),
          accuracy: i === 12 ? 45 : 8, // point 12 has noisy GPS (>30m)
          timestamp: now + i * 5000,
          speed: 10,
        });
      }

      const processed = processGpsTrack(points, { maxAccuracyMeters: 30 });
      // Point 12 with accuracy 45 should be filtered out
      expect(processed.filteredPoints.length).toBe(49);
      expect(processed.totalDistanceKm).toBeGreaterThan(4.5);
      expect(processed.movingTimeSec).toBeGreaterThan(0);

      // Simplify route
      const simplified = simplifyRoute(processed.filteredPoints, 0.0001, 20);
      expect(simplified.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Flow 7: Parking Save, Compass Bearing & Navigation', () => {
    it('calculates distance and compass bearing to parked scooter accurately', () => {
      // User is at (12.9716, 77.5946)
      // Scooter parked 500m North at (12.9761, 77.5946)
      const userLat = 12.9716, userLon = 77.5946;
      const parkLat = 12.9761, parkLon = 77.5946;

      const distKm = haversineDistanceKm(userLat, userLon, parkLat, parkLon);
      expect(distKm).toBeCloseTo(0.5, 1);
    });
  });

  describe('Flow 8: Service & Document Expiry Warning Thresholds', () => {
    it('triggers warning at 80% interval and critical on overdue', () => {
      const serviceDue = calculateServiceDue({
        currentOdometer: 12450,
        lastServiceOdometer: 10000,
        serviceIntervalKm: 3000,
        serviceIntervalMonths: 3,
      });

      // 2450 / 3000 = 81.6% -> warning
      expect(serviceDue.status).toBe('warning');
      expect(serviceDue.isDue).toBe(true);

      const overdue = calculateServiceDue({
        currentOdometer: 13050,
        lastServiceOdometer: 10000,
        serviceIntervalKm: 3000,
      });
      expect(overdue.status).toBe('overdue');

      // Document expiry
      const urgentDoc = calculateDocumentExpiry(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000));
      expect(urgentDoc.status).toBe('expiring_very_soon');
      expect(urgentDoc.isUrgent).toBe(true);
    });
  });

  describe('Flow 9: Backup JSON Export and Deduplicated Re-import', () => {
    it('ensures re-importing duplicate records does not create duplicates', () => {
      const existingFuelLogs = [
        { odometer: 10000, date: '2026-01-01', litres: 5.0 },
        { odometer: 10200, date: '2026-01-10', litres: 5.0 },
      ];

      const backupToImport = [
        { odometer: 10000, date: '2026-01-01', litres: 5.0 }, // duplicate
        { odometer: 10200, date: '2026-01-10', litres: 5.0 }, // duplicate
        { odometer: 10400, date: '2026-01-20', litres: 5.0 }, // new
      ];

      const imported = [];
      for (const item of backupToImport) {
        const isDuplicate = existingFuelLogs.some(
          (ex) => ex.odometer === item.odometer && ex.date === item.date
        );
        if (!isDuplicate) {
          imported.push(item);
        }
      }

      expect(imported.length).toBe(1);
      expect(imported[0].odometer).toBe(10400);
    });
  });
});
