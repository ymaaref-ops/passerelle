/** Le pont de Passerelle (arche verte, tablier et suspentes blancs), sur fond bleu nuit arrondi. */
export function MarquePasserelle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" aria-hidden="true" className={className}>
      <rect width="1024" height="1024" rx="230" fill="#18205e" />
      <g fill="none" strokeLinecap="round">
        <path d="M250 606H772" stroke="#fff" strokeWidth="56" />
        <path d="M398 505V590M512 465V590M625 505V590" stroke="#fff" strokeWidth="34" />
        <path d="M308 606A204 163 0 0 1 716 606" stroke="#5ee5a0" strokeWidth="56" />
      </g>
    </svg>
  )
}
