import React from "react";
import { Settings, Copy, HelpCircle } from "lucide-react";

export default function TopBar({ title, sidebarOpen, setSidebarOpen }) {
    return (
        <header className="topbar">
            <div className="flex items-center gap-4">
                <h1 className="topbar-title">{title || "Math Agent"}</h1>
            </div>
            
            <div className="topbar-actions">
                <button className="icon-button" title="Copy">
                    <Copy size={16} />
                </button>
                <button className="icon-button" title="Help">
                    <HelpCircle size={16} />
                </button>
                <button className="icon-button" title="Settings">
                    <Settings size={16} />
                </button>
            </div>
        </header>
    );
}
