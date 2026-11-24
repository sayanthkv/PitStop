import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const vehicleSetupSchema = z.object({
  nickname: z.string().min(1, 'Nickname is required').default('My NTORQ'),
  model: z.string().min(1, 'Model is required').default('TVS NTORQ 125 Race Edition'),
  year: z.coerce.number().int().min(2010).max(2035).default(2023),
  registrationNumber: z.string().min(3, 'Registration number is required'),
  fuelType: z.string().default('Petrol'),
  tankCapacity: z.coerce.number().positive('Tank capacity must be a positive number'),
  reserveLevel: z.coerce.number().positive('Reserve level must be positive').default(1.0),
  purchaseDate: z.string().or(z.date()).optional(),
  currentOdometer: z.coerce.number().min(0, 'Odometer reading cannot be negative').default(0),
  photoUrl: z.string().nullable().optional(),
});

export const vehicleUpdateSchema = vehicleSetupSchema.partial();

export const odometerReadingSchema = z.object({
  reading: z.coerce.number().min(0, 'Reading must be a positive number'),
  date: z.string().or(z.date()).optional(),
  source: z.enum(['manual', 'ride', 'fuel', 'service']).default('manual'),
  note: z.string().optional().default(''),
});

export const odometerCorrectionSchema = z.object({
  newValue: z.coerce.number().min(0, 'New reading must be a positive number'),
  reason: z.string().min(3, 'Reason for correction is required'),
});

export const fuelEntrySchema = z.object({
  date: z.string().or(z.date()).optional(),
  odometer: z.coerce.number().min(0, 'Odometer is required'),
  litres: z.coerce.number().positive('Litres must be greater than 0'),
  pricePerLitre: z.coerce.number().positive('Price per litre must be positive'),
  totalCost: z.coerce.number().positive('Total cost must be positive'),
  isFullTank: z.boolean().default(true),
  station: z.string().optional().default(''),
  note: z.string().optional().default(''),
  receiptUrl: z.string().nullable().optional(),
});

export const manualFuelCorrectionSchema = z.object({
  litres: z.coerce.number().min(0, 'Litres must be non-negative'),
  odometer: z.coerce.number().min(0).optional(),
});

export const fuelPriceSchema = z.object({
  rate: z.coerce.number().positive('Fuel rate must be a positive number'),
  date: z.string().or(z.date()).optional(),
  location: z.string().optional().default(''),
});

export const rideSchema = z.object({
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
  distanceKm: z.coerce.number().min(0),
  movingTimeSec: z.coerce.number().default(0),
  totalTimeSec: z.coerce.number().default(0),
  avgSpeedKmh: z.coerce.number().default(0),
  maxSpeedKmh: z.coerce.number().default(0),
  startOdometer: z.coerce.number().nullable().optional(),
  endOdometer: z.coerce.number().nullable().optional(),
  isOdometerSynced: z.boolean().default(false),
  label: z.enum(['commute', 'leisure', 'errand', 'touring', 'other']).default('commute'),
  note: z.string().optional().default(''),
  hasRouteData: z.boolean().default(true),
  routePoints: z
    .array(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
        altitude: z.number().nullable().optional(),
        accuracy: z.number().nullable().optional(),
        speed: z.number().nullable().optional(),
        timestamp: z.string().or(z.date()).optional(),
      })
    )
    .optional()
    .default([]),
});

export const parkingSpotSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().nullable().optional(),
  parkedAt: z.string().or(z.date()).optional(),
  note: z.string().optional().default(''),
  photoUrl: z.string().nullable().optional(),
});

export const serviceEntrySchema = z.object({
  date: z.string().or(z.date()).optional(),
  odometer: z.coerce.number().min(0),
  serviceType: z.enum([
    'general service',
    'oil change',
    'tyre',
    'battery',
    'brake',
    'chain/belt',
    'air filter',
    'repair',
    'wash',
    'other',
  ]),
  workshop: z.string().optional().default(''),
  cost: z.coerce.number().min(0),
  notes: z.string().optional().default(''),
  receiptUrl: z.string().nullable().optional(),
  nextDueKm: z.coerce.number().nullable().optional(),
  nextDueDate: z.string().or(z.date()).nullable().optional(),
});

export const serviceIntervalSchema = z.object({
  kmInterval: z.coerce.number().min(500).default(3000),
  monthInterval: z.coerce.number().min(1).default(3),
  averageKmPerDay: z.coerce.number().min(1).default(15),
});

export const vehicleDocumentSchema = z.object({
  type: z.enum([
    'insurance',
    'puc',
    'registration_rc',
    'road_tax',
    'fitness',
    'driving_license',
    'custom',
  ]),
  title: z.string().min(1, 'Title is required'),
  provider: z.string().optional().default(''),
  policyNumber: z.string().optional().default(''),
  startDate: z.string().or(z.date()).nullable().optional(),
  expiryDate: z.string().or(z.date()),
  premium: z.coerce.number().nullable().optional(),
  attachmentUrl: z.string().nullable().optional(),
  attachmentType: z.enum(['image', 'pdf']).nullable().optional(),
  notes: z.string().optional().default(''),
});

export const documentRenewalSchema = z.object({
  newExpiryDate: z.string().or(z.date()),
  premium: z.coerce.number().nullable().optional(),
  notes: z.string().optional().default(''),
});

export const tyreBatterySchema = z.object({
  itemType: z.enum(['front_tyre', 'rear_tyre', 'battery', 'spark_plug', 'brake_pads']),
  brand: z.string().min(1, 'Brand is required'),
  modelOrSpec: z.string().optional().default(''),
  installDate: z.string().or(z.date()).optional(),
  installOdometer: z.coerce.number().min(0),
  warrantyMonths: z.coerce.number().nullable().optional(),
  expectedLifespanKm: z.coerce.number().default(20000),
  notes: z.string().optional().default(''),
});

export const bluetoothProfileSchema = z.object({
  deviceName: z.string().min(1),
  deviceId: z.string().min(1),
  serviceUuids: z.array(z.string()).default([]),
  decoders: z
    .array(
      z.object({
        characteristicUuid: z.string(),
        label: z.string(),
        offset: z.number().default(0),
        byteLength: z.number().default(1),
        isLittleEndian: z.boolean().default(true),
        scale: z.number().default(1.0),
        unit: z.string().default(''),
        description: z.string().default(''),
      })
    )
    .default([]),
  notes: z.string().optional().default(''),
});
