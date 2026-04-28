import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark',
          'bg-white dark:bg-[#1A1A1A] text-[#1A1A1A] dark:text-[#F5F5F5]',
          'placeholder:text-gray-400 dark:placeholder:text-gray-600',
          'focus:outline-none focus:ring-2 focus:ring-coral/50 focus:border-coral',
          'font-mono text-sm transition-colors',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
export default Input
