'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled,
}: ToggleSwitchProps) {
  return (
    <label className={cn('flex items-center gap-3 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed')}>
      <span className="text-sm font-medium text-secondary/80">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30',
          checked ? 'bg-primary' : 'bg-secondary/20',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </label>
  );
}
