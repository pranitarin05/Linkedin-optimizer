import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, color: '#ff4444', fontFamily: 'sans-serif' }}>
          <h3>Something went wrong</h3>
          <p style={{ fontSize: 13, color: '#999' }}>{this.state.error.message}</p>
          <button
            onClick={() => { this.setState({ error: null }); location.reload() }}
            style={{ marginTop: 8, padding: '6px 12px', cursor: 'pointer' }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
