import { Link } from "react-router-dom";

export const PublicNotFoundPage = () => (
  <section className="landzo-static-page landzo-not-found-page">
    <div className="landzo-static-shell landzo-not-found-shell">
      <div className="landzo-not-found-copy">
        <p className="landzo-static-eyebrow">LANDZO</p>
        <p className="landzo-not-found-code">404</p>
        <h1>This plot isn't on the map.</h1>
        <p>
          The page you&apos;re looking for may have moved, changed, or no longer exists.
        </p>
        <div className="landzo-static-actions">
          <Link className="landzo-static-button landzo-static-button-primary" to="/properties">
            Explore Properties
          </Link>
          <Link className="landzo-static-button landzo-static-button-secondary" to="/">
            Back Home
          </Link>
        </div>
        <Link className="landzo-static-text-link" to="/explore">
          Explore Map
        </Link>
      </div>

      <div aria-hidden="true" className="landzo-not-found-visual">
        <svg viewBox="0 0 440 340" xmlns="http://www.w3.org/2000/svg">
          <path className="landzo-not-found-contour" d="M38 174c35-99 146-153 252-119 88 29 118 137 69 219" />
          <path className="landzo-not-found-contour" d="M75 186c35-71 119-111 196-84 62 22 83 91 54 151" />
          <path className="landzo-not-found-contour" d="M113 196c29-46 83-69 132-52 40 14 55 57 38 98" />
          <path className="landzo-not-found-road" d="M17 260c97-42 163 41 267-13 53-28 83-61 134-67" />
          <path className="landzo-not-found-parcel-outline" d="M122 106 274 79l91 91-68 111-156-35-19-91Z" />
          <path className="landzo-not-found-lot" d="m141 246 56-111 100 21m-100-21 77-56m23 77 68 14m-168-35-37-29" />
          <path className="landzo-not-found-pin" d="M245 122a20 20 0 1 0-28.3 0L231 139l14-17Z" />
          <circle className="landzo-not-found-pin-dot" cx="231" cy="102" r="5" />
        </svg>
      </div>
    </div>
  </section>
);