import { Link } from "react-router-dom";
import aboutHeroImage from "../../utils/Golden Valley Sunset Lot.webp";

const capabilities = [
  {
    icon: "property",
    title: "Explore Properties",
    copy: "Browse land, houses, apartments and commercial property listings in one place and discover opportunities that match what you are looking for.",
  },
  {
    icon: "map",
    title: "Discover by Map",
    copy: "Explore available properties geographically and better understand their location, surroundings and wider area.",
  },
  {
    icon: "saved",
    title: "Save for Later",
    copy: "Save properties that interest you so they remain easy to revisit, compare and consider as your search develops.",
  },
  {
    icon: "details",
    title: "Understand the Details",
    copy: "Review clear property information, location context and listing details to help guide your next step with greater confidence.",
  },
];

const coreValues = [
  {
    icon: "details",
    title: "Trust & Transparency",
    copy: "We believe better property decisions begin with clear information and honest communication. LANDZO works to create reliable connections between buyers, sellers, property owners and investors.",
  },
  {
    icon: "map",
    title: "Innovation",
    copy: "We use technology, map-based property discovery and modern digital experiences to make searching for real estate simpler, faster and more useful.",
  },
  {
    icon: "saved",
    title: "Customer Commitment",
    copy: "The needs of property buyers, sellers and investors remain at the centre of the LANDZO experience. Every feature should make the property journey easier to understand and navigate.",
  },
  {
    icon: "property",
    title: "Growth & Opportunity",
    copy: "Property can represent a home, a business, an investment or a long-term opportunity. We help people discover meaningful real estate opportunities and make informed decisions for their future.",
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
            LANDZO is a Sri Lankan property discovery platform designed to make finding land,
            houses, apartments and commercial properties simpler. We bring property listings,
            location context and modern digital tools together to help buyers, sellers and
            investors explore real estate opportunities across Sri Lanka with greater clarity.
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
            Finding the right property starts with understanding what is available, where it is
            located and whether it suits your needs.
          </p>
          <p>
            LANDZO brings land, houses, apartments and commercial property listings together in
            one place, making property discovery across Sri Lanka easier and more accessible.
          </p>
          <p>
            With map-led exploration, useful property information and a simple digital
            experience, we help connect people searching for property with opportunities worth
            exploring.
          </p>
        </div>
      </div>
    </section>

    <section className="landzo-static-section landzo-static-section-muted landzo-about-mission-vision">
      <div className="landzo-static-shell">
        <p className="landzo-static-eyebrow">OUR MISSION + OUR VISION</p>
        <div className="landzo-static-card-grid landzo-about-mission-grid">
          <article className="landzo-static-card landzo-about-card landzo-about-mission-card">
            <span className="landzo-about-card-icon">
              <CapabilityIcon name="property" />
            </span>
            <p className="landzo-static-eyebrow">OUR MISSION</p>
            <h2>Making every property journey simpler.</h2>
            <p>
              To simplify the property journey by connecting people with the right real estate
              opportunities through a transparent, reliable and technology-driven platform.
            </p>
            <p>
              LANDZO aims to empower property buyers, sellers and investors with accessible
              information, trusted connections and a seamless way to discover and explore real
              estate opportunities across Sri Lanka.
            </p>
          </article>
          <article className="landzo-static-card landzo-about-card landzo-about-mission-card">
            <span className="landzo-about-card-icon">
              <CapabilityIcon name="map" />
            </span>
            <p className="landzo-static-eyebrow">OUR VISION</p>
            <h2>A more connected property market.</h2>
            <p>
              To become one of Sri Lanka’s most trusted and innovative real estate platforms,
              transforming how people discover, experience and invest in property.
            </p>
            <p>
              We envision a more transparent, accessible and connected real estate market where
              technology helps people make better-informed property decisions.
            </p>
          </article>
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

    <section className="landzo-static-section landzo-about-values">
      <div className="landzo-static-shell">
        <p className="landzo-static-eyebrow">OUR CORE VALUES</p>
        <h2 className="landzo-about-values-heading">The principles<br />behind LANDZO.</h2>
        <div className="landzo-static-card-grid landzo-about-values-grid">
          {coreValues.map((value) => (
            <article className="landzo-static-card landzo-about-card" key={value.title}>
              <span className="landzo-about-card-icon">
                <CapabilityIcon name={value.icon} />
              </span>
              <h3>{value.title}</h3>
              <p>{value.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="landzo-static-section landzo-about-statement">
      <div className="landzo-static-shell landzo-about-statement-grid">
        <div>
          <p className="landzo-static-eyebrow">LANDZO</p>
          <h2>Your land.<br />Your future.</h2>
        </div>
        <div className="landzo-about-statement-copy">
          <span aria-hidden="true" />
          <div>
            <p>
              LANDZO helps people explore property opportunities across Sri Lanka with greater
              clarity and confidence.
            </p>
            <p>
              By bringing useful property listings, map-based discovery and location context
              together in one platform, we are building a simpler way for buyers, sellers and
              investors to connect with the real estate opportunities that matter to them.
            </p>
          </div>
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
