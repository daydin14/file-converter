import { FiShield } from 'react-icons/fi'

export function PrivacyNote({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`flex gap-2 text-sm leading-6 text-base-content/80 ${compact ? '' : 'rounded-box border border-base-300 bg-base-100/80 px-4 py-3'}`}>
      <FiShield aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>Files never leave your device. Conversion runs in this browser, and nothing is uploaded.</span>
    </p>
  )
}
