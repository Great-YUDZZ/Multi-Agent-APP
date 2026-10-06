import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#1e1e1e] text-[#cccccc] font-sans p-6 select-none">
          <div className="bg-[#252526] border border-[#f87171]/40 rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2d1b1b] flex items-center justify-center text-[#f87171] shrink-0 border border-[#f87171]/30">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Terjadi Kesalahan Sistem
                </h2>
                <p className="text-xs text-[#858585]">
                  Komponen antarmuka mengalami kendala tak terduga.
                </p>
              </div>
            </div>

            <div className="bg-[#1e1e1e] border border-[#333333] rounded p-3 text-xs font-mono text-[#f87171] leading-relaxed break-words max-h-36 overflow-y-auto">
              {this.state.error?.message || 'Unknown runtime error occurred.'}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#333333]">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] text-[#cccccc] hover:text-white rounded text-xs transition-colors cursor-pointer border border-[#3c3c3c]"
              >
                <RefreshCw size={12} />
                <span>Muat Ulang Sesi</span>
              </button>
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] active:bg-[#094771] text-white rounded text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              >
                <RotateCcw size={12} />
                <span>Coba Lagi</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
