import { Link } from "react-router-dom";
import aboutHeroImage from "../../utils/Golden Valley Sunset Lot.webp";

const capabilities = [
  {
    icon: "property",
    title: "Explore properties",
    copy: "Browse land, homes, apartments and commercial listings in one place.",
  },
  {
    icon: "map",
    title: "Discover by map",
    copy: "Explore available properties geographically and get a feel for their location.",
  },
  {
    icon: "saved",
    title: "Save for later",
    copy: "Keep properties that interest you easy to revisit as you explore.",
  },
  {
    icon: "details",
    title: "Understand the details",
    copy: "Review clear property information to help guide your next step.",
  },
];

const CapabilityIcon = ({ name }) => {
  const commonProps = {
    "aria-hidden": true,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 1.7,
    viewBox: "0 0 24 24",
  };

  if (name === "property") {
    return (
      <svg {...commonProps}>
        <path d="m3.5 10 8.5-7 8.5 7v10.5H3.5z" />
        <path d="M9 20.5v-6h6v6M3.5 10h17" />
      </svg>
    );
  }

  if (name === "map") {
    return (
      <svg {...commonProps}>
        <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
        <path d="M9 3v15m6-12v15" />
        <circle cx="12" cy="10" r="2" />
      </svg>
    );
  }

  if (name === "saved") {
    return (
      <svg {...commonProps}>
        <path d="M6 3.5h12v17l-6-4-6 4z" />
        <path d="M9 8h6" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M4 4.5h16v12H9l-5 4z" />
      <path d="M8 9h8m-8 3.5h5" />
    </svg>
  );
};

export const PublicAboutPage = () => (
  <div className="landzo-static-page landzo-about-page">
    <section className="landzo-static-hero landzo-about-hero">
      <div className="landzo-static-shell landzo-about-hero-grid">
        <div className="landzo-about-hero-copy">
          <p className="landzo-static-eyebrow">ABOUT LANDZO</p>
          <h1>Finding property should feel clear, confident and connected.</h1>
          <p>
            LANDZO is a Sri Lankan property discovery platform built to make exploring land,
            homes, apartments and commercial properties simpler.
          </p>
        </div>
        <figure className="landzo-about-hero-image">
          <img src={aboutHeroImage} alt="Sri Lankan countryside, farmland and a marked plot at sunset" />
          <figcaption>Property discovery across Sri Lanka</figcaption>
        </figure>
      </div>
    </section>

    <section className="landzo-static-section landzo-about-purpose">
      <div className="landzo-static-shell landzo-about-purpose-grid">
        <div>
          <p className="landzo-static-eyebrow">OUR PURPOSE</p>
          <h2>Property discovery,<br />made simpler.</h2>
        </div>
        <div className="landzo-about-purpose-copy">
          <p>
            Finding the right property starts with knowing what is available and where it is.
            LANDZO brings land, homes, apartments and commercial listings together for easier
            discovery.
          </p>
          <p>
            Map-led exploration and clearer property information help connect people looking
            for a place with the listings they want to explore.
          </p>
        </div>
      </div>
    </section>

    <section className="landzo-static-section landzo-static-section-muted landzo-about-capabilities">
      <div className="landzo-static-shell">
        <p className="landzo-static-eyebrow">HOW LANDZO HELPS</p>
        <h2>Built around better<br />property decisions.</h2>
        <div className="landzo-static-card-grid landzo-about-card-grid">
          {capabilities.map((capability) => (
            <article className="landzo-static-card landzo-about-card" key={capability.title}>
              <span className="landzo-about-card-icon">
                <CapabilityIcon name={capability.icon} />
              </span>
              <h3>{capability.title}</h3>
              <p>{capability.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="landzo-static-section landzo-about-statement">
      <div className="landzo-static-shell landzo-about-statement-grid">
        <div>
          <p className="landzo-about-statement-brand">LANDZO</p>
          <h2>Your land.<br />Your future.</h2>
        </div>
        <div className="landzo-about-statement-copy">
          <span aria-hidden="true" />
          <p>
            We help people explore property opportunities with more clarity and confidence,
            bringing useful listings and location context together in one place.
          </p>
        </div>
      </div>
    </section>

    <section className="landzo-static-section landzo-static-cta-section landzo-about-cta">
      <div className="landzo-static-shell landzo-static-cta">
        <div>
          <p className="landzo-static-eyebrow">START EXPLORING</p>
          <h2>Ready to explore your<br />next property?</h2>
          <p className="landzo-about-cta-copy">Browse available properties across LANDZO.</p>
        </div>
        <div className="landzo-static-actions">
          <Link className="landzo-static-button landzo-static-button-primary" to="/properties">
            Explore Properties
          </Link>
          <Link className="landzo-static-button landzo-static-button-secondary" to="/explore">
            Explore Map
          </Link>
        </div>
      </div>
    </section>
  </div>
);
