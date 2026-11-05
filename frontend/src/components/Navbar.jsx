import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";

const navLinks = [
  { name: "Destinations", path: "/journeys?destination=Kerala" },
  { name: "Our journeys", path: "/journeys" },
  { name: "Journal", path: "/journal" },
  { name: "Admin dashboard", path: "/admin" },
];

const linkClass = ({ isActive }) =>
  `text-[13px] tracking-wide transition-colors ${
    isActive ? "text-[#a77947]" : "text-[#35483e] hover:text-[#b17c43]"
  }`;

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#e8ebe5] bg-[#fbfcf8]">
      <nav className="mx-auto flex h-[82px] max-w-[1440px] items-center justify-between px-6 md:px-12">
        <Link to="/" className="flex flex-col" aria-label="Company A home">
          <span className="font-serif text-[27px] tracking-wide text-[#164b38]">
            Company A
          </span>
          <span className="text-[8px] uppercase tracking-[4px] text-[#668074]">
            Journeys from Kochi
          </span>
        </Link>

        <div className="hidden items-center gap-7 xl:flex">
          {navLinks.map((item) => (
            <NavLink key={item.name} to={item.path} className={linkClass}>
              {item.name}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-5 lg:flex xl:hidden">
          {navLinks.map((item) => (
            <NavLink key={item.name} to={item.path} className={linkClass}>
              {item.name === "Admin dashboard" ? "Admin" : item.name}
            </NavLink>
          ))}
        </div>

        <Link
          to="/plan-your-journey"
          className="hidden items-center bg-[#174d3b] px-6 py-3 text-[12px] tracking-wide text-white transition-colors hover:bg-[#23634c] lg:inline-flex"
        >
          Plan my holiday
        </Link>

        <button
          type="button"
          className="text-[#174d3b] lg:hidden"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={25} /> : <Menu size={25} />}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="flex flex-col gap-5 border-t border-[#e8ebe5] bg-[#fbfcf8] px-6 py-5 lg:hidden">
          {navLinks.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={linkClass}
            >
              {item.name}
            </NavLink>
          ))}
          <Link
            to="/plan-your-journey"
            onClick={() => setMobileMenuOpen(false)}
            className="bg-[#174d3b] py-3 text-center text-sm text-white"
          >
            Plan my holiday
          </Link>
        </div>
      )}
    </header>
  );
};

export default Navbar;
