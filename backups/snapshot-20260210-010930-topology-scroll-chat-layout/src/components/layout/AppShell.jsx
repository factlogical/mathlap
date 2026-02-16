import React from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({
    children,
    sidebarOpen,
    setSidebarOpen,
    activeView,
    onNavigate,
    title,
    history,
    onHistoryClick,
    onClearHistory
}) {
    return (
        <div className="app-shell">
            <Sidebar
                isOpen={sidebarOpen}
                toggle={() => setSidebarOpen(!sidebarOpen)}
                activeView={activeView}
                onNavigate={onNavigate}
                history={history}
                onHistoryClick={onHistoryClick}
                onClearHistory={onClearHistory}
            />

            <div className="app-main">
                <TopBar
                    title={title}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                />

                <main className="main-shell">
                    <div className="main-surface">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
