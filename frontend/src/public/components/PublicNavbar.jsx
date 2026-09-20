import {
  useEffect,
  useId,
  useState,
} from "react";



import {
  Link,
  NavLink,
  useLocation,
} from "react-router-dom";
const navigationItems = [
  {
    label: "Home",
    to: "/",
    end: true,
    icon: "home",
  },
  {
    label: "Properties",
    to: "/properties",
    icon: "property",
  },
  {
    label: "Explore Map",
    to: "/explore",
    icon: "location",
  },
  {
    label: "Saved",
    to: "/saved",
    icon: "saved",
  },
  {
    label: "Blog",
    to: "/blogs",
    icon: "blog",
  },
  {
    label: "About",
    to: "/about",
    icon: "about",
  },
  {
    label: "Contact",
    to: "/contact",
    icon: "contact",
  },
];

const NavIcon = ({ type }) => {
  const paths = {
    home:
      "M4 11.5 12 4l8 7.5V20h-5v-5H9v5H4v-8.5Z",

    property:
      "M5 20V9h5V4h9v16M8 12h2M8 16h2M14 8h2M14 12h2M14 16h2",

    location:
      "M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",

    saved:
      "M12 20.5 4.9 13.6A5 5 0 0 1 12 6.7a5 5 0 0 1 7.1 6.9L12 20.5Z",

    blog:
      "M6 3h9l3 3v15H6V3Zm8 0v4h4M9 11h6M9 15h6",

    about:
      "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v6M12 7.5h.01",

    contact:
      "M7.2 4.5 4.8 6.1c-.8.5-1.1 1.5-.7 2.3 2.2 5.1 6.3 9.2 11.4 11.4.9.4 1.8.1 2.3-.7l1.7-2.5-4.4-3-1.8 2.1a12.4 12.4 0 0 1-5-5L10.3 9 7.2 4.5Z",
  };

  return (
    <svg
      aria-hidden="true"
      className="landzo-nav-icon"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path
        d={paths[type]}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.65"
      />
    </svg>
  );
};

const MenuIcon = ({ isOpen }) => (
  <svg
    aria-hidden="true"
    className="public-menu-icon"
    focusable="false"
    viewBox="0 0 24 24"
  >
    {isOpen ? (
      <path
        d="M6 6l12 12M18 6L6 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    ) : (
      <path
        d="M4 7h16M4 12h16M4 17h16"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    )}
  </svg>
);


const HeartIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <path
      d="M12 20.2 5.1 13.6A5 5 0 0 1 12 6.8a5 5 0 0 1 6.9 6.8L12 20.2Z"
      fill="currentColor"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
    />
  </svg>
);

const PhoneIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <path
      d="M7.1 4.4 4.9 5.9c-.9.6-1.2 1.7-.8 2.6 2.1 5 6.2 9.1 11.2 11.2.9.4 2 .1 2.6-.8l1.6-2.3-4.3-3-1.8 2.1a12.2 12.2 0 0 1-5.1-5.1l2.1-1.8-3.3-4.4Z"
      fill="currentColor"
    />
  </svg>
);
export const PublicNavbar = () => {
  const [
    openMenuPathname,
    setOpenMenuPathname,
  ] = useState(null);

 const { pathname } =
  useLocation();
  const isPropertyDetailPage =
  /^\/properties\/[^/]+$/.test(
    pathname,
  );

const isHomePage =
  pathname === "/";

const isPropertiesPage =
  pathname === "/properties";

const isSavedPage =
  pathname === "/saved";

const isBlogsPage =
  pathname === "/blogs" ||
  pathname.startsWith("/blogs/");
const isContactPage =
  pathname === "/contact";
const isExplorePage =
  pathname === "/explore";
const useSimpleMobileNavbar =
  isHomePage ||
  isPropertiesPage ||
  isSavedPage ||
  isBlogsPage ||
  isContactPage ||
  isExplorePage ||
  !isPropertyDetailPage;

  const menuId = useId();

  const isMenuOpen =
    openMenuPathname ===
    pathname;

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }
 

    const handleEscape = (
      event,
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        setOpenMenuPathname(
          null,
        );
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [isMenuOpen]);

     if (isPropertyDetailPage) {
  return null;
}
  return (
    
    <header
  className={[
    "public-header",
    "landzo-public-header",

    isHomePage
      ? "is-home"
      : "",

    isPropertiesPage
      ? "is-properties"
      : "",

    isSavedPage
      ? "is-saved-page"
      : "",

    isBlogsPage
      ? "is-blogs-page"
      : "",

    useSimpleMobileNavbar
      ? "use-simple-mobile-nav"
      : "",
  ]
    .filter(Boolean)
    .join(" ")}
>
      <nav
        aria-label="Primary"
        className="public-nav landzo-public-nav"
      >
        <div className="public-nav-inner landzo-nav-shell">

          {/* BRAND */}

{/* BRAND FIRST */}
<Link
  aria-label="LANDZO home"
  className="public-brand-link landzo-nav-brand"
  to="/"
>
  <div className="landzo-mobile-wordmark">
    <span className="landzo-mobile-wordmark-title">
      LANDZO
    </span>

    <span className="landzo-mobile-wordmark-tagline">
      Your Land. Your Future<span className="landzo-mobile-wordmark-tagline-period">.</span>
    </span>
  </div>
</Link>

{/* MOBILE ACTIONS SECOND */}
<div className="landzo-mobile-actions">
  <NavLink
    aria-label="Saved properties"
    className="landzo-mobile-action"
    to="/saved"
  >
    <HeartIcon />
  </NavLink>

  <NavLink
    aria-label="Contact LANDZO"
    className="landzo-mobile-action"
    to="/contact"
  >
    <PhoneIcon />
  </NavLink>
</div>

          {/* DESKTOP LINKS */}

          <div className="public-nav-links landzo-nav-links">
            {navigationItems.filter(
              (item) => item.label !== "About",
            ).map(
              (item) => (
                <NavLink
                  className={({
                    isActive,
                  }) =>
                    [
                      "public-nav-link",
                      "landzo-nav-link",
                      isActive
                        ? "is-active"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")
                  }
                  end={item.end}
                  key={item.to}
                  to={item.to}
                >
                  <NavIcon
                    type={
                      item.icon
                    }
                  />

                  <span>
                    {item.label}
                  </span>
                </NavLink>
              ),
            )}
          </div>

          {/* CTA */}

          <NavLink
            className="public-nav-cta landzo-nav-cta"
            to="/properties"
          >
        
            <span>
              Explore Properties
            </span>

            <span
              aria-hidden="true"
              className="landzo-nav-cta-arrow"
            >
              {"\u2192"}</span>
          </NavLink>

          {/* MOBILE BUTTON */}
          <button
    aria-controls={menuId}
    aria-expanded={isMenuOpen}
    aria-label={
      isMenuOpen
        ? "Close navigation menu"
        : "Open navigation menu"
    }
    className="public-menu-toggle landzo-menu-toggle"
    onClick={() =>
      setOpenMenuPathname(
        (current) =>
          current === pathname
            ? null
            : pathname,
      )
    }
    type="button"
  >
    <MenuIcon
      isOpen={isMenuOpen}
    />
  </button>

          
        </div>
<div
    className={[
      "public-mobile-menu",
      "landzo-mobile-menu",

      isMenuOpen
        ? "is-open"
        : "",
    ]
      .filter(Boolean)
      .join(" ")}
    hidden={!isMenuOpen}
    id={menuId}
  >
    {navigationItems.map(
      (item) => (
        <NavLink
          className={({
            isActive,
          }) =>
            [
              "public-mobile-link",
              "landzo-mobile-link",

              isActive
                ? "is-active"
                : "",
            ]
              .filter(Boolean)
              .join(" ")
          }
          end={item.end}
          key={item.to}
          onClick={() =>
            setOpenMenuPathname(
              null,
            )
          }
          to={item.to}
        >
          <NavIcon
            type={item.icon}
          />

          <span>
            {item.label}
          </span>
        </NavLink>
      ),
    )}

    <NavLink
      className="public-mobile-cta landzo-mobile-cta"
      onClick={() =>
        setOpenMenuPathname(
          null,
        )
      }
      to="/properties"
    >
      Explore Properties

      <span aria-hidden="true">
        {"\u2192"}</span>
    </NavLink>
  </div>
      </nav>
    </header>
  );
};