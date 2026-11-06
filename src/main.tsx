import { StrictMode, Component } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error
      return (
        <div style={{ fontFamily: 'monospace', padding: '2rem', color: '#b91c1c' }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
            BIOTRACE — startup error
          </h1>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#fef2f2', padding: '1rem', borderRadius: '0.5rem' }}>
            {err.message}
            {'\n\n'}
            {err.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
