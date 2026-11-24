import { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { soundFx } from '../../lib/audio.js';
import { useVehicle } from '../../hooks/useVehicle.js';
import {
  Zap,
  RotateCcw,
  Volume2,
  VolumeX,
  Compass,
  Flame,
  ShieldAlert,
  Trophy,
  PhoneCall,
  X,
  Lock,
} from 'lucide-react';

export function CockpitPage({ onExit }) {
  const { vehicle } = useVehicle();

  // Screen Wake Lock
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef(null);

  // Speed & Location
  const [currentSpeed, setCurrentSpeed] = useState(0); // km/h
  const [topSpeed, setTopSpeed] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [coords, setCoords] = useState(null);

  // 0-60 km/h Sprint Timer State
  // 'IDLE' | 'ARMED' | 'LAUNCHED' | 'FINISHED'
  const [sprintState, setSprintState] = useState('ARMED');
  const [sprintTime40, setSprintTime40] = useState(null); // seconds
  const [sprintTime60, setSprintTime60] = useState(null); // seconds
  const [elapsedDisplay, setElapsedDisplay] = useState('0.00');
  const [bestSprint60, setBestSprint60] = useState(() => {
    return parseFloat(localStorage.getItem('pitstop_best_0_60')) || null;
  });

  const sprintStartRef = useRef(null);
  const sprintTimerInterval = useRef(null);

  // Lean Angle (Gyroscope)
  const [leanAngle, setLeanAngle] = useState(0); // degrees (-left, +right)
  const [peakLeftLean, setPeakLeftLean] = useState(0);
  const [peakRightLean, setPeakRightLean] = useState(0);

  // Controls & HUD Modes
  const [isMirrorMode, setIsMirrorMode] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [speedLimit, setSpeedLimit] = useState(60); // km/h
  const [isOverspeeding, setIsOverspeeding] = useState(false);

  // Crash / Impact SOS state
  const [crashDetected, setCrashDetected] = useState(false);
  const [crashCountdown, setCrashCountdown] = useState(30);
  const crashTimerRef = useRef(null);

  // 1. Screen Wake Lock
  useEffect(() => {
    let active = true;
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          const lock = await navigator.wakeLock.request('screen');
          if (active) {
            wakeLockRef.current = lock;
            setWakeLockActive(true);
            lock.addEventListener('release', () => setWakeLockActive(false));
          }
        } catch (err) {
          console.warn('WakeLock not granted', err);
        }
      }
    };
    requestWakeLock();

    return () => {
      active = false;
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  const sendEmergencySos = useCallback(() => {
    const locUrl = coords
      ? `https://maps.google.com/?q=${coords.lat},${coords.lng}`
      : 'Location unavailable';
    const text = encodeURIComponent(
      `🚨 EMERGENCY ALERT from PitStop: Possible scooter incident detected for TVS NTORQ (${vehicle?.registrationNumber || 'KL13AT4263'}). Live Location: ${locUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }, [coords, vehicle]);

  const triggerCrashAlert = useCallback(() => {
    setCrashDetected(true);
    setCrashCountdown(30);
    if (!isSoundMuted) soundFx.playSosSiren();

    crashTimerRef.current = setInterval(() => {
      setCrashCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(crashTimerRef.current);
          sendEmergencySos();
          return 0;
        }
        if (!isSoundMuted) soundFx.playSosSiren();
        return prev - 1;
      });
    }, 1000);
  }, [isSoundMuted, sendEmergencySos]);

  const cancelCrashAlert = () => {
    clearInterval(crashTimerRef.current);
    setCrashDetected(false);
  };

  // Sprint timer speed update handler
  const handleSprintSpeedUpdate = useCallback(
    (speed) => {
      if (sprintState === 'ARMED' && speed > 2) {
        // Launch detected!
        setSprintState('LAUNCHED');
        sprintStartRef.current = Date.now();
        if (!isSoundMuted) soundFx.playBeep(880, 0.2);

        // High frequency timer loop
        sprintTimerInterval.current = setInterval(() => {
          if (sprintStartRef.current) {
            const elapsed = (Date.now() - sprintStartRef.current) / 1000;
            setElapsedDisplay(elapsed.toFixed(2));
          }
        }, 30);
      } else if (sprintState === 'LAUNCHED') {
        const elapsed = (Date.now() - sprintStartRef.current) / 1000;

        // 0-40 split
        if (speed >= 40 && !sprintTime40) {
          setSprintTime40(elapsed.toFixed(2));
        }

        // 0-60 finish
        if (speed >= 60) {
          clearInterval(sprintTimerInterval.current);
          const finalTime = elapsed.toFixed(2);
          setSprintTime60(finalTime);
          setElapsedDisplay(finalTime);
          setSprintState('FINISHED');

          if (!isSoundMuted) soundFx.playSprintFinish();
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

          // Update personal best
          const numFinal = parseFloat(finalTime);
          if (!bestSprint60 || numFinal < bestSprint60) {
            setBestSprint60(numFinal);
            localStorage.setItem('pitstop_best_0_60', String(numFinal));
          }
        }
      }
    },
    [sprintState, sprintTime40, isSoundMuted, bestSprint60]
  );

  const resetSprint = () => {
    clearInterval(sprintTimerInterval.current);
    sprintStartRef.current = null;
    setSprintTime40(null);
    setSprintTime60(null);
    setElapsedDisplay('0.00');
    setSprintState('ARMED');
  };

  // 2. High-Accuracy GPS Speedometer & Sprint Logic
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAccuracy(Math.round(pos.coords.accuracy || 0));

        // Speed in m/s converted to km/h (filter noise < 0.8 m/s)
        const rawSpeed = pos.coords.speed;
        let kmh = 0;
        if (rawSpeed && rawSpeed > 0.8) {
          kmh = Math.round(rawSpeed * 3.6);
        }

        setCurrentSpeed(kmh);
        setTopSpeed((prev) => Math.max(prev, kmh));

        // Overspeed warning check
        if (kmh > speedLimit) {
          setIsOverspeeding(true);
          if (!isSoundMuted) soundFx.playOverspeedWarning();
        } else {
          setIsOverspeeding(false);
        }

        // Sprint State Machine logic
        handleSprintSpeedUpdate(kmh);
      },
      (err) => console.warn('GPS error in Cockpit:', err),
      {
        enableHighAccuracy: true,
        maximumAge: 500,
        timeout: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [speedLimit, isSoundMuted, handleSprintSpeedUpdate]);

  // 3. Gyroscope Lean Angle
  useEffect(() => {
    const handleOrientation = (e) => {
      // Gamma is left/right roll in degrees [-90 to 90]
      let gamma = e.gamma;
      if (gamma !== null && gamma !== undefined) {
        // Clamp and smooth
        const clamped = Math.max(-60, Math.min(60, Math.round(gamma)));
        setLeanAngle(clamped);

        if (clamped < 0) {
          setPeakLeftLean((prev) => Math.max(prev, Math.abs(clamped)));
        } else if (clamped > 0) {
          setPeakRightLean((prev) => Math.max(prev, clamped));
        }
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  // 4. Impact / Crash Fallback Detection
  useEffect(() => {
    const handleMotion = (e) => {
      const acc = e.accelerationIncludingGravity;
      if (acc) {
        const totalG = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);
        // Extreme impact threshold > 28 m/s² while riding
        if (totalG > 28 && currentSpeed > 15 && !crashDetected) {
          triggerCrashAlert();
        }
      }
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleMotion);
    }
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [currentSpeed, crashDetected, triggerCrashAlert]);

  return (
    <div
      className={`min-h-screen bg-black text-white flex flex-col justify-between p-4 select-none ${
        isMirrorMode ? 'scale-x-[-1]' : ''
      }`}
    >
      {/* Top Bar / Status */}
      <div className="flex items-center justify-between z-10">
        <button
          onClick={onExit}
          className="px-3 py-1.5 rounded-xl bg-carbon-900/90 border border-carbon-800 text-xs font-mono font-bold text-zinc-300 hover:text-white flex items-center gap-1.5"
        >
          <X className="w-4 h-4" />
          Exit HUD
        </button>

        <div className="flex items-center gap-2">
          {wakeLockActive && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              Screen ON
            </span>
          )}

          <span className="text-[10px] font-mono text-zinc-500">
            GPS: ±{accuracy}m
          </span>

          {/* Mirror HUD Toggle */}
          <button
            onClick={() => setIsMirrorMode(!isMirrorMode)}
            className={`p-2 rounded-xl border text-xs font-mono transition ${
              isMirrorMode
                ? 'bg-amber-500 text-carbon-950 border-amber-400 font-bold'
                : 'bg-carbon-900 border-carbon-800 text-zinc-400'
            }`}
            title="Mirror for Windshield HUD Reflection"
          >
            HUD Mirror
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setIsSoundMuted(!isSoundMuted)}
            className="p-2 rounded-xl bg-carbon-900 border border-carbon-800 text-zinc-400 hover:text-zinc-200"
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Center Digital Speedometer Display */}
      <div className="my-auto text-center flex flex-col items-center justify-center relative">
        {/* Overspeed Flashing Strobe */}
        {isOverspeeding && (
          <div className="absolute -inset-4 rounded-3xl border-4 border-amber-500 bg-amber-500/10 animate-ping pointer-events-none" />
        )}

        {/* Speed Unit */}
        <span className="font-mono text-xs font-bold tracking-[0.25em] text-amber-400 uppercase mb-1 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 fill-amber-400" />
          GPS Speedometer
        </span>

        {/* Big Speed Number */}
        <div className="flex items-baseline justify-center">
          <span className="font-mono font-black text-8xl md:text-9xl tracking-tight text-white drop-shadow-[0_0_35px_rgba(245,158,11,0.25)]">
            {currentSpeed}
          </span>
          <span className="font-display font-black text-2xl text-amber-500 ml-2">KM/H</span>
        </div>

        {/* Speed Limit & Top Speed */}
        <div className="flex items-center gap-4 mt-2 text-xs font-mono">
          <span className="text-zinc-500">
            TOP: <strong className="text-zinc-200">{topSpeed} km/h</strong>
          </span>
          <span className="text-zinc-700">|</span>
          <button
            onClick={() =>
              setSpeedLimit((prev) => (prev === 60 ? 80 : prev === 80 ? 100 : 60))
            }
            className="text-amber-400 underline decoration-dashed"
          >
            LIMIT: {speedLimit} KM/H
          </button>
        </div>
      </div>

      {/* Cockpit Mid Section: 0-60 Sprint Timer & Lean Angle */}
      <div className="grid grid-cols-2 gap-3 mb-2 z-10">
        {/* 0-60 km/h Sprint Timer Card */}
        <div className="bg-carbon-900/90 border border-carbon-800 rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider text-amber-400 uppercase flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              0–60 Sprint
            </span>
            <button
              onClick={resetSprint}
              className="p-1 rounded-lg bg-carbon-800 text-zinc-400 hover:text-white"
              title="Reset Timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="my-2 text-center">
            <div className="font-mono font-black text-3xl text-white tracking-wider">
              {elapsedDisplay}s
            </div>
            <span
              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase inline-block mt-0.5 ${
                sprintState === 'ARMED'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : sprintState === 'LAUNCHED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              }`}
            >
              {sprintState === 'ARMED'
                ? 'Ready: Launch when ready'
                : sprintState === 'LAUNCHED'
                ? 'Sprint in progress...'
                : `Finished (0-40: ${sprintTime40 || '--'}s | 0-60: ${sprintTime60 || '--'}s)`}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 border-t border-carbon-800 pt-1.5">
            <span className="flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              PB:
            </span>
            <strong className="text-zinc-200">
              {bestSprint60 ? `${bestSprint60}s` : '--'}
            </strong>
          </div>
        </div>

        {/* Gyroscope Lean Angle Dial Card */}
        <div className="bg-carbon-900/90 border border-carbon-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-1">
              <Compass className="w-3.5 h-3.5" />
              Lean Angle
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              {leanAngle > 0 ? `${leanAngle}° R` : leanAngle < 0 ? `${Math.abs(leanAngle)}° L` : '0°'}
            </span>
          </div>

          {/* Visual Lean Bar */}
          <div className="my-2">
            <div className="h-3 bg-carbon-950 rounded-full relative overflow-hidden flex items-center justify-center border border-carbon-800">
              <div className="absolute w-0.5 h-full bg-zinc-600" />
              <div
                className={`h-full transition-all duration-75 ${
                  leanAngle < 0
                    ? 'bg-gradient-to-l from-cyan-400 to-indigo-500 self-end mr-auto'
                    : 'bg-gradient-to-r from-cyan-400 to-indigo-500 self-start ml-auto'
                }`}
                style={{
                  width: `${Math.min(50, (Math.abs(leanAngle) / 50) * 50)}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[8px] font-mono text-zinc-500 mt-1">
              <span>L 45°</span>
              <span>0°</span>
              <span>45° R</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 border-t border-carbon-800 pt-1.5">
            <span>PEAK:</span>
            <strong className="text-zinc-200">
              L {peakLeftLean}° / R {peakRightLean}°
            </strong>
          </div>
        </div>
      </div>

      {/* Emergency Crash SOS Modal */}
      {crashDetected && (
        <div className="fixed inset-0 z-50 bg-rose-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-20 h-20 rounded-full bg-rose-600 border-4 border-rose-400 flex items-center justify-center animate-bounce mb-4 shadow-2xl shadow-rose-600/50">
            <ShieldAlert className="w-10 h-10 text-white" />
          </div>

          <h2 className="font-display font-black text-2xl text-white uppercase tracking-wider mb-1">
            Possible Incident Detected!
          </h2>
          <p className="text-xs text-rose-200 font-sans max-w-xs mb-6">
            A sudden severe impact or fall was sensed. Sending emergency location alert in:
          </p>

          <div className="font-mono font-black text-6xl text-rose-300 mb-6 animate-pulse">
            {crashCountdown}s
          </div>

          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={cancelCrashAlert}
              className="w-full py-4 rounded-2xl bg-white text-carbon-950 font-display font-bold text-base uppercase tracking-wider shadow-2xl active:scale-95 transition"
            >
              I AM OK (Cancel SOS)
            </button>

            <button
              onClick={sendEmergencySos}
              className="w-full py-3 rounded-2xl bg-rose-800 border border-rose-600 text-rose-100 font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-4 h-4" />
              Send SOS WhatsApp Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
