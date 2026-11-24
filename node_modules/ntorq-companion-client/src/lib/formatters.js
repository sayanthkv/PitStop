export function formatKm(num) {
  if (num === null || num === undefined || isNaN(num)) return '0 km';
  return `${Number(num).toLocaleString('en-IN', { maximumFractionDigits: 1 })} km`;
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  return `₹${Math.round(Number(amount)).toLocaleString('en-IN')}`;
}

export function formatLitres(litres) {
  if (litres === null || litres === undefined || isNaN(litres)) return '0.0 L';
  return `${Number(litres).toFixed(1)} L`;
}

export function formatMileage(kmPerLitre) {
  if (!kmPerLitre || isNaN(kmPerLitre)) return '-- km/l';
  return `${Number(kmPerLitre).toFixed(1)} km/l`;
}

export function formatDate(dateString) {
  if (!dateString) return '--';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0m';
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) {
    return `${h}h ${m % 60}m`;
  }
  return `${m}m`;
}

export function formatSpeed(kmh) {
  if (!kmh || isNaN(kmh)) return '0 km/h';
  return `${Math.round(Number(kmh))} km/h`;
}
