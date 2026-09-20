import {
  NavLink,
} from "react-router-dom";


const navItems = [
  {
    label: "HOME",
    to: "/",
    end: true,
    icon: "home",
  },
  {
    label: "PROPERTIES",
    to: "/properties",
    icon: "properties",
  },
  {
    label: "EXPLORE",
    topLabel: "MAP",
    to: "/explore",
    icon: "explore",
    center: true,
  },
  {
    label: "BLOG",
    to: "/blogs",
    icon: "blog",
  },
  {
    label: "ENQUIRE",
    to: "/contact",
    icon: "enquire",
  },
];


const BottomNavIcon = ({
  type,
}) => {
  if (type === "home") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
      >
        <path
          d="M4 11.5 12 4l8 7.5V20h-5v-5H9v5H4v-8.5Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    );
  }


  if (type === "properties") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
      >
        <path
          d="M4 18.5 7 7l7-2 6 11.5-8 2.5-8-.5Z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />

        <path
          d="M7.3 7.5 12 11l2-5.4M12 11v7.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />

        <circle
          cx="14.5"
          cy="8"
          r="1.5"
          fill="currentColor"
        />
      </svg>
    );
  }


  if (type === "explore") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
      >
        <path
          d="M4 10 9 7.5l6 2.5 5-2.5V18l-5 2-6-2.5L4 20V10Z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />

        <path
          d="M12 3.5a4 4 0 0 1 4 4c0 3.4-4 7-4 7s-4-3.6-4-7a4 4 0 0 1 4-4Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />

        <circle
          cx="12"
          cy="7.5"
          r="1.3"
          fill="currentColor"
        />
      </svg>
    );
  }


  if (type === "blog") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
      >
        <path
          d="M6 3h9l3 3v15H6V3Zm8 0v4h4"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />

        <path
          d="M9 11h6M9 15h6"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.6"
        />
      </svg>
    );
  }


  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
    >
      <path
        d="M4 5.5h16v11H9l-4.5 3v-3H4v-11Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />

      <circle cx="9" cy="11" r=".8" fill="currentColor" />
      <circle cx="12" cy="11" r=".8" fill="currentColor" />
      <circle cx="15" cy="11" r=".8" fill="currentColor" />
    </svg>
  );
};


export const PublicBottomNavbar = () => {
  return (
    <nav
      aria-label="Mobile navigation"
      className="landzo-bottom-nav"
    >
      {/* Decorative WebP only */}
      <img
        alt=""
        aria-hidden="true"
        className="landzo-bottom-nav-bg"
        src="/Landzo/landzo-bottom-nav.webp"
      />


      <div className="landzo-bottom-nav-links">
        {navItems.map(
          (item) => (
        <NavLink
  className={({ isActive }) =>
    [
      "landzo-bottom-nav-link",

      item.center
        ? "is-center"
        : "",

      item.icon === "blog"
        ? "is-blog"
        : "",

      item.icon === "enquire"
        ? "is-enquire"
        : "",

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
              <span className="landzo-bottom-nav-icon">
                <BottomNavIcon
                  type={item.icon}
                />
              </span>

              {item.center ? (
                <span className="landzo-bottom-center-label">
                  <strong>
                    {item.topLabel}
                  </strong>

                  <small>
                    {item.label}
                  </small>
                </span>
              ) : (
                <span className="landzo-bottom-nav-label">
                  {item.label}
                </span>
              )}
            </NavLink>
          ),
        )}
      </div>
    </nav>
  );
};