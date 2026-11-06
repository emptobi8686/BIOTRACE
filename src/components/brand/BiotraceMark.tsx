/**
 * BIOTRACE brand marks
 *
 * BitraceLogoMark  — diamond/hexagon outline with inner B letter.
 *                    Used in public nav, footer, auth screens.
 *                    Matches the reference design screenshot.
 *
 * BiotraceMark     — geometric B with supply-chain nodes.
 *                    Used in the application sidebar, favicon.
 */

/**
 * Diamond outline logo mark — as seen in the reference homepage design.
 * A thin rotated-square (diamond) outline with the letter B centred inside.
 * Uses `currentColor` so it adapts to any background.
 */
export function BitraceLogoMark({
  className = 'size-8',
}: {
  className?: string
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Diamond outline — rotated square */}
      <path
        d="M20 3 L37 20 L20 37 L3 20 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        fill="none"
      />
      {/* B letter — spine */}
      <line x1="14" y1="13" x2="14" y2="27" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* B top bowl */}
      <path
        d="M14 13 L20 13 Q25 13 25 17.5 Q25 22 20 22 L14 22"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* B bottom bowl — slightly wider per classic B proportions */}
      <path
        d="M14 22 L21 22 Q26.5 22 26.5 24.5 Q26.5 27 21 27 L14 27"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

/**
 * Application sidebar B mark — geometric B with supply-chain accent nodes.
 * Used in sidebar header, favicon, auth panels.
 */
export function BiotraceMark({
  className = 'size-8',
}: {
  className?: string
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line x1="7" y1="4.5" x2="7" y2="27.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M7 4.5 Q7 4.5 17 4.5 Q25 4.5 25 10.5 Q25 16.5 17 16.5 L7 16.5"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      <path
        d="M7 16.5 Q7 16.5 17 16.5 Q26.5 16.5 26.5 22.25 Q26.5 28 17 28 L7 27.5"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      <circle cx="25" cy="10.5" r="2.25" fill="currentColor" />
      <circle cx="26.5" cy="22.25" r="2.25" fill="currentColor" />
    </svg>
  )
}

/** Full wordmark for auth screens */
export function BitraceWordmark({
  className,
  markClassName = 'size-9',
}: {
  className?: string
  markClassName?: string
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <BiotraceMark className={markClassName} />
      <span className="text-xl font-semibold tracking-[0.06em]">BIOTRACE</span>
    </span>
  )
}
