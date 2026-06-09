// Simplified single-sprig mark for the header lockup and favicon — the full
// seal is illegible at nav size, so per the brand guide we use this one-color
// sprig. Inherits color via currentColor so it can sit on light or dark.
export function LavenderSprig({ className = '', title, style }: { className?: string; title?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 28 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style} role="img" aria-label={title} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <g stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
        <path d="M14 47 V19" />
        <path d="M14 34c-5-2-7.5-6-6.5-10.5" />
        <path d="M14 34c5-2 7.5-6 6.5-10.5" />
      </g>
      <g fill="currentColor">
        <ellipse cx="14" cy="6" rx="2" ry="2.7" />
        <ellipse cx="14" cy="11.2" rx="1.9" ry="2.5" />
        <ellipse cx="10.6" cy="9.4" rx="1.7" ry="2.3" />
        <ellipse cx="17.4" cy="9.4" rx="1.7" ry="2.3" />
        <ellipse cx="11" cy="13.6" rx="1.6" ry="2.2" />
        <ellipse cx="17" cy="13.6" rx="1.6" ry="2.2" />
        <ellipse cx="11.7" cy="17.6" rx="1.4" ry="1.9" />
        <ellipse cx="16.3" cy="17.6" rx="1.4" ry="1.9" />
      </g>
    </svg>
  )
}
