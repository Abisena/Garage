import React, { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ Error caught by boundary:', error);
    console.error('Error info:', errorInfo);

    // Check if it's html2canvas error
    if (error.message?.includes('html2canvas') || error.stack?.includes('html2canvas')) {
      console.error('⚠️ html2canvas error detected - this should not happen!');
      console.log('🔄 Attempting to clear cache and reload...');

      // Clear version to force reload
      localStorage.removeItem('app-version');

      // Reload after brief delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }

    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    // Clear cache and reload
    localStorage.removeItem('app-version');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '40px',
              maxWidth: '600px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            <div
              style={{
                background: '#fee2e2',
                border: '2px solid #ef4444',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px'
              }}
            >
              <h2
                style={{
                  color: '#991b1b',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                ⚠️ Application Error
              </h2>
              <p
                style={{
                  color: '#dc2626',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}
              >
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>

            {this.state.error?.stack?.includes('html2canvas') && (
              <div
                style={{
                  background: '#fef3c7',
                  border: '2px solid #f59e0b',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px'
                }}
              >
                <h3
                  style={{
                    color: '#92400e',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    marginBottom: '10px'
                  }}
                >
                  🔍 Detected Issue
                </h3>
                <p
                  style={{
                    color: '#78350f',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    marginBottom: '10px'
                  }}
                >
                  This error is caused by cached html2canvas library. The page will automatically
                  reload to clear the cache.
                </p>
                <p
                  style={{
                    color: '#78350f',
                    fontSize: '14px',
                    lineHeight: '1.6'
                  }}
                >
                  If the error persists, please hard refresh your browser:
                </p>
                <ul
                  style={{
                    color: '#78350f',
                    fontSize: '14px',
                    marginTop: '10px',
                    marginLeft: '20px'
                  }}
                >
                  <li>
                    Windows/Linux: <strong>Ctrl + Shift + R</strong>
                  </li>
                  <li>
                    Mac: <strong>Cmd + Shift + R</strong>
                  </li>
                </ul>
              </div>
            )}

            <div
              style={{
                background: '#f3f4f6',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px'
              }}
            >
              <h4
                style={{
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '10px'
                }}
              >
                Error Details:
              </h4>
              <pre
                style={{
                  color: '#6b7280',
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  background: 'white',
                  padding: '10px',
                  borderRadius: '4px'
                }}
              >
                {this.state.error?.stack || 'No stack trace available'}
              </pre>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end'
              }}
            >
              <button
                onClick={this.handleReload}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                🔄 Clear Cache & Reload
              </button>
            </div>

            <div
              style={{
                marginTop: '20px',
                padding: '15px',
                background: '#eff6ff',
                borderRadius: '8px',
                border: '1px solid #3b82f6'
              }}
            >
              <p
                style={{
                  color: '#1e40af',
                  fontSize: '12px',
                  lineHeight: '1.6'
                }}
              >
                💡 <strong>Tip:</strong> If you continue to see errors, please:
              </p>
              <ol
                style={{
                  color: '#1e40af',
                  fontSize: '12px',
                  marginTop: '10px',
                  marginLeft: '20px'
                }}
              >
                <li>Open browser DevTools (F12)</li>
                <li>Go to Application tab → Clear Storage</li>
                <li>Check "Unregister service workers"</li>
                <li>Click "Clear site data"</li>
                <li>Close and reopen your browser</li>
              </ol>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
