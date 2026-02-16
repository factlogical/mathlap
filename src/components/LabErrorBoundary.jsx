import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

class LabErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, retryNonce: 0 };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Lab Module Error:", error, errorInfo);
    }

    componentDidUpdate(prevProps) {
        if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
            this.setState({ hasError: false, error: null });
        }
    }

    handleRetry = () => {
        this.setState((prev) => ({
            hasError: false,
            error: null,
            retryNonce: prev.retryNonce + 1
        }));
        if (typeof this.props.onRetry === "function") {
            this.props.onRetry();
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center h-full w-full p-8">
                    <div className="card max-w-md text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle size={32} className="text-[var(--error)]" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
                            {this.props.title || "حدث خطأ داخل المختبر"}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] mb-4">
                            {this.props.message || "حدث خطأ، جرّب التحديث أو أعد المحاولة."}
                        </p>
                        <div className="p-3 rounded-lg bg-[var(--bg-surface)] mb-4">
                            <code className="text-xs text-[var(--error)] font-mono">
                                {this.state.error?.message || "Unknown error"}
                            </code>
                        </div>
                        <button
                            onClick={this.handleRetry}
                            className="btn btn-secondary inline-flex items-center gap-2"
                        >
                            <RotateCw size={16} />
                            {this.props.retryLabel || "إعادة المحاولة"}
                        </button>
                    </div>
                </div>
            );
        }

        return <React.Fragment key={this.state.retryNonce}>{this.props.children}</React.Fragment>;
    }
}

export default LabErrorBoundary;
