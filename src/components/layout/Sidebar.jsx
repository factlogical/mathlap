import React from "react";
import { MessageSquare, FlaskConical, ChevronLeft, LayoutDashboard, Home, Brain } from "lucide-react";

export default function Sidebar({
    isOpen,
    toggle,
    activeView,
    onNavigate,
    history = [],
    onHistoryClick,
    onClearHistory
}) {
    return (
        <aside className={`sidebar ${isOpen ? "" : "sidebar--collapsed"}`}>
            {/* Header */}
            <div className="sidebar-header">
                {isOpen ? (
                    <>
                        <div className="flex items-center gap-2">
                            <div className="brand-badge">
                                <LayoutDashboard size={18} />
                            </div>
                            <span className="sidebar-title">Math Agent</span>
                        </div>
                        <button
                            onClick={toggle}
                            className="icon-button"
                            title="Collapse sidebar"
                        >
                            <ChevronLeft size={18} />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={toggle}
                        className="brand-badge"
                        title="Expand sidebar"
                    >
                        <LayoutDashboard size={18} />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <NavItem
                    icon={<Home size={20} />}
                    label="Home"
                    isActive={activeView === 'home'}
                    isCollapsed={!isOpen}
                    onClick={() => onNavigate('home')}
                />
                <NavItem
                    icon={<MessageSquare size={20} />}
                    label="Chat Agent"
                    isActive={activeView === 'chat'}
                    isCollapsed={!isOpen}
                    onClick={() => onNavigate('chat')}
                />
                <NavItem
                    icon={<FlaskConical size={20} />}
                    label="Math Lab"
                    isActive={activeView === 'lab'}
                    isCollapsed={!isOpen}
                    onClick={() => onNavigate('lab')}
                />
                <NavItem
                    icon={<Brain size={20} />}
                    label="Computer Science Lab"
                    isActive={activeView === 'neural'}
                    isCollapsed={!isOpen}
                    onClick={() => onNavigate('neural')}
                />
            </nav>

            {isOpen && (
                <div className="sidebar-section">
                    <div className="sidebar-section-title">Recent</div>
                    {history.length ? (
                        <div className="history-list">
                            {history.slice(0, 8).map((item, index) => (
                                <button
                                    key={`${item}-${index}`}
                                    className="history-item"
                                    onClick={() => onHistoryClick(item)}
                                    title={item}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="history-empty">No recent requests yet.</div>
                    )}
                    <div className="history-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={onClearHistory}
                            disabled={!history.length}
                        >
                            Clear history
                        </button>
                    </div>
                </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />
        </aside>
    );
}

function NavItem({ icon, label, isActive, isCollapsed, onClick }) {
    return (
        <button
            onClick={onClick}
            title={isCollapsed ? label : ""}
            className={`nav-item ${isActive ? "active" : ""} ${isCollapsed ? "justify-center" : ""}`}
        >
            <div>{icon}</div>
            {!isCollapsed && (
                <span className="text-sm">{label}</span>
            )}
            {isActive && !isCollapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full nav-dot" />
            )}
        </button>
    );
}
