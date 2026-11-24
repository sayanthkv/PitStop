import webpush from 'web-push';
import { ENV } from '../config/env.js';

let isPushReady = false;

if (ENV.VAPID_PUBLIC_KEY && ENV.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      ENV.VAPID_SUBJECT,
      ENV.VAPID_PUBLIC_KEY,
      ENV.VAPID_PRIVATE_KEY
    );
    isPushReady = true;
  } catch (err) {
    console.warn('[WebPush] VAPID configuration failed:', err.message);
  }
}

export function isPushEnabled() {
  return isPushReady;
}

export async function sendWebPushNotification(subscription, payload) {
  if (!isPushReady || !subscription?.endpoint) return false;
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('[WebPush] Notification delivery error:', err.message);
    return false;
  }
}
