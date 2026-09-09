import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'accent';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading = false, disabled, children, ...props }, ref) => {
    const variantStyles: Record<string, string> = {
      default: 'bg-zinc-100 text-zinc-950 hover:bg-white border-transparent shadow-sm',
      secondary: 'bg-zinc-900 text-zinc-200 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700',
      outline: 'bg-transparent text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700',
      ghost: 'bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border-transparent',
      destructive: 'bg-rose-950/80 text-rose-200 hover:bg-rose-900 border-rose-800/60',
      accent: 'bg-blue-600 text-white hover:bg-blue-500 border-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.3)]',
    };

    const sizeStyles: Record<string, string> = {
      default: 'h-9 px-3.5 py-1.5 text-xs',
      sm: 'h-7 px-2.5 py-1 text-xs',
      lg: 'h-10 px-5 py-2 text-sm',
      icon: 'size-8 p-0 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium border select-none cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950',
          'active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-150 ease-out',
          'disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100',
          variantStyles[variant] || variantStyles.default,
          sizeStyles[size] || sizeStyles.default,
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
