import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

// ── Button ────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'secondary' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    boxShadow: '0 0 30px rgba(99,102,241,0.25)',
  },
  ghost: {
    background: 'transparent',
    color: '#cbd5e1',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  danger: {
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.25)',
  },
  secondary: {
    background: 'rgba(255,255,255,0.08)',
    color: '#e2e8f0',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  success: {
    background: 'rgba(34,197,94,0.1)',
    color: '#4ade80',
    border: '1px solid rgba(34,197,94,0.25)',
  },
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-xl',
  md: 'px-5 py-2.5 text-sm rounded-2xl',
  lg: 'px-7 py-3.5 text-base rounded-2xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, className, disabled, style, ...props },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      style={{ ...variantStyles[variant], ...style }}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
        'disabled:opacity-50 disabled:cursor-not-allowed active:scale-95',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  )
);
Button.displayName = 'Button';

// ── Card ──────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  id?: string;
  style?: React.CSSProperties;
}

export function Card({ children, className, hover, onClick, id, style }: CardProps) {
  return (
    <div
      id={id}
      onClick={onClick}
      style={{
        backdropFilter: 'blur(12px)',
        borderRadius: '1rem',
        ...style,
      }}
      className={cn(
        'bg-white/5 border border-white/10 dark:[color-scheme:dark]',
        hover && 'transition-all duration-200 hover:brightness-110 cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────

type BadgeVariant = 'Positive' | 'Neutral' | 'Negative' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const badgeStyles: Record<BadgeVariant, React.CSSProperties> = {
  Positive: { background: 'rgba(34,197,94,0.15)',  color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' },
  Neutral:  { background: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.3)' },
  Negative: { background: 'rgba(239,68,68,0.15)',  color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
  default:  { background: 'rgba(99,102,241,0.15)',  color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' },
};

const dotColors: Record<BadgeVariant, string> = {
  Positive: '#4ade80',
  Neutral:  '#94a3b8',
  Negative: '#f87171',
  default:  '#a5b4fc',
};

export function Badge({ variant = 'default', children, className, dot }: BadgeProps) {
  return (
    <span
      style={badgeStyles[variant]}
      className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', className)}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: dotColors[variant] }}
        />
      )}
      {children}
    </span>
  );
}

// ── Loading Spinner ───────────────────────────────────────────

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const spinnerSizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };

export function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={cn('animate-spin text-indigo-400', spinnerSizes[size])} />
      {label && <p className="text-sm text-slate-400 animate-pulse">{label}</p>}
    </div>
  );
}

// ── Success Animation ─────────────────────────────────────────

interface SuccessAnimationProps {
  show: boolean;
  message?: string;
}

export function SuccessAnimation({ show, message = 'Saved!' }: SuccessAnimationProps) {
  if (!show) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
      <div
        className="flex items-center gap-3 px-5 py-3 rounded-2xl text-white font-medium"
        style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 0 30px rgba(34,197,94,0.4)' }}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {message}
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  valueColor?: string;
  accent?: string;
  className?: string;
}

export function StatCard({ label, value, subValue, icon, valueColor, accent, className }: StatCardProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
          <p className={cn("text-2xl font-bold truncate", !valueColor && "text-white")} style={{ color: valueColor }}>{value}</p>
          {subValue && <p className="text-xs text-slate-500 mt-0.5">{subValue}</p>}
        </div>
        {icon && (
          <div className="flex-shrink-0 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Divider ───────────────────────────────────────────────────

export function Divider({ className }: { className?: string }) {
  return <div className={cn('border-t border-white/10', className)} />;
}

// ── Empty State ───────────────────────────────────────────────

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-2xl text-slate-400 mb-4 bg-white/5">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-200 mb-2">{title}</h3>
      {description && <p className="text-sm text-slate-400 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ── Error Alert ───────────────────────────────────────────────

interface ErrorAlertProps {
  error: string;
  onDismiss?: () => void;
}

export function ErrorAlert({ error, onDismiss }: ErrorAlertProps) {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-2xl text-red-400 animate-slide-down"
      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
    >
      <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p className="text-sm flex-1">{error}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400/70 hover:text-red-400 text-lg leading-none">×</button>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const [shouldRender, setShouldRender] = React.useState(isOpen);
  const [isClosing, setIsClosing] = React.useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      document.body.style.overflow = 'hidden';
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = '';
      }, 200); // match animation duration
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    }
    
    // Cleanup if component unmounts entirely
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, shouldRender]);

  if (!shouldRender) return null;

  return createPortal(
    <div className={cn(
      "fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-200",
      isClosing ? "opacity-0" : "opacity-100"
    )}>
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          !isClosing ? "animate-fade-in" : ""
        )}
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div 
        className={cn(
          "relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-glass bg-[#0a0a0f] border border-white/10 dark:[color-scheme:dark] transition-all duration-200",
          !isClosing ? "animate-scale-in" : "scale-95"
        )}
        style={{
          // Use css classes primarily, inline style only if necessary
        }}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur z-10">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
