import { useState } from "react";

interface SidebarItem {
  id: string;
  title: string;
  time: string;
  pages?: number;
  active?: boolean;
}

export default function Sidebar() {
  const [items] = useState<SidebarItem[]>([
    {
      id: "1",
      title: "Cours de philo sur Kant",
      time: "14:32",
      pages: 12,
      active: true,
    },
    { id: "2", title: "Droit constitutionnel", time: "Hier" },
    { id: "3", title: "Économie keynésienne", time: "Hier" },
  ]);

  return (
    <aside className="sidebar flex-shrink-0">
      {/* Logo */}
      <div className="sidebar-logo flex items-center gap-2">
        <span className="text-xl">🎙️</span>
        <span>Studai</span>
      </div>

      {/* Action */}
      <button className="btn-new-transcription hover:opacity-90 transition-opacity">
        + Nouvelle trans.
      </button>

      {/* History */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <div className="sidebar-section-label">Aujourd'hui</div>
        {items
          .filter((i) => i.time === "14:32")
          .map((item) => (
            <div
              key={item.id}
              className={`sidebar-item ${item.active ? "active" : ""}`}
            >
              <div className="sidebar-item-title">{item.title}</div>
              <div className="sidebar-item-meta">
                {item.time} {item.pages ? `· ${item.pages} pages` : ""}
              </div>
            </div>
          ))}

        <div className="sidebar-section-label mt-4">Hier</div>
        {items
          .filter((i) => i.time === "Hier")
          .map((item) => (
            <div key={item.id} className="sidebar-item">
              <div className="sidebar-item-title">{item.title}</div>
              <div className="sidebar-item-meta">{item.time}</div>
            </div>
          ))}
      </div>

      {/* Footer / Settings */}
      <div className="p-4 border-t border-border-subtle">
        <button className="flex items-center gap-3 text-text-secondary hover:text-text-primary transition-colors text-sm font-medium w-full">
          <span>⚙</span>
          <span>Paramètres</span>
        </button>
      </div>
    </aside>
  );
}
