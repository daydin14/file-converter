import { Link } from 'react-router'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Page not found · File Converter')

  return (
    <div className="mx-auto max-w-xl py-12 text-center">
      <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">404</p>
      <h1 className="mt-2 font-display text-4xl">That page is not in the toolbox.</h1>
      <p className="mt-3 text-base-content/75">The converter you want is on the home page.</p>
      <Link to="/" className="btn btn-primary mt-6">
        Back home
      </Link>
    </div>
  )
}
