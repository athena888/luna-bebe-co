import { cn } from '@/lib/utils'

interface BadgeProps { children: React.ReactNode; variant?: 'sage' | 'rose' | 'gold' | 'bark'; className?: string }

export function Badge({ children, variant = 'sage', className }: BadgeProps) {
  return (
    <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium font-sans',
      { sage: 'bg-sage-100 text-sage-500', rose: 'bg-rose-100 text-rose-400', gold: 'bg-gold-100 text-gold-500', bark: 'bg-bark-100 text-bark-600' }[variant], className)}>
      {children}
    </span>
  )
}
