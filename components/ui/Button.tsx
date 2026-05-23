'use client'
import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'gold'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => (
    <button ref={ref} className={cn(
      'inline-flex items-center justify-center gap-2 rounded-full font-sans font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
      { primary: 'bg-bark-600 text-cream-100 hover:bg-bark-700 shadow-sm hover:shadow-md', outline: 'border border-bark-600 text-bark-600 bg-transparent hover:bg-bark-600 hover:text-cream-100', ghost: 'text-bark-600 hover:bg-cream-200', gold: 'bg-gold-400 text-bark-700 hover:bg-gold-500 shadow-sm hover:shadow-md' }[variant],
      { sm: 'text-sm px-4 py-2', md: 'text-sm px-6 py-3', lg: 'text-base px-8 py-4' }[size],
      className
    )} {...props}>{children}</button>
  )
)
Button.displayName = 'Button'
