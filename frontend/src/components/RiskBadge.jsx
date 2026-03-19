import React from 'react';
import { cn } from '../lib/utils';

export const RiskBadge = ({ score }) => {
  if (score === null || score === undefined) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
        PENDING
      </span>
    );
  }

  let label, bgColor, textColor, borderColor;

  if (score >= 85) {
    label = 'CRITICAL';
    bgColor = 'bg-red-900/50';
    textColor = 'text-red-300';
    borderColor = 'border-red-700';
  } else if (score > 60) {
    label = 'HIGH';
    bgColor = 'bg-red-900/30';
    textColor = 'text-red-400';
    borderColor = 'border-red-600';
  } else if (score >= 30) {
    label = 'MEDIUM';
    bgColor = 'bg-yellow-900/30';
    textColor = 'text-yellow-400';
    borderColor = 'border-yellow-600';
  } else {
    label = 'LOW';
    bgColor = 'bg-emerald-900/30';
    textColor = 'text-emerald-400';
    borderColor = 'border-emerald-600';
  }

  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border',
        bgColor, textColor, borderColor
      )}
      data-testid={`risk-badge-${label.toLowerCase()}`}
    >
      <span className="font-mono">{score}</span>
      <span>{label}</span>
    </span>
  );
};

export const RiskMeter = ({ score }) => {
  const percentage = Math.min(100, Math.max(0, score || 0));
  
  let color;
  if (percentage >= 85) color = '#ef4444';
  else if (percentage > 60) color = '#f97316';
  else if (percentage >= 30) color = '#eab308';
  else color = '#10b981';

  return (
    <div className="relative w-32 h-32" data-testid="risk-meter">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#27272a"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${percentage * 2.51} 251`}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold font-mono" style={{ color }}>
          {score || 0}
        </span>
        <span className="text-xs text-zinc-500">RISK</span>
      </div>
    </div>
  );
};

export default RiskBadge;
