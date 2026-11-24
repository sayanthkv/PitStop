/**
 * NTORQ Companion configuration constants
 * The app name and vehicle defaults can be changed from here.
 */
export const APP_CONFIG = {
  name: 'PitStop',
  shortName: 'PitStop',
  tagline: 'Personal Cockpit & Telemetry',
  version: '1.0.0',
  defaultModel: 'TVS NTORQ 125 Race Edition',
  defaultYear: 2023,
  defaultTankCapacity: 5.8, // in litres (user-editable, never strictly hardcoded)
  defaultReserveLevel: 1.0, // in litres
  defaultServiceKmInterval: 3000,
  defaultServiceMonthInterval: 3,
  defaultEstimatedMileage: 38, // km/l fallback
  defaultFuelRate: 102.5, // fallback rate in ₹
};

export const SERVICE_TYPES = [
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
];

export const DOCUMENT_TYPES = [
  { value: 'insurance', label: 'Insurance Policy' },
  { value: 'puc', label: 'PUC / Emission Certificate' },
  { value: 'registration_rc', label: 'Registration (RC)' },
  { value: 'road_tax', label: 'Road Tax Token' },
  { value: 'fitness', label: 'Fitness Certificate' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'custom', label: 'Other Document' },
];

export const RIDE_LABELS = [
  { value: 'commute', label: 'Daily Commute' },
  { value: 'leisure', label: 'Joyride / Leisure' },
  { value: 'errand', label: 'Quick Errand' },
  { value: 'touring', label: 'Highway / Touring' },
  { value: 'other', label: 'Other' },
];
