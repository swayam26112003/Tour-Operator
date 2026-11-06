import { NavLink, Link } from "react-router-dom";

const menuGroups = [
  {
    title: "WORKSPACE",
    items: [
      { label: "Admin overview", path: "/admin", icon: "▦" },
      { label: "Enquiries", path: "/admin/enquiries", icon: "✉" },
      { label: "Quote builder", path: "/admin/quotes", icon: "₹" },
    ],
  },
  {
    title: "TEAM WORKSPACES",
    items: [
      { label: "Editor workspace", path: "/admin/editor", icon: "▤" },
      { label: "Consultant workspace", path: "/admin/consultant", icon: "◎" },
    ],
  },
  {
    title: "CONTENT",
    items: [
      { label: "Package library", path: "/admin/packages", icon: "◇" },
      { label: "Journal articles", path: "/admin/journal/edit", icon: "▧" },
      { label: "Media library", path: "/admin/media", icon: "▩" },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      { label: "Roles & team", path: "/admin/roles", icon: "♙" },
      { label: "Activity log", path: "/admin/activity", icon: "◷" },
    ],
  },
];

const AdminSidebar = ({ onNavigate }) => (
  <aside className="flex h-screen min-h-0 w-[260px] shrink-0 flex-col overflow-hidden bg-[#123e30] text-white">
    <div className="shrink-0 border-b border-white/10 px-6 py-7">
      <Link to="/admin" onClick={onNavigate} className="block">
        <h1 className="font-serif text-3xl tracking-wide">Company A</h1>
        <p className="mt-2 text-[9px] uppercase tracking-[4px] text-[#c3b18a]">
          Journeys from Kochi
        </p>
      </Link>
    </div>

    <div className="shrink-0 px-6 py-6">
      <p className="text-[9px] uppercase tracking-[3px] text-[#a9b9ad]">
        Team workspaces
      </p>
    </div>

    <nav
      aria-label="Admin navigation"
      className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-3 pb-6"
    >
      {menuGroups.map((group) => (
        <div key={group.title}>
          <p className="mb-3 px-3 text-[9px] tracking-[2px] text-[#91a99a]">
            {group.title}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-sm px-4 py-3 text-sm transition-colors ${
                    isActive
                      ? "bg-[#e8eee5] text-[#174b38]"
                      : "text-[#d0dcd2] hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <span className="w-5 shrink-0 text-center text-base">{item.icon}</span>
                <span>{item.label}</span>
                <span className="ml-auto text-xs opacity-60">→</span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>

    <div className="shrink-0 border-t border-white/10 p-5">
      <Link
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-3 px-3 py-3 text-xs text-[#d0dcd2] transition-colors hover:text-white"
      >
        ↗ <span>View public website</span>
      </Link>
    </div>
  </aside>
);

export default AdminSidebar;
