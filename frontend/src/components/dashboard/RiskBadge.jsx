import React from 'react';
import { cn, getRiskLevel, getRiskColor, getRiskBgColor } from '../../lib/utils';
import { Badge } from '../ui/badge';

export const RiskBadge = ({ score, size = 'default' }) => {
  if (score === null || score === undefined) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Pending
      </Badge>
    );
  }

  const level = getRiskLevel(score);
  const bgColor = getRiskBgColor(score);
  const textColor = getRiskColor(score);

  return (
    <Badge 
      className={cn(
        'border font-mono',
        bgColor,
        textColor,
        size === 'lg' && 'px-3 py-1 text-base'
      )}
    >
      {score}
    </Badge>
  );
};

export const RiskIndicator = ({ score }) => {
  const level = getRiskLevel(score);
  const colors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500'
  };

  return (
    <div className="flex items-center gap-2">
      <div className={cn('w-2 h-2 rounded-full', colors[level])} />
      <span className={cn('text-sm capitalize', getRiskColor(score))}>
        {level} Risk
      </span>
    </div>
  );
};
