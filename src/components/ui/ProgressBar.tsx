'use client';

import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  animated?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  showPercentage = false,
  size = 'md',
  variant = 'default',
  animated = false,
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const variantStyles = {
    default: 'bg-black',
    success: 'bg-green-600',
    warning: 'bg-yellow-500',
    error: 'bg-red-600',
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeStyles[size]}`}>
        <div
          className={`${sizeStyles[size]} ${variantStyles[variant]} rounded-full transition-all duration-300 ${
            animated ? 'animate-pulse' : ''
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && (
        <div className="flex justify-end mt-1">
          <span className="text-sm text-gray-600 font-medium">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
}
