import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

class LabErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Lab Module Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center h-full w-full p-8">
                    <div className="card max-w-md text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle size={32} className="text-[var(--error)]" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
                            Module Error
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] mb-4">
                            This lab module encountered an error and cannot be displayed.
                        </p>
                        <div className="p-3 rounded-lg bg-[var(--bg-surface)] mb-4">
                            <code className="text-xs text-[var(--error)] font-mono">
                                {this.state.error?.message || "Unknown error"}
                            </code>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="btn btn-secondary inline-flex items-center gap-2"
                        >
                            <RotateCw size={16} />
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default LabErrorBoundary;
