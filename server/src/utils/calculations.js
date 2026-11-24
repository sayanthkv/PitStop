/**
 * Pure calculation utilities for NTORQ Companion:
 * - Haversine distance, accuracy filtering, jitter removal, Douglas-Peucker simplification
 * - Full-to-full mileage calculation, handling consecutive & missed/partial fills
 * - Estimated fuel left, percentage, range left, reserve alert threshold
 * - Odometer validation, reading correction, inactivity nudge
 * - Trip cost estimation, cost per km, top-up cost
 * - Service due computation (km & date), warning levels (80%, 100%+), projected service date
 * - Document expiry urgency calculation
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Calculate distance between two lat/lon points using the Haversine formula (km)
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Filter and smooth GPS track points:
 * - Drop points with accuracy > maxAccuracyMeters (default 30m)
 * - Ignore jitter when stationary (distance < jitterThresholdKm, default 3m)
 * - Calculates distance, moving time, avg speed, max speed
 *
 * @param {Array<{latitude: number, longitude: number, accuracy?: number, timestamp?: number, speed?: number}>} points
 * @param {object} options
 * @returns {{filteredPoints: Array, totalDistanceKm: number, movingTimeSec: number, avgSpeedKmh: number, maxSpeedKmh: number}}
 */
export function processGpsTrack(points, options = {}) {
  const maxAccuracy = options.maxAccuracyMeters ?? 30;
  const jitterThresholdKm = (options.jitterThresholdMeters ?? 3) / 1000;
  const minSpeedKmh = options.minSpeedKmh ?? 1.5;

  if (!Array.isArray(points) || points.length === 0) {
    return {
      filteredPoints: [],
      totalDistanceKm: 0,
      movingTimeSec: 0,
      avgSpeedKmh: 0,
      maxSpeedKmh: 0,
    };
  }

  const validPoints = [];
  let totalDistanceKm = 0;
  let movingTimeSec = 0;
  let maxSpeedKmh = 0;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (typeof pt.latitude !== 'number' || typeof pt.longitude !== 'number') continue;
    if (pt.accuracy && pt.accuracy > maxAccuracy) continue;

    if (validPoints.length === 0) {
      validPoints.push(pt);
      continue;
    }

    const prevPt = validPoints[validPoints.length - 1];
    const segmentDist = haversineDistanceKm(prevPt.latitude, prevPt.longitude, pt.latitude, pt.longitude);

    // If stationary jitter (< 3m), skip unless significant time passed
    if (segmentDist < jitterThresholdKm) {
      continue;
    }

    const timeDiffSec = pt.timestamp && prevPt.timestamp
      ? Math.max(0.1, (new Date(pt.timestamp).getTime() - new Date(prevPt.timestamp).getTime()) / 1000)
      : null;

    let segmentSpeedKmh = 0;
    if (typeof pt.speed === 'number' && pt.speed >= 0) {
      segmentSpeedKmh = pt.speed * 3.6; // convert m/s to km/h
    } else if (timeDiffSec && timeDiffSec > 0) {
      segmentSpeedKmh = (segmentDist / (timeDiffSec / 3600));
    }

    // Ignore unrealistic GPS teleport spikes (> 160 km/h for a scooter)
    if (segmentSpeedKmh > 160) {
      continue;
    }

    totalDistanceKm += segmentDist;
    if (segmentSpeedKmh > maxSpeedKmh) {
      maxSpeedKmh = segmentSpeedKmh;
    }

    if (timeDiffSec && segmentSpeedKmh >= minSpeedKmh) {
      movingTimeSec += timeDiffSec;
    }

    validPoints.push(pt);
  }

  const avgSpeedKmh = movingTimeSec > 0
    ? (totalDistanceKm / (movingTimeSec / 3600))
    : 0;

  return {
    filteredPoints: validPoints,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    movingTimeSec: Math.round(movingTimeSec),
    avgSpeedKmh: Math.round(avgSpeedKmh * 10) / 10,
    maxSpeedKmh: Math.round(maxSpeedKmh * 10) / 10,
  };
}

/**
 * Douglas-Peucker line simplification for GPS routes
 */
function perpendicularDistance(p, lineStart, lineEnd) {
  const x = p.longitude;
  const y = p.latitude;
  const x1 = lineStart.longitude;
  const y1 = lineStart.latitude;
  const x2 = lineEnd.longitude;
  const y2 = lineEnd.latitude;

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return Math.hypot(x - x1, y - y1);
  }

  const num = Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1);
  const den = Math.hypot(dx, dy);
  return num / den;
}

export function simplifyRoute(points, epsilon = 0.00005, maxPoints = 500) {
  if (!Array.isArray(points) || points.length <= 2) return points;

  function rdp(pts) {
    if (pts.length <= 2) return pts;
    let maxDist = 0;
    let index = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const dist = perpendicularDistance(pts[i], pts[0], pts[pts.length - 1]);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }
    if (maxDist > epsilon) {
      const left = rdp(pts.slice(0, index + 1));
      const right = rdp(pts.slice(index));
      return left.slice(0, -1).concat(right);
    }
    return [pts[0], pts[pts.length - 1]];
  }

  let simplified = rdp(points);

  // If still above maxPoints, uniformly subsample to maxPoints
  if (simplified.length > maxPoints) {
    const step = (simplified.length - 1) / (maxPoints - 1);
    const capped = [];
    for (let i = 0; i < maxPoints; i++) {
      capped.push(simplified[Math.round(i * step)]);
    }
    return capped;
  }

  return simplified;
}

/**
 * Odometer reading validator
 * Odometer reading cannot be lower than the previous reading.
 */
export function validateOdometerReading(newReading, latestReading) {
  const numNew = Number(newReading);
  if (isNaN(numNew) || numNew < 0) {
    return { isValid: false, error: 'Odometer reading must be a positive number.' };
  }
  if (typeof latestReading === 'number' && numNew < latestReading) {
    return {
      isValid: false,
      error: `New reading (${numNew} km) cannot be lower than previous reading (${latestReading} km). Use "Correct reading" if adjusting a mistake.`,
    };
  }
  return { isValid: true };
}

/**
 * Check if an odometer update nudge should be displayed (> 14 days)
 */
export function checkOdometerNudge(latestDate, nudgeDays = 14) {
  if (!latestDate) return true;
  const lastTime = new Date(latestDate).getTime();
  const diffDays = (Date.now() - lastTime) / (1000 * 60 * 60 * 24);
  return diffDays >= nudgeDays;
}

/**
 * Full-to-full mileage calculation:
 * - Computes mileage between consecutive full-tank entries
 * - Handles intermediate partial fills by accumulating their litres until the next full fill
 * - Calculates overall average mileage and last 5 fills average
 *
 * @param {Array<{odometer: number, litres: number, isFullTank: boolean, date: string|Date}>} entries (sorted by date asc)
 */
export function calculateMileageHistory(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return {
      entriesWithMileage: [],
      overallAverageMileage: 0,
      last5AverageMileage: 0,
      bestMileage: 0,
      worstMileage: 0,
    };
  }

  // Sort ascending by odometer/date
  const sorted = [...entries].sort((a, b) => (a.odometer - b.odometer) || (new Date(a.date) - new Date(b.date)));

  const result = [];
  let pendingLitres = 0;
  let lastFullIndex = -1;
  const fullCalculations = [];

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    const item = {
      ...entry,
      calculatedMileage: null,
      kmSinceLastFull: null,
      litresUsed: null,
      isPartial: !entry.isFullTank,
    };

    if (lastFullIndex === -1) {
      // First fill is the baseline anchor
      if (entry.isFullTank) {
        lastFullIndex = i;
        item.calculatedMileage = null; // Baseline fill has no previous reference
      }
      result.push(item);
      continue;
    }

    if (!entry.isFullTank) {
      // Partial fill: accumulate litres for next full fill calculation
      pendingLitres += entry.litres;
      result.push(item);
      continue;
    }

    // This is a full fill after a previous full fill (with zero or more partial fills in between)
    const prevFullEntry = sorted[lastFullIndex];
    const kmDriven = entry.odometer - prevFullEntry.odometer;
    const totalLitres = pendingLitres + entry.litres;

    if (kmDriven > 0 && totalLitres > 0) {
      const mileage = Math.round((kmDriven / totalLitres) * 100) / 100;
      item.calculatedMileage = mileage;
      item.kmSinceLastFull = kmDriven;
      item.litresUsed = totalLitres;
      fullCalculations.push({ mileage, kmDriven, totalLitres });
    }

    pendingLitres = 0;
    lastFullIndex = i;
    result.push(item);
  }

  // Calculate overall and last 5 averages
  let totalKm = 0;
  let totalLitres = 0;
  fullCalculations.forEach((calc) => {
    totalKm += calc.kmDriven;
    totalLitres += calc.totalLitres;
  });

  const overallAverageMileage = totalLitres > 0
    ? Math.round((totalKm / totalLitres) * 100) / 100
    : 0;

  const last5 = fullCalculations.slice(-5);
  let last5Km = 0;
  let last5Litres = 0;
  last5.forEach((c) => {
    last5Km += c.kmDriven;
    last5Litres += c.totalLitres;
  });
  const last5AverageMileage = last5Litres > 0
    ? Math.round((last5Km / last5Litres) * 100) / 100
    : overallAverageMileage;

  const validMileages = fullCalculations.map((c) => c.mileage);
  const bestMileage = validMileages.length > 0 ? Math.max(...validMileages) : 0;
  const worstMileage = validMileages.length > 0 ? Math.min(...validMileages) : 0;

  return {
    entriesWithMileage: result,
    overallAverageMileage,
    last5AverageMileage,
    bestMileage,
    worstMileage,
    totalCalculatedFills: fullCalculations.length,
  };
}

/**
 * Calculate estimated fuel left and range:
 * - fuelLeft = capacity - (kmSinceFullFill / currentAverageMileage)
 * - manual correction override if set after the full fill
 * - Range left = fuelLeft * currentAverageMileage
 * - Alert at reserveLevel
 */
export function calculateFuelEstimate({
  tankCapacity,
  reserveLevel = 1.0,
  currentOdometer,
  lastFullFillOdometer,
  averageMileage,
  manualCorrection = null, // { litres: number, odometer: number, timestamp: Date }
}) {
  const capacity = Number(tankCapacity) || 5.8;
  const reserve = Number(reserveLevel) || 1.0;
  const avgMileage = Number(averageMileage) > 0 ? Number(averageMileage) : 38; // Default fallback TVS NTORQ realistic mileage

  let estimatedLitres = capacity;

  if (manualCorrection && manualCorrection.odometer && typeof manualCorrection.litres === 'number') {
    const kmSinceManual = Math.max(0, currentOdometer - manualCorrection.odometer);
    const fuelUsed = kmSinceManual / avgMileage;
    estimatedLitres = Math.max(0, manualCorrection.litres - fuelUsed);
  } else if (typeof lastFullFillOdometer === 'number') {
    const kmSinceFull = Math.max(0, currentOdometer - lastFullFillOdometer);
    const fuelUsed = kmSinceFull / avgMileage;
    estimatedLitres = Math.max(0, capacity - fuelUsed);
  }

  estimatedLitres = Math.min(capacity, Math.round(estimatedLitres * 100) / 100);
  const percentage = Math.min(100, Math.max(0, Math.round((estimatedLitres / capacity) * 100)));
  const rangeKm = Math.round(estimatedLitres * avgMileage);
  const isReserveAlert = estimatedLitres <= reserve;

  return {
    estimatedLitres,
    capacity,
    reserveLevel: reserve,
    percentage,
    rangeKm,
    isReserveAlert,
    isEstimate: true,
  };
}

/**
 * Trip cost estimator:
 * Distance, round trip toggle, fuel needed, cost, fuel sufficiency check
 */
export function estimateTripCost({
  distanceKm,
  isRoundTrip = false,
  fuelPricePerLitre,
  averageMileage,
  currentFuelLeft,
}) {
  const dist = Number(distanceKm) || 0;
  const totalDistance = isRoundTrip ? dist * 2 : dist;
  const avgMileage = Number(averageMileage) > 0 ? Number(averageMileage) : 38;
  const price = Number(fuelPricePerLitre) || 102;
  const fuelLeft = Number(currentFuelLeft) || 0;

  const fuelNeededLitres = Math.round((totalDistance / avgMileage) * 100) / 100;
  const tripCost = Math.round(fuelNeededLitres * price * 100) / 100;
  const isFuelSufficient = fuelLeft >= fuelNeededLitres;
  const deficitLitres = isFuelSufficient ? 0 : Math.round((fuelNeededLitres - fuelLeft) * 100) / 100;
  const costPerKm = Math.round((price / avgMileage) * 100) / 100;
  const costPer100Km = Math.round((100 / avgMileage) * price * 100) / 100;

  return {
    totalDistanceKm: totalDistance,
    fuelNeededLitres,
    tripCost,
    isFuelSufficient,
    deficitLitres,
    costPerKm,
    costPer100Km,
  };
}

/**
 * Calculate cost to fill from empty and top up from current estimate
 */
export function calculateFillCosts({ tankCapacity, currentFuelLeft, fuelPricePerLitre }) {
  const capacity = Number(tankCapacity) || 5.8;
  const fuelLeft = Math.max(0, Math.min(capacity, Number(currentFuelLeft) || 0));
  const price = Number(fuelPricePerLitre) || 102;

  const costFromEmpty = Math.round(capacity * price * 100) / 100;
  const topUpLitres = Math.round((capacity - fuelLeft) * 100) / 100;
  const costToTopUp = Math.round(topUpLitres * price * 100) / 100;

  return {
    costFromEmpty,
    topUpLitres,
    costToTopUp,
  };
}

/**
 * Service Due Logic:
 * Calculates next service due based on km and months interval
 * Warning states:
 * - normal (< 80%)
 * - warning (80% - 99.9%)
 * - overdue (>= 100% or date passed)
 */
export function calculateServiceDue({
  currentOdometer,
  lastServiceOdometer = 0,
  lastServiceDate,
  serviceIntervalKm = 3000,
  serviceIntervalMonths = 3,
  averageKmPerDay = 15,
}) {
  const currentOdo = Number(currentOdometer) || 0;
  const lastOdo = Number(lastServiceOdometer) || 0;
  const kmInterval = Number(serviceIntervalKm) || 3000;
  const monthInterval = Number(serviceIntervalMonths) || 3;

  const kmDrivenSinceService = Math.max(0, currentOdo - lastOdo);
  const kmRemaining = Math.max(0, kmInterval - kmDrivenSinceService);
  const kmProgress = Math.min(100, Math.round((kmDrivenSinceService / kmInterval) * 100));

  let dateDue = null;
  let daysRemainingDate = null;
  let dateProgress = 0;

  if (lastServiceDate) {
    const lastDate = new Date(lastServiceDate);
    dateDue = new Date(lastDate);
    dateDue.setMonth(dateDue.getMonth() + monthInterval);

    const totalDaysInInterval = monthInterval * 30.44;
    const daysSinceService = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    daysRemainingDate = Math.round((dateDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    dateProgress = Math.min(100, Math.max(0, Math.round((daysSinceService / totalDaysInInterval) * 100)));
  }

  // Projection for when km interval will be reached
  let projectedKmDate = null;
  const kmPerDay = Number(averageKmPerDay) > 0 ? Number(averageKmPerDay) : 15;
  if (kmRemaining > 0) {
    const daysToKmService = Math.round(kmRemaining / kmPerDay);
    projectedKmDate = new Date(Date.now() + daysToKmService * 24 * 60 * 60 * 1000);
  } else {
    projectedKmDate = new Date();
  }

  const maxProgress = Math.max(kmProgress, dateProgress);
  let status = 'normal';
  if (kmDrivenSinceService >= kmInterval || (daysRemainingDate !== null && daysRemainingDate <= 0)) {
    status = 'overdue';
  } else if (maxProgress >= 80) {
    status = 'warning';
  }

  return {
    kmInterval,
    monthInterval,
    kmDrivenSinceService,
    kmRemaining,
    kmProgress,
    dateDue,
    daysRemainingDate,
    dateProgress,
    projectedKmDate,
    maxProgress,
    status, // 'normal' | 'warning' | 'overdue'
    isDue: status === 'overdue' || status === 'warning',
  };
}

/**
 * Document expiry urgency calculation
 * - expired (< 0 days)
 * - expiring_very_soon (0 - 7 days)
 * - expiring_soon (8 - 30 days)
 * - valid (> 30 days)
 */
export function calculateDocumentExpiry(expiryDate) {
  if (!expiryDate) return { daysRemaining: null, status: 'valid' };
  const exp = new Date(expiryDate).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

  let status = 'valid';
  if (diffDays < 0) {
    status = 'expired';
  } else if (diffDays <= 7) {
    status = 'expiring_very_soon';
  } else if (diffDays <= 30) {
    status = 'expiring_soon';
  }

  return {
    daysRemaining: diffDays,
    status,
    isUrgent: status !== 'valid',
  };
}
