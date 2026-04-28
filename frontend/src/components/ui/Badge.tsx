import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'coral'
  children: React.ReactNode
  className?: string
}

export default function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-mono',
        {
          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300': variant === 'default',
          'bg-green-100 text-success dark:bg-green-900/30': variant === 'success',
          'bg-amber-100 text-warning dark:bg-amber-900/30': variant === 'warning',
          'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400': variant === 'danger',
          'bg-coral-light text-coral dark:bg-coral/20': variant === 'coral',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
