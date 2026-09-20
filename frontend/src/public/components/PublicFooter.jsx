import { Link } from "react-router-dom";

const footerSections = [
  {
    title: "Explore",
    links: [
      { label: "Home", to: "/" },
      { label: "Properties", to: "/properties" },
      { label: "Explore Map", to: "/explore" },
      { label: "Saved Properties", to: "/saved" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Blog", to: "/blogs" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms & Conditions", to: "/terms" },
    ],
  },
];

const ArrowIcon = () => (
  <svg
    aria-hidden="true"
    className="landzo-footer-link-arrow"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <path
      d="M9 6l6 6-6 6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const LocationIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="landzo-footer-location-icon"
  >
    <path
      d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    />

    <circle
      cx="12"
      cy="10"
      r="2.3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    />
  </svg>
);

export const PublicFooter = () => {
  const currentYear =
    new Date().getFullYear();

  return (
    <footer className="public-footer landzo-public-footer">
      <div className="public-container landzo-footer-inner">

        {/* PREMIUM BRAND CARD */}
        <section className="landzo-footer-hero-card">

          <div className="landzo-footer-brand-copy">
            <Link
              aria-label="LANDZO home"
              className="landzo-footer-logo-link"
              to="/"
            >
              <img
                alt="LANDZO"
                className="landzo-footer-logo"
                src="/logo.webp"
              />
            </Link>

            <p className="landzo-footer-description">
              Discover your next property
              with confidence.
            </p>

            <div className="landzo-footer-location">
              <LocationIcon />

              <span>
                Property discovery across Sri Lanka
              </span>
            </div>
          </div>

          <img
            alt=""
            aria-hidden="true"
            className="landzo-footer-land-art"
            src="/footer%20land.webp"
          />

        </section>


        {/* LINKS */}
        <div className="landzo-footer-navigation">
          {footerSections.map(
            (section) => (
              <section
                className="landzo-footer-section"
                key={section.title}
              >
                <h2>
                  {section.title}
                </h2>

                <div className="landzo-footer-links">
                  {section.links.map(
                    (link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                      >
                        <span>
                          {link.label}
                        </span>

                        <ArrowIcon />
                      </Link>
                    ),
                  )}
                </div>
              </section>
            ),
          )}
        </div>


        {/* COPYRIGHT */}
        <div className="landzo-footer-bottom">
          <p>
            &copy; {currentYear} LANDZO
          </p>

          <p className="landzo-footer-credit">
            Designed &amp; Developed by{" "}
            <a
              href="https://hiiiive.lk"
              rel="noreferrer"
              target="_blank"
            >
              Hiiiive
            </a>
          </p>
        </div>

      </div>
    </footer>
  );
};