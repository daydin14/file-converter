import { FiAlertTriangle } from 'react-icons/fi'

export function Notice({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="alert alert-warning items-start">
      <FiAlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
