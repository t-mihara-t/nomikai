import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export function Slider({ className, label, ...props }: SliderProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
      <input
        type="range"
        className={cn('w-full accent-primary cursor-pointer', className)}
        {...props}
      />
    </div>
  );
}
