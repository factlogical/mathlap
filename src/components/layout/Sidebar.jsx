import React from "react";
import { MessageSquare, FlaskConical, ChevronLeft, LayoutDashboard, Home, Brain, Atom } from "lucide-react";
import { useUISettings } from "../../context/UISettingsContext.jsx";

export default function Sidebar({
  isOpen,
  toggle,
  activeView,
  onNavigate,
  history = [],
  onHistoryClick,
  onClearHistory
}) {
  const { t } = useUISettings();

  return (
    <aside className={`sidebar ${isOpen ? "" : "sidebar--collapsed"}`}>
      <div className="sidebar-header">
        {isOpen ? (
          <>
            <div className="flex items-center gap-2">
              <div className="brand-badge">
                <LayoutDashboard size={18} />
              </div>
              <span className="sidebar-title">{t("وكيل الرياضيات", "Math Agent")}</span>
            </div>
            <button onClick={toggle} className="icon-button" title={t("طي الشريط الجانبي", "Collapse sidebar")}>
              <ChevronLeft size={18} />
            </button>
          </>
        ) : (
          <button onClick={toggle} className="brand-badge" title={t("توسيع الشريط الجانبي", "Expand sidebar")}>
            <LayoutDashboard size={18} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        <NavItem
          icon={<Home size={20} />}
          label={t("الرئيسية", "Home")}
          isActive={activeView === "home"}
          isCollapsed={!isOpen}
          onClick={() => onNavigate("home")}
        />
        <NavItem
          icon={<MessageSquare size={20} />}
          label={t("شات الوكيل", "Chat Agent")}
          isActive={activeView === "chat"}
          isCollapsed={!isOpen}
          onClick={() => onNavigate("chat")}
        />
        <NavItem
          icon={<FlaskConical size={20} />}
          label={t("مختبر الرياضيات", "Math Lab")}
          isActive={activeView === "lab"}
          isCollapsed={!isOpen}
          onClick={() => onNavigate("lab")}
        />
        <NavItem
          icon={<Brain size={20} />}
          label={t("مختبر علوم الحاسوب", "Computer Science Lab")}
          isActive={activeView === "neural"}
          isCollapsed={!isOpen}
          onClick={() => onNavigate("neural")}
        />
        <NavItem
          icon={<Atom size={20} />}
          label={t("\u0645\u062e\u062a\u0628\u0631 \u0627\u0644\u0641\u064a\u0632\u064a\u0627\u0621", "Physics Lab")}
          isActive={activeView === "physics"}
          isCollapsed={!isOpen}
          onClick={() => onNavigate("physics")}
        />
      </nav>

      {isOpen && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">{t("الأخيرة", "Recent")}</div>
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
            <div className="history-empty">{t("لا توجد طلبات حديثة بعد.", "No recent requests yet.")}</div>
          )}
          <div className="history-actions">
            <button className="btn btn-secondary" onClick={onClearHistory} disabled={!history.length}>
              {t("مسح السجل", "Clear history")}
            </button>
          </div>
        </div>
      )}

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
      {!isCollapsed && <span className="text-sm">{label}</span>}
      {isActive && !isCollapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full nav-dot" />}
    </button>
  );
}
