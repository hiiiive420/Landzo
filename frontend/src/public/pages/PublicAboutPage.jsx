import { Link } from "react-router-dom";

const principles = [
  { title: "Clear Discovery", copy: "Property information presented in an easier-to-browse format." },
  { title: "Location First", copy: "Map-based exploration helps you understand where properties are located." },
  { title: "Direct Enquiries", copy: "Move from discovery to enquiry without unnecessary friction." },
];

const propertyTypes = ["Land", "House", "Apartment", "Commercial"];

export const PublicAboutPage = () => (
  <div className="landzo-static-page landzo-about-page">
    <section className="landzo-static-hero">
      <div className="landzo-static-shell landzo-about-hero-grid">
        <div>
          <p className="landzo-static-eyebrow">ABOUT LANDZO</p>
          <h1>Finding property should feel clear, confident and connected.</h1>
          <p>
            LANDZO is a Sri Lankan property discovery platform built to make exploring land,
            homes, apartments and commercial properties simpler.
          </p>
        </div>
        <div aria-hidden="true" className="landzo-about-map-motif">
          <span className="landzo-about-map-ring landzo-about-map-ring-one" />
          <span className="landzo-about-map-ring landzo-about-map-ring-two" />
          <span className="landzo-about-map-parcel" />
          <span className="landzo-about-map-pin" />
        </div>
      </div>
    </section>

    <section className="landzo-static-section">
      <div className="landzo-static-shell landzo-static-reading">
        <p className="landzo-static-eyebrow">OUR PURPOSE</p>
        <h2>Built around better property discovery</h2>
        <p>
          LANDZO brings browsing, location context, saved properties and enquiries into one
          clear path. Explore what is available, understand the area, save what matters and
          take the next step when you are ready.
        </p>
      </div>
    </section>

    <section className="landzo-static-section landzo-static-section-muted">
      <div className="landzo-static-shell">
        <p className="landzo-static-eyebrow">HOW WE WORK</p>
        <h2>Made for the way people explore property</h2>
        <div className="landzo-static-card-grid">
          {principles.map((principle) => (
            <article className="landzo-static-card" key={principle.title}>
              <h3>{principle.title}</h3>
              <p>{principle.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="landzo-static-section">
      <div className="landzo-static-shell">
        <p className="landzo-static-eyebrow">PROPERTY TYPES</p>
        <h2>Explore the places that fit your next chapter</h2>
        <div className="landzo-property-type-grid">
          {propertyTypes.map((type) => <span key={type}>{type}</span>)}
        </div>
      </div>
    </section>

    <section className="landzo-static-section landzo-static-cta-section">
      <div className="landzo-static-shell landzo-static-cta">
        <div>
          <p className="landzo-static-eyebrow">START EXPLORING</p>
          <h2>Ready to find your next place?</h2>
        </div>
        <div className="landzo-static-actions">
          <Link className="landzo-static-button landzo-static-button-primary" to="/properties">Explore Properties</Link>
          <Link className="landzo-static-button landzo-static-button-secondary" to="/explore">Explore Map</Link>
        </div>
      </div>
    </section>
  </div>
);