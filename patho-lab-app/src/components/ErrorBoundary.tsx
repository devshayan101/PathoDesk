import React from 'react';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    ErrorBoundaryState
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    background: 'var(--bg-primary, #0a0f1a)',
                    color: 'var(--text-primary, #e2e8f0)',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    padding: '2rem',
                }}>
                    <div style={{
                        background: 'var(--bg-secondary, #111827)',
                        border: '1px solid var(--border-color, #1e293b)',
                        borderRadius: '12px',
                        padding: '2.5rem',
                        maxWidth: '480px',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.25rem', fontWeight: 600 }}>
                            Something went wrong
                        </h2>
                        <p style={{
                            color: 'var(--text-secondary, #94a3b8)',
                            fontSize: '0.875rem',
                            lineHeight: 1.6,
                            margin: '0 0 1.5rem',
                        }}>
                            An unexpected error occurred. Please try again or restart the application.
                        </p>
                        {this.state.error && (
                            <pre style={{
                                background: 'var(--bg-primary, #0a0f1a)',
                                color: '#ef4444',
                                padding: '0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                textAlign: 'left',
                                overflow: 'auto',
                                maxHeight: '120px',
                                marginBottom: '1.5rem',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                            }}>
                                {this.state.error.message}
                            </pre>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleRetry}
                                style={{
                                    background: 'var(--accent, #3b82f6)',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '0.6rem 1.5rem',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                }}
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    background: 'transparent',
                                    color: 'var(--text-secondary, #94a3b8)',
                                    border: '1px solid var(--border-color, #1e293b)',
                                    padding: '0.6rem 1.5rem',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                }}
                            >
                                Reload App
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
