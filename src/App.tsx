import { lazy, Suspense, type ReactNode } from 'react'
import { Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'

const ImagePage = lazy(() => import('./pages/ImagePage').then((module) => ({ default: module.ImagePage })))
const PdfPage = lazy(() => import('./pages/PdfPage').then((module) => ({ default: module.PdfPage })))
const DataPage = lazy(() => import('./pages/DataPage').then((module) => ({ default: module.DataPage })))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route
          path="images"
          element={
            <ToolFallback>
              <ImagePage />
            </ToolFallback>
          }
        />
        <Route
          path="pdf"
          element={
            <ToolFallback>
              <PdfPage />
            </ToolFallback>
          }
        />
        <Route
          path="data"
          element={
            <ToolFallback>
              <DataPage />
            </ToolFallback>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

function ToolFallback({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center gap-3 py-24" role="status">
          <span className="loading loading-spinner loading-lg text-primary" />
          <p>Loading tool…</p>
        </div>
      }
    >
      {children}
    </Suspense>
  )
}
