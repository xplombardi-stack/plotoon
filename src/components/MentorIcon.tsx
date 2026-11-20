// Ícone do Mentor: robozinho pensativo com uma lâmpada acesa na cabeça (ideia).
// Mesmo jeito dos ícones do lucide (size, strokeWidth, className), pra caber em qualquer lugar.
type Props = { size?: number | string; strokeWidth?: number | string; className?: string; 'aria-hidden'?: boolean }

export function MentorIcon({ size = 24, strokeWidth = 2, className, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={rest['aria-hidden'] ?? true}
    >
      {/* luz da ideia */}
      <path d="M12 0.9v0.9M7.6 2.6l0.7 0.7M16.4 2.6l-0.7 0.7" strokeWidth={Number(strokeWidth) * 0.85} />
      {/* lâmpada */}
      <path d="M12 3.4a2.5 2.5 0 0 0-1.45 4.55v0.75h2.9v-0.75A2.5 2.5 0 0 0 12 3.4z" fill="#fde68a" fillOpacity={0.95} stroke="currentColor" />
      <path d="M11 10.2h2" />
      {/* cabeça */}
      <rect x="4" y="10.9" width="16" height="10.6" rx="3.4" />
      {/* olhos olhando pra cima, pensando */}
      <circle cx="9.1" cy="15" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="14.9" cy="15" r="1.15" fill="currentColor" stroke="none" />
      {/* boquinha de lado */}
      <path d="M10.6 18.4c0.8 0.45 2 0.45 2.8-0.1" />
      {/* orelhas */}
      <path d="M2 14.6v2.6M22 14.6v2.6" />
    </svg>
  )
}
