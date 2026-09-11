import {lazy,Suspense} from 'react'
import {SessionGate} from './components/SessionGate'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from './components/ui/sonner'
import Landing from './pages/Landing'
const Home=lazy(()=>import('./pages/Home'))
const CreateCard=lazy(()=>import('./pages/CreateCard'))
const Room=lazy(()=>import('./pages/Room'))
const Matches=lazy(()=>import('./pages/Matches'))

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<div role="status" className="min-h-screen bg-background text-foreground grid place-items-center">Preparing your room…</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/enter" element={<SessionGate><Home /></SessionGate>} />
          <Route path="/join/:code" element={<SessionGate><Home /></SessionGate>} />
          <Route path="/create/:eventId" element={<SessionGate><CreateCard /></SessionGate>} />
          <Route path="/room/:eventId" element={<SessionGate><Room /></SessionGate>} />
          <Route path="/room/:eventId/edit" element={<SessionGate><CreateCard /></SessionGate>} />
          <Route path="/matches/:eventId" element={<SessionGate><Matches /></SessionGate>} />
        </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="bottom-center" />
    </ErrorBoundary>
  )
}
