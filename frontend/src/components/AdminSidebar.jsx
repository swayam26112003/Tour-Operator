import { NavLink, Link } from "react-router-dom";

const menuGroups = [
  {
    title: "WORKSPACE",
    items: [
      { label: "Overview", path: "/admin", icon: "▦" },
      { label: "Enquiries", path: "/admin/enquiries", icon: "✉" },
      { label: "Quote builder", path: "/admin/quotes", icon: "₹" },
    ],
  },
  {
    title: "CONTENT",
    items: [
      { label: "Package library", path: "/admin/packages", icon: "◇" },
      { label: "Journal articles", path: "/admin/journal/edit", icon: "▤" },
      { label: "Media library", path: "/admin/media", icon: "▧" },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      { label: "Roles & team", path: "/admin/roles", icon: "◎" },
      { label: "Activity log", path: "/admin/activity", icon: "◷" },
    ],
  },
];

const AdminSidebar = () => (
  <aside className="flex min-h-screen w-[250px] shrink-0 flex-col bg-[#123e30] text-white">
    <div className="border-b border-white/10 px-6 py-7">
      <Link to="/admin" className="block">
        <h1 className="font-serif text-3xl tracking-wide">Company A</h1>
        <p className="mt-2 text-[9px] uppercase tracking-[4px] text-[#c3b18a]">Journeys from Kochi</p>
      </Link>
    </div>
    <div className="px-6 py-6">
      <p className="text-[9px] uppercase tracking-[3px] text-[#a9b9ad]">Administration</p>
    </div>
    <nav className="flex-1 space-y-7 px-3 pb-6">
      {menuGroups.map((group) => (
        <div key={group.title}>
          <p className="mb-3 px-3 text-[9px] tracking-[2px] text-[#91a99a]">{group.title}</p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-sm px-4 py-3 text-sm transition ${isActive ? "bg-[#e8eee5] text-[#174b38]" : "text-[#d0dcd2] hover:bg-white/10 hover:text-white"}`
                }
              >
                <span className="w-5 text-center text-base">{item.icon}</span>
                <span>{item.label}</span>
                <span className="ml-auto text-xs opacity-60">→</span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
    <div className="border-t border-white/10 p-5">
      <Link to="/" className="flex items-center gap-3 px-3 py-3 text-xs text-[#d0dcd2] hover:text-white">↗ <span>View public website</span></Link>
    </div>
  </aside>
);

export default AdminSidebar;
