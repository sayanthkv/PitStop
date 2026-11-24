import { motion } from 'framer-motion';

export function ClusterGauge({
  value = 0,
  max = 100,
  size = 140,
  strokeWidth = 10,
  title,
  unit = '%',
  subtitle,
  color = '#f59e0b',
  isWarning = false,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(max, Math.max(0, value));
  const strokeDashoffset = circumference - (clampedValue / max) * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1e1e24"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Animated Progress Arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isWarning ? '#ef4444' : color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>

      {/* Center gauge text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-2xl font-bold tracking-tight text-zinc-100 tabular-nums">
          {Math.round(value)}
          <span className="text-xs font-normal text-zinc-400 ml-0.5">{unit}</span>
        </span>
        {title && (
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400/90 mt-0.5">
            {title}
          </span>
        )}
        {subtitle && (
          <span className="text-[9px] text-zinc-400 font-sans mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
