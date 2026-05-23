import { cn } from '@/lib/utils'
import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string }

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, id, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label htmlFor={id} className="text-sm font-medium text-bark-600 font-sans">{label}</label>}
    <input ref={ref} id={id} className={cn('w-full px-4 py-3 rounded-xl border bg-cream-50 font-sans text-sm text-bark-600 placeholder:text-bark-400/60 border-cream-300 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all', error && 'border-rose-400', className)} {...props} />
    {error && <p className="text-xs text-rose-400 font-sans">{error}</p>}
  </div>
))
Input.displayName = 'Input'
