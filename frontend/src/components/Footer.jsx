import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="bg-[#123d30] text-[#f5f3e9]">
    <div className="mx-auto max-w-[1440px] px-6 pb-10 pt-14 md:px-12">
      <div className="grid grid-cols-1 gap-10 border-b border-white/20 pb-12 md:grid-cols-3">
        <div className="md:col-span-2">
          <Link to="/" className="inline-block">
            <h2 className="font-serif text-4xl">Company A</h2>
            <p className="mt-2 text-[9px] uppercase tracking-[5px] text-[#c1cbbf]">
              Journeys from Kochi
            </p>
          </Link>
          <p className="mt-7 max-w-md text-sm leading-7 text-[#cbd5ca]">
            Thoughtfully local. Beautifully yours. Discover Kerala, Tamil Nadu
            and Karnataka through journeys shaped around you.
          </p>
        </div>

        <div>
          <h3 className="mb-6 text-xs uppercase tracking-[2px] text-[#d7ad78]">
            Explore
          </h3>
          <ul className="space-y-4 text-sm text-[#d5ddd4]">
            <li><Link to="/journeys" className="hover:text-white">Our journeys</Link></li>
            <li><Link to="/journal" className="hover:text-white">Travel journal</Link></li>
            <li><Link to="/plan-your-journey" className="hover:text-white">Plan a custom journey</Link></li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-4 pt-7 text-xs text-[#bdc9bd] sm:flex-row">
        <p>© {new Date().getFullYear()} Company A. A little closer to the real South.</p>
        <p>Kerala · Tamil Nadu · Karnataka</p>
      </div>
    </div>
  </footer>
);

export default Footer;
