import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  Sun,
  Moon,
  AlertCircle,
} from 'lucide-react';
import { useWakeLock } from '../../hooks/useWakeLock.js';
import { haversineMeters } from '../../lib/geo.js';
import { formatTime } from '../../lib/formatters.js';
import { BottomSheet } from '../../components/common/BottomSheet.jsx';
import { api } from '../../lib/api.js';

const STORAGE_KEY = 'ntorq_inprogress_ride';

export function LiveRideTracker({ onRideSaved, onBack }) {
  const { requestWakeLock, releaseWakeLock, isLocked } = useWakeLock();

  const [rideState, setRideState] = useState('idle'); // 'idle' | 'running' | 'paused' | 'stopped'
  const [isHighContrastSunMode, setIsHighContrastSunMode] = useState(false);
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);

  // Live telemetry metrics
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [totalDistanceMeters, setTotalDistanceMeters] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [movingSeconds, setMovingSeconds] = useState(0);

  // Points buffer
  const [gpsPoints, setGpsPoints] = useState([]);
  const [gpsError, setGpsError] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState(null);

  // Ride summary form
  const [rideLabel, setRideLabel] = useState('commute');
  const [rideNote, setRideNote] = useState('');
  const [saveRouteData, setSaveRouteData] = useState(true);
  const [syncOdometerImmediately, setSyncOdometerImmediately] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const watchIdRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Restore in-progress ride from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.rideState === 'running' || parsed.rideState === 'paused') {
          setRideState(parsed.rideState);
          setTotalDistanceMeters(parsed.totalDistanceMeters || 0);
          setElapsedSeconds(parsed.elapsedSeconds || 0);
          setMovingSeconds(parsed.movingSeconds || 0);
          setMaxSpeed(parsed.maxSpeed || 0);
          setGpsPoints(parsed.gpsPoints || []);
          startTimeRef.current = parsed.startTime ? new Date(parsed.startTime) : new Date();
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Sync in-progress state to localStorage
  useEffect(() => {
    if (rideState === 'running' || rideState === 'paused') {
      const payload = {
        rideState,
        totalDistanceMeters,
        elapsedSeconds,
        movingSeconds,
        maxSpeed,
        gpsPoints,
        startTime: startTimeRef.current,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } else if (rideState === 'idle') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [rideState, totalDistanceMeters, elapsedSeconds, movingSeconds, maxSpeed, gpsPoints]);

  // Timer loop for duration
  useEffect(() => {
    if (rideState === 'running') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
        if (currentSpeed > 2.0) {
          setMovingSeconds((prev) => prev + 1);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [rideState, currentSpeed]);

  // GPS Position Watcher
  const handlePosition = useCallback(
    (position) => {
      const { latitude, longitude, accuracy, speed } = position.coords;
      setGpsAccuracy(accuracy);
      setGpsError('');

      // Filter: drop poor accuracy (> 30 m)
      if (accuracy > 30) {
        return;
      }

      const speedKmh = speed !== null && speed >= 0 ? speed * 3.6 : 0;
      setCurrentSpeed(Math.round(speedKmh));
      if (speedKmh > maxSpeed) {
        setMaxSpeed(Math.round(speedKmh));
      }

      const newPoint = {
        latitude,
        longitude,
        accuracy,
        speed: speed ?? 0,
        timestamp: new Date().toISOString(),
      };

      setGpsPoints((prevPoints) => {
        if (prevPoints.length === 0) {
          return [newPoint];
        }

        const lastPoint = prevPoints[prevPoints.length - 1];
        const distDelta = haversineMeters(
          lastPoint.latitude,
          lastPoint.longitude,
          latitude,
          longitude
        );

        // Filter stationary jitter (< 3 meters)
        if (distDelta < 3) {
          return prevPoints;
        }

        // Ignore unrealistic GPS teleport spikes (> 160 km/h)
        const timeDiffSec = Math.max(
          1,
          (new Date(newPoint.timestamp) - new Date(lastPoint.timestamp)) / 1000
        );
        const segmentSpeedKmh = (distDelta / 1000 / (timeDiffSec / 3600));
        if (segmentSpeedKmh > 160) {
          return prevPoints;
        }

        setTotalDistanceMeters((prevDist) => prevDist + distDelta);
        return [...prevPoints, newPoint];
      });
    },
    [maxSpeed]
  );

  const startTracking = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    requestWakeLock();
    startTimeRef.current = new Date();
    setRideState('running');

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => {
        setGpsError(`GPS Error: ${err.message}. Please enable location permissions.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );
  };

  const pauseTracking = () => {
    setRideState('paused');
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setCurrentSpeed(0);
  };

  const resumeTracking = () => {
    setRideState('running');
    requestWakeLock();
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => setGpsError(err.message),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );
  };

  const stopTracking = () => {
    pauseTracking();
    releaseWakeLock();
    setIsStopModalOpen(true);
  };

  const handleSaveRide = async () => {
    setIsSaving(true);
    const distKm = Math.round((totalDistanceMeters / 1000) * 100) / 100;
    const avgSpeed = movingSeconds > 0 ? (distKm / (movingSeconds / 3600)) : 0;

    const payload = {
      startTime: startTimeRef.current || new Date(),
      endTime: new Date(),
      distanceKm: distKm,
      movingTimeSec: movingSeconds,
      totalTimeSec: elapsedSeconds,
      avgSpeedKmh: Math.round(avgSpeed * 10) / 10,
      maxSpeedKmh: maxSpeed,
      isOdometerSynced: syncOdometerImmediately,
      label: rideLabel,
      note: rideNote,
      hasRouteData: saveRouteData,
      routePoints: saveRouteData ? gpsPoints : [],
    };

    try {
      await api.post('/rides', payload);
      localStorage.removeItem(STORAGE_KEY);
      setRideState('idle');
      setIsStopModalOpen(false);
      if (onRideSaved) onRideSaved();
    } catch (err) {
      setGpsError(err.message || 'Failed to save ride');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardRide = () => {
    if (window.confirm('Discard this ride and all tracked data?')) {
      localStorage.removeItem(STORAGE_KEY);
      setRideState('idle');
      setIsStopModalOpen(false);
      onBack();
    }
  };

  const distKmDisplay = (totalDistanceMeters / 1000).toFixed(2);
  const avgSpeedKmh = movingSeconds > 0
    ? Math.round((totalDistanceMeters / 1000 / (movingSeconds / 3600)) * 10) / 10
    : 0;

  // High contrast mode styling for sunlight readability
  const containerClass = isHighContrastSunMode
    ? 'bg-white text-black min-h-screen p-4 flex flex-col justify-between'
    : 'bg-carbon-950 text-zinc-100 min-h-screen p-4 flex flex-col justify-between';

  return (
    <div className={containerClass}>
      {/* Top Cockpit Header */}
      <div className="flex items-center justify-between pt-safe">
        <button
          onClick={onBack}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono border ${
            isHighContrastSunMode
              ? 'bg-gray-100 border-gray-300 text-black'
              : 'bg-carbon-900 border-carbon-800 text-zinc-300'
          }`}
        >
          &larr; Exit
        </button>

        <div className="flex items-center gap-2">
          {/* Sunlight Mode Toggle */}
          <button
            onClick={() => setIsHighContrastSunMode(!isHighContrastSunMode)}
            className={`p-2 rounded-lg border flex items-center gap-1 text-xs font-mono ${
              isHighContrastSunMode
                ? 'bg-amber-400 border-amber-500 text-black font-bold'
                : 'bg-carbon-900 border-carbon-800 text-amber-400'
            }`}
            title="High-Contrast Sunlight Mode"
          >
            {isHighContrastSunMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span className="text-[10px] uppercase font-mono">Sun</span>
          </button>

          {isLocked && (
            <span className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Awake
            </span>
          )}
        </div>
      </div>

      {/* GPS Limitation Notice */}
      <div
        className={`my-2 p-2 rounded-xl text-[10px] font-mono flex items-center gap-2 border ${
          isHighContrastSunMode
            ? 'bg-yellow-50 text-yellow-900 border-yellow-200'
            : 'bg-amber-950/20 text-amber-300 border-amber-500/30'
        }`}
      >
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>Keep screen on. Mobile browsers throttle GPS when backgrounded or locked.</span>
      </div>

      {gpsError && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
          {gpsError}
        </div>
      )}

      {/* Primary Speed & Telemetry Cockpit Gauges */}
      <div className="flex-1 flex flex-col justify-center items-center my-6">
        <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 block mb-1">
          CURRENT SPEED
        </span>
        <motion.div
          key={currentSpeed}
          initial={{ scale: 0.96 }}
          animate={{ scale: 1 }}
          className="flex items-baseline justify-center"
        >
          <span
            className={`font-mono text-7xl sm:text-8xl font-black tracking-tight tabular-nums ${
              isHighContrastSunMode ? 'text-black' : 'text-zinc-100'
            }`}
          >
            {currentSpeed}
          </span>
          <span className="font-mono text-xl sm:text-2xl font-bold ml-2 text-amber-500">
            KM/H
          </span>
        </motion.div>

        {/* Accuracy badge */}
        {gpsAccuracy !== null && (
          <span className="text-[10px] font-mono text-zinc-400 mt-1">
            GPS Accuracy: ±{Math.round(gpsAccuracy)}m
          </span>
        )}

        {/* Live Distance Display */}
        <div className="mt-8 text-center">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block">
            TRIP DISTANCE
          </span>
          <span
            className={`font-mono text-4xl sm:text-5xl font-extrabold tracking-tight tabular-nums ${
              isHighContrastSunMode ? 'text-black' : 'text-amber-400'
            }`}
          >
            {distKmDisplay} <span className="text-xl font-bold text-zinc-400">km</span>
          </span>
        </div>

        {/* 3 Metrics Strip: Duration, Moving Time, Avg Speed, Max Speed */}
        <div
          className={`grid grid-cols-3 gap-3 w-full max-w-sm mt-8 p-3 rounded-2xl border text-center ${
            isHighContrastSunMode
              ? 'bg-gray-100 border-gray-300'
              : 'bg-carbon-900 border-carbon-800'
          }`}
        >
          <div>
            <span className="text-[9px] font-mono uppercase text-zinc-400 block">Duration</span>
            <span className="font-mono text-base font-bold tabular-nums">
              {formatTime(elapsedSeconds)}
            </span>
          </div>

          <div>
            <span className="text-[9px] font-mono uppercase text-zinc-400 block">Avg Speed</span>
            <span className="font-mono text-base font-bold tabular-nums">
              {avgSpeedKmh} <span className="text-[9px]">km/h</span>
            </span>
          </div>

          <div>
            <span className="text-[9px] font-mono uppercase text-zinc-400 block">Max Speed</span>
            <span className="font-mono text-base font-bold text-amber-500 tabular-nums">
              {maxSpeed} <span className="text-[9px]">km/h</span>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="pb-safe pt-2">
        {rideState === 'idle' && (
          <button
            onClick={startTracking}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 text-carbon-950 font-display font-black text-lg flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 active:scale-[0.98] transition"
          >
            <Play className="w-6 h-6 fill-current" /> START RIDE
          </button>
        )}

        {rideState === 'running' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={pauseTracking}
              className="py-4 rounded-2xl bg-carbon-800 text-zinc-100 font-display font-bold text-base flex items-center justify-center gap-2 border border-carbon-700 active:scale-[0.98] transition"
            >
              <Pause className="w-5 h-5 fill-current" /> PAUSE
            </button>
            <button
              onClick={stopTracking}
              className="py-4 rounded-2xl bg-rose-600 text-white font-display font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 active:scale-[0.98] transition"
            >
              <Square className="w-5 h-5 fill-current" /> STOP
            </button>
          </div>
        )}

        {rideState === 'paused' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={resumeTracking}
              className="py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 text-carbon-950 font-display font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              <Play className="w-5 h-5 fill-current" /> RESUME
            </button>
            <button
              onClick={stopTracking}
              className="py-4 rounded-2xl bg-rose-600 text-white font-display font-bold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition"
            >
              <Square className="w-5 h-5 fill-current" /> FINISH
            </button>
          </div>
        )}
      </div>

      {/* Save Ride Bottom Sheet on Stop */}
      <BottomSheet
        isOpen={isStopModalOpen}
        onClose={() => setIsStopModalOpen(false)}
        title="Ride Summary"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 p-3 bg-carbon-800 rounded-xl text-center font-mono">
            <div>
              <span className="text-[10px] text-zinc-400 block">Distance</span>
              <span className="text-base font-bold text-amber-400">{distKmDisplay} km</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block">Time</span>
              <span className="text-base font-bold text-zinc-100">{formatTime(elapsedSeconds)}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block">Max Speed</span>
              <span className="text-base font-bold text-zinc-100">{maxSpeed} km/h</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Ride Category
            </label>
            <select
              value={rideLabel}
              onChange={(e) => setRideLabel(e.target.value)}
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 font-sans"
            >
              <option value="commute">Daily Commute</option>
              <option value="leisure">Joyride / Leisure</option>
              <option value="errand">Quick Errand</option>
              <option value="touring">Highway / Touring</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Note (Optional)</label>
            <input
              type="text"
              value={rideNote}
              onChange={(e) => setRideNote(e.target.value)}
              placeholder="e.g. Ring road, light traffic"
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-sans"
            />
          </div>

          <div className="space-y-2 pt-1 border-t border-carbon-800 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={syncOdometerImmediately}
                onChange={(e) => setSyncOdometerImmediately(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-carbon-950 border-carbon-700"
              />
              <span className="text-zinc-200">
                Add +{distKmDisplay} km to vehicle odometer automatically
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={saveRouteData}
                onChange={(e) => setSaveRouteData(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-carbon-950 border-carbon-700"
              />
              <span className="text-zinc-200">
                Save route map track (simplified Douglas-Peucker GPS points)
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleDiscardRide}
              className="py-3 rounded-xl bg-carbon-800 text-rose-400 font-medium text-xs border border-carbon-700 hover:bg-carbon-700 transition"
            >
              Discard Ride
            </button>
            <button
              onClick={handleSaveRide}
              disabled={isSaving}
              className="py-3 rounded-xl bg-amber-500 text-carbon-950 font-bold text-sm shadow-lg disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Ride'}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
