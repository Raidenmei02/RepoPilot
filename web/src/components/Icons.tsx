import type { SVGProps } from 'react'

function Svg({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      {children}
    </svg>
  )
}

export function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <rect width="22" height="22" rx="6" fill="#0969da" />
      <path d="M6.5 11.2h3.2M9.7 11.2V14.4M9.7 8.2 13.6 11.2" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconPlus() {
  return (
    <Svg>
      <path d="M8 3.2v9.6M3.2 8h9.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  )
}

export function IconDashboard() {
  return (
    <Svg>
      <rect x="2.2" y="2.2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="8.8" y="2.2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2.2" y="8.8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <rect x="8.8" y="8.8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
    </Svg>
  )
}

export function IconRepo() {
  return (
    <Svg>
      <path d="M3 3.2h6.2l3.6 3.6V13a.8.8 0 0 1-.8.8H3.8A.8.8 0 0 1 3 13V3.2Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 3.2V7h3.8" stroke="currentColor" strokeWidth="1.4" />
    </Svg>
  )
}

export function IconHistory() {
  return (
    <Svg>
      <circle cx="8" cy="8" r="5.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 5.2V8l2 1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  )
}

export function IconExperiment() {
  return (
    <Svg>
      <path d="M6 2.4h4M6.6 2.4v3.2L3.4 12a1.6 1.6 0 0 0 1.4 2.4h6.4A1.6 1.6 0 0 0 12.6 12L9.4 5.6V2.4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </Svg>
  )
}

export function IconSettings() {
  return (
    <Svg>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 2.2v1.4M8 12.4v1.4M2.2 8h1.4M12.4 8h1.4M3.8 3.8l1 1M11.2 11.2l1 1M12.2 3.8l-1 1M4.8 11.2l-1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  )
}
