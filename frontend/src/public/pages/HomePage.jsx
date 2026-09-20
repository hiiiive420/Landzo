import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";
import { LandzoFilterSelect } from "../components/LandzoFilterSelect";
import { getPublicHomepage } from "../../api/homepage.api";
import { listPublicProperties } from "../../api/publicProperties.api";
import { PublicCmsLink } from "../components/PublicCmsLink";
import { PublicPropertyCard } from "../components/PublicPropertyCard";

const trustItems = [
  {
    id: "verified",
    icon: "/image1.webp",
    label: "Verified\nproperties",
  },
  {
    id: "documents",
    icon: "/image2.webp",
    label: "Document\nSupport",
  },
  {
    id: "site-visit",
    icon: "/image3.webp",
    label: "Site Visit\nAssistance",
  },
  {
    id: "choice",
    icon: "/image4.webp",
    label: "Best\nChoise",
  },
];
const purposeItems = [
  {
    id: "dream-home",
    title: "Build Your Dream Home",
    to: "/properties?type=house",
    icon: "home",
  },
  {
    id: "business",
    title: "Grow Your Business",
    to: "/properties?type=commercial",
    icon: "business",
  },
  {
    id: "investment",
    title: "Invest for the Future",
    to: "/properties?transactionType=sale",
    icon: "investment",
  },
  {
    id: "farm",
    title: "Farm & Cultivate",
    to: "/properties?type=land",
    icon: "farm",
  },
];
const PurposeIcon = ({ type }) => {
  const paths = {
    home: [
      "M4 11.5 12 4l8 7.5V20h-5v-5H9v5H4v-8.5Z",
      "M9 20v-5h6v5",
    ],

    business: [
      "M5 20V9h5V4h9v16",
      "M8 12h2M8 16h2M14 8h2M14 12h2M14 16h2",
    ],

    investment: [
      "M4 18 9 13l4 3 7-9",
      "M15 7h5v5",
      "M6 20h12",
    ],

    farm: [
      "M12 20V10",
      "M12 14c-4 0-6-2.5-6-5 4 0 6 2 6 5Z",
      "M12 10c0-4 2.5-6 5-6 0 4-2 6-5 6Z",
      "M12 17c4 0 6-2.5 6-5-4 0-6 2-6 5Z",
    ],
  };

  return (
    <svg
      aria-hidden="true"
      className="landzo-purpose-icon"
      focusable="false"
      viewBox="0 0 24 24"
    >
      {paths[type].map(
        (path, index) => (
          <path
            d={path}
            fill="none"
            key={`${type}-${index}`}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        ),
      )}
    </svg>
  );
};
const LocationMapArtwork = () => (
  <svg
    aria-hidden="true"
    className="landzo-location-map-svg"
    focusable="false"
    viewBox="0 0 383 147"
    xmlns="http://www.w3.org/2000/svg"
  >
    <image
      href="/location-map.png"
      x="0"
      y="0"
      width="383"
      height="147"
      preserveAspectRatio="xMidYMid meet"
    />
  </svg>
);
const OpenMapIcon = () => (
  <svg
    aria-hidden="true"
    className="landzo-open-map-icon"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <path
      d="M3.5 5.5 8.5 3l7 2.5 5-2.5v15.5l-5 2.5-7-2.5-5 2.5V5.5Z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.65"
    />

    <path
      d="M8.5 3v15.5M15.5 5.5V21"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
    />
  </svg>
);


const ExploreMapPin = ({
  className = "",
}) => (
  <svg
    aria-hidden="true"
    className={`landzo-explore-map-pin ${className}`}
    focusable="false"
    viewBox="0 0 48 64"
  >
    <path
      d="
        M24 62
        C24 62 5 40 5 22
        C5 11.5 13.5 3 24 3
        C34.5 3 43 11.5 43 22
        C43 40 24 62 24 62Z
      "
      fill="currentColor"
      stroke="#F3EBE4"
      strokeWidth="2.4"
    />

    <circle
      cx="24"
      cy="22"
      r="10"
      fill="#F3EBE4"
      stroke="rgba(62,80,57,.35)"
      strokeWidth="1"
    />
  </svg>
);

const FeaturedArrowIcon = () => (
  <svg
    aria-hidden="true"
    className="landzo-featured-arrow-icon"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <path
      d="M8 12h8M13 8l4 4-4 4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
  </svg>
);
const BuyLandIcon = () => (
  <svg
    aria-hidden="true"
    className="landzo-search-tab-icon"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <path
      d="M4.5 18.5 7.2 7.2l8.9-2.1 3.4 11.6-8.2 2.2-6.8-.4Z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.55"
    />

    <path
      d="m7.4 7.6 4.4 3.5 4.1-5.4M11.8 11.1l-.5 7.7"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.55"
    />
  </svg>
);


const RentIcon = () => (
  <svg
    aria-hidden="true"
    className="landzo-search-tab-icon"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <rect
      x="4"
      y="5.5"
      width="16"
      height="14"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
    />

    <path
      d="M8 3.5v4M16 3.5v4M4 9.5h16M8 13h3M13 13h3M8 16h3M13 16h3"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.55"
    />
  </svg>
);


const LeaseIcon = () => (
  <svg
    aria-hidden="true"
    className="landzo-search-tab-icon"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <path
      d="m3.5 10 4-4 3.1 2.3 2.1-1.5c1-.7 2.4-.6 3.3.2l4.5 4.1-3 3-2.1-1.8"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.55"
    />

    <path
      d="m6 12.5 3.8 3.6c.7.7 1.8.7 2.5.1l3.8-3.5M8.2 14.5l1.5-1.4M10.3 16l1.4-1.4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.55"
    />
  </svg>
);

const featuredPropertyParams = {
  featured: "true",
  limit: 3,
  page: 1,
  sort: "newest",
};

const hasText = (value) =>
  Boolean(value?.trim?.());

const formatHeroPrice = (
  property,
) => {
  const pricing =
    property?.pricing;

  if (!pricing) {
    return "Price on request";
  }

  if (
    pricing.priceVisible === false ||
    pricing.priceOnRequest
  ) {
    return "Price on request";
  }

  if (
    pricing.amount === null ||
    pricing.amount === undefined
  ) {
    return "Price on request";
  }

  const currency =
    pricing.currency || "LKR";

  const amount =
    Number(
      pricing.amount,
    ).toLocaleString();

  return `${currency} ${amount}`;
};

const getHeroPropertyLocation = (
  property,
) =>
  property?.location?.area?.name ||
  property?.location?.city?.name ||
  property?.location?.district?.name ||
  property?.location?.displayAddress ||
  "";

const InlineIcon = ({
  iconKey,
}) => {
  const normalizedKey =
    iconKey
      ?.trim?.()
      .toLowerCase?.() ||
    "fallback";

  const paths = {
    guidance:
      "M12 3l7 4v5c0 4.1-2.8 7.7-7 8.8-4.2-1.1-7-4.7-7-8.8V7l7-4zM9 12l2 2 4-5",

    location:
      "M12 21s6-5.2 6-11a6 6 0 10-12 0c0 5.8 6 11 6 11zM12 12.2a2.2 2.2 0 100-4.4 2.2 2.2 0 000 4.4z",

    map:
      "M9 18l-5 2V6l5-2 6 2 5-2v14l-5 2-6-2zM9 4v14M15 6v14",

    property:
      "M4 20V9l8-6 8 6v11h-5v-6H9v6H4z",

    trust:
      "M12 3l8 4v5c0 4.4-3 8-8 9-5-1-8-4.6-8-9V7l8-4zM8.5 12l2.2 2.2 4.8-5",

    fallback:
      "M12 3l8 8-8 10-8-10 8-8zM12 7v10",
  };

  return (
    <svg
      aria-hidden="true"
      className="public-benefit-icon"
      focusable="false"
      viewBox="0 0 24 24"
    >
      <path
        d={
          paths[
            normalizedKey
          ] ||
          paths.fallback
        }
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
};

const CtaImage = ({
  image,
}) => {
  if (image?.url) {
    return (
      <img
        alt={
          image.alt ||
          "LANDZO property"
        }
        className="public-home-cta-image"
        loading="lazy"
        src={image.url}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="public-home-cta-fallback"
    />
  );
};

export const HomePage = () => {


  
  const navigate =
    useNavigate();
const [heroFilters, setHeroFilters] = useState({
  type: "",
  maxPrice: "",
  landSize: "",
});

const updateHeroFilter = (field, value) => {
  setHeroFilters((current) => ({
    ...current,
    [field]: value,
  }));
};
  const [
    requestKey,
    setRequestKey,
  ] = useState(0);

  const [
    pageState,
    setPageState,
  ] = useState({
    featuredProperties: [],
    homepage: null,
    isError: false,
    isLoading: true,
  });

  /*
   * Purpose carousel state.
   *
   * These hooks must stay before every effect and before
   * the loading/error early returns so HomePage always
   * calls hooks in the same order on every render.
   */
  const purposeTrackRef =
    useRef(null);

  const [
    purposeSlide,
    setPurposeSlide,
  ] = useState(0);

  const [
    isPurposePaused,
    setIsPurposePaused,
  ] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const loadHomepage =
      async () => {
        try {
          const [
            homepage,
            featuredResult,
          ] =
            await Promise.all([
              getPublicHomepage(),

              listPublicProperties(
                featuredPropertyParams,
              ),
            ]);

          if (!isCurrent) {
            return;
          }

          setPageState({
            featuredProperties:
              featuredResult.data ||
              [],

            homepage,

            isError: false,
            isLoading: false,
          });
        } catch {
          if (!isCurrent) {
            return;
          }

          setPageState({
            featuredProperties:
              [],

            homepage: null,

            isError: true,
            isLoading: false,
          });
        }
      };

    loadHomepage();

    return () => {
      isCurrent = false;
    };
  }, [requestKey]);



  useEffect(() => {
  if (
    pageState.isLoading ||
    pageState.isError ||
    isPurposePaused
  ) {
    return undefined;
  }

  const track =
    purposeTrackRef.current;

  if (!track) {
    return undefined;
  }

  const reduceMotion =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

  if (reduceMotion) {
    return undefined;
  }

  let animationFrameId;
  let previousTime = null;

  /*
   * Continuous movement speed.
   *
   * 24–32 px/sec feels good for this section.
   */
  const speed = 28;

  const animate = (time) => {
    if (previousTime === null) {
      previousTime = time;
    }

    const delta =
      time - previousTime;

    previousTime = time;

    /*
     * Convert speed to pixels moved
     * during this frame.
     */
    track.scrollLeft +=
      (speed * delta) / 1000;


    /*
     * Because the cards are rendered twice,
     * halfway is where the duplicate set starts.
     *
     * Resetting here is visually invisible.
     */
    const halfway =
      track.scrollWidth / 2;

    if (
      halfway > 0 &&
      track.scrollLeft >= halfway
    ) {
      track.scrollLeft -=
        halfway;
    }


    /*
     * Keep carousel dots synced.
     */
    const cards =
      track.querySelectorAll(
        ".landzo-purpose-card",
      );

    if (
      cards.length >=
      purposeItems.length
    ) {
      const firstCard =
        cards[0];

      const secondCard =
        cards[1];

      if (
        firstCard &&
        secondCard
      ) {
        const step =
          secondCard.offsetLeft -
          firstCard.offsetLeft;

        if (step > 0) {
          const index =
            Math.round(
              track.scrollLeft /
                step,
            ) %
            purposeItems.length;

          setPurposeSlide(
            index,
          );
        }
      }
    }

    animationFrameId =
      window.requestAnimationFrame(
        animate,
      );
  };

  animationFrameId =
    window.requestAnimationFrame(
      animate,
    );

  return () => {
    if (animationFrameId) {
      window.cancelAnimationFrame(
        animationFrameId,
      );
    }
  };
}, [
  isPurposePaused,
  pageState.isLoading,
  pageState.isError,
]);
  useEffect(() => {
    /*
     * Don't start until homepage is loaded.
     */
    if (
      pageState.isLoading ||
      pageState.isError
    ) {
      return undefined;
    }

    const track =
      purposeTrackRef.current;

    if (
      !track ||
      isPurposePaused
    ) {
      return undefined;
    }

    const reduceMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

    if (reduceMotion) {
      return undefined;
    }


    const interval =
      window.setInterval(() => {
        setPurposeSlide(
          (current) => {
            const next =
              current >=
              purposeItems.length - 1
                ? 0
                : current + 1;

            const cards =
              track.querySelectorAll(
                ".landzo-purpose-card",
              );

            const target =
              cards[next];

            if (target) {
              track.scrollTo({
                left:
                  target.offsetLeft -
                  track.offsetLeft,

                behavior:
                  "smooth",
              });
            }

            return next;
          },
        );
      }, 3500);

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [
    isPurposePaused,
    pageState.isLoading,
    pageState.isError,
  ]);

  const handleRetry = () => {
    setPageState(
      (current) => ({
        ...current,

        isError: false,
        isLoading: true,
      }),
    );

    setRequestKey(
      (current) =>
        current + 1,
    );
  };

  const handleHeroSearch = (
    event,
  ) => {
    event.preventDefault();

    const formData =
      new FormData(
        event.currentTarget,
      );

    const params =
      new URLSearchParams();

    const transactionType =
      formData.get(
        "transactionType",
      );

    const location =
      formData.get(
        "location",
      );

    const type =
      formData.get(
        "type",
      );

    const maxPrice =
      formData.get(
        "maxPrice",
      );

    /*
     * Land Size remains a hero
     * discovery control for now.
     *
     * We intentionally do not
     * send an unverified API
     * parameter to the listing
     * backend.
     */
    const landSize =
      formData.get(
        "landSize",
      );

    if (
      transactionType
    ) {
      params.set(
        "transactionType",
        transactionType,
      );
    }

    if (location) {
      params.set(
        "search",
        String(
          location,
        ).trim(),
      );
    }

    if (type) {
      params.set(
        "type",
        type,
      );
    }

    if (maxPrice) {
      params.set(
        "maxPrice",
        maxPrice,
      );
    }

    /*
     * Keep the control selected
     * without sending an unsupported
     * backend filter yet.
     */
    void landSize;

    navigate(
      `/properties${
        params.toString()
          ? `?${params.toString()}`
          : ""
      }`,
    );
  };

  if (
    pageState.isLoading
  ) {
    return (
      <section className="public-section public-home-state">
        <div className="public-container">
          <p className="public-eyebrow">
            LANDZO
          </p>

          <h1>
            Loading homepage
          </h1>
        </div>
      </section>
    );
  }

  if (
    pageState.isError ||
    !pageState.homepage
  ) {
    return (
      <section className="public-section public-home-state">
        <div className="public-container">
          <p className="public-eyebrow">
            LANDZO
          </p>

          <h1>
            Homepage is
            temporarily
            unavailable
          </h1>

          <p>
            Please try again
            shortly.
          </p>

          <button
            className="public-link-button public-link-button-primary"
            onClick={
              handleRetry
            }
            type="button"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  const {
    homepage,
    featuredProperties,
  } = pageState;

  const heroProperty =
    featuredProperties[0] ||
    null;

  const benefits =
    homepage.whyLandzo
      ?.benefits
      ?.slice(0, 4) ||
    [];

  const stats =
    homepage.stats
      ?.items
      ?.slice(0, 4) ||
    [];

  const hasWhyLandzo =
    hasText(
      homepage.whyLandzo
        ?.heading,
    ) ||
    hasText(
      homepage.whyLandzo
        ?.description,
    ) ||
    benefits.length > 0;

  const hasStats =
    hasText(
      homepage.stats
        ?.heading,
    ) ||
    stats.length > 0;

  const hasCta =
    hasText(
      homepage.cta
        ?.heading,
    ) ||
    hasText(
      homepage.cta
        ?.description,
    ) ||
    hasText(
      homepage.cta
        ?.button?.label,
    ) ||
    Boolean(
      homepage.cta
        ?.image?.url,
    );

  return (
    <>
      {/* =====================================================
          PREMIUM HERO
          ===================================================== */}

     <section className="landzo-home-hero">

  {/* Exact Figma hero artwork */}
  <svg
    aria-hidden="true"
    className="landzo-home-hero-art"
    preserveAspectRatio="none"
    viewBox="0 0 1250 1375"
  >
    <defs>
      <clipPath id="landzoHeroClip">
        <path
          d="
            M-1 0
            H1250
            V1336.5
            H824.5
            C824.5 1336.5
             694.111 1375
             624.5 1375
            C554.889 1375
             435 1336.5
             435 1336.5
            H-1
            V0
            Z
          "
        />
      </clipPath>

      <radialGradient
        id="landzoHeroShade"
        cx="0"
        cy="0"
        r="1"
        gradientUnits="userSpaceOnUse"
        gradientTransform="
          translate(1053.5 664)
          rotate(94.774)
          scale(919.189 898.07)
        "
      >
        <stop stopOpacity="0" />

        <stop
          offset="0.688002"
          stopOpacity="0.5"
        />
      </radialGradient>
    </defs>

    {/* Backend / CMS image */}
    {homepage.hero?.image?.url ? (
      <image
        clipPath="url(#landzoHeroClip)"
        height="1375"
        href={homepage.hero.image.url}
        preserveAspectRatio="xMidYMid slice"
        width="1250"
        x="0"
        y="0"
      />
    ) : (
      <rect
        clipPath="url(#landzoHeroClip)"
        fill="#173c2d"
        height="1375"
        width="1250"
      />
    )}

    {/* Exact Figma radial overlay */}
    <path
      d="
        M-1 0
        H1250
        V1336.5
        H824.5
        C824.5 1336.5
         694.111 1375
         624.5 1375
        C554.889 1375
         435 1336.5
         435 1336.5
        H-1
        V0
        Z
      "
      fill="url(#landzoHeroShade)"
    />
  </svg>

        <div className="public-container landzo-home-hero-inner">

          {/* HERO CONTENT */}

          <div className="landzo-home-hero-copy">
            {hasText(
              homepage.hero
                ?.eyebrow,
            ) ? (
              <p className="landzo-home-eyebrow">
                {
                  homepage.hero
                    .eyebrow
                }
              </p>
            ) : null}

            <h1>
              {homepage.hero
                ?.heading ||
                "Find the Right Land for Your Next Chapter"}
            </h1>

            {hasText(
              homepage.hero
                ?.highlight,
            ) ? (
              <p className="landzo-home-highlight">
                {
                  homepage.hero
                    .highlight
                }
              </p>
            ) : null}

            {hasText(
              homepage.hero
                ?.description,
            ) ? (
              <p className="landzo-home-description">
                {
                  homepage.hero
                    .description
                }
              </p>
            ) : null}

           
          </div>

          {/* FEATURED PROPERTY FLOATING CARD */}

          {heroProperty ? (
            <Link
              className="landzo-hero-property"
              to={`/properties/${heroProperty.code}`}
            >
              <div className="landzo-hero-property-top">
                <span className="landzo-hero-property-label">
                  {
                    heroProperty.code
                  }
                </span>

                {heroProperty
                  .transactionTypes
                  ?.[0] ? (
                  <span className="landzo-hero-property-status">
                    {
                      heroProperty
                        .transactionTypes[0]
                    }
                  </span>
                ) : null}
              </div>

              {getHeroPropertyLocation(
                heroProperty,
              ) ? (
                <span className="landzo-hero-property-location">
                  {getHeroPropertyLocation(
                    heroProperty,
                  )}
                </span>
              ) : null}

              <strong>
                {
                  heroProperty.title
                }
              </strong>

              <span className="landzo-hero-property-price">
                {formatHeroPrice(
                  heroProperty,
                )}
              </span>

              <span className="landzo-hero-property-link">
                View Property →
              </span>
            </Link>
          ) : null}

          {/* MAP PIN DECORATION */}

        

          {/* HERO PROPERTY SEARCH */}

          <form
            className="landzo-home-search"
            onSubmit={
              handleHeroSearch
            }
          >
    <div className="landzo-home-search-tabs">

  {/* BUY LAND */}
  <label>
    <input
      defaultChecked
      name="transactionType"
      type="radio"
      value="sale"
    />

    <span>
      <BuyLandIcon />

      <span className="landzo-search-tab-label">
        BUY LAND
      </span>
    </span>
  </label>


  {/* RENT */}
  <label>
    <input
      name="transactionType"
      type="radio"
      value="rent"
    />

    <span>
      <RentIcon />

      <span className="landzo-search-tab-label">
        RENT
      </span>
    </span>
  </label>


  {/* LEASE */}
  <label>
    <input
      name="transactionType"
      type="radio"
      value="lease"
    />

    <span>
      <LeaseIcon />

      <span className="landzo-search-tab-label">
        LEASE
      </span>
    </span>
  </label>

</div>

            <div className="landzo-home-search-fields">

              <label>
                <span>
                  Location
                </span>

                <input
                  autoComplete="off"
                  name="location"
                  placeholder="Select location"
                  type="text"
                />
              </label>
              <LandzoFilterSelect
                className="landzo-home-filter-select"
                label="Property Type"
                onChange={(event) => updateHeroFilter("type", event.target.value)}
                options={[{ value: "", label: "Any type" }, { value: "land", label: "Land" }, { value: "house", label: "House" }, { value: "apartment", label: "Apartment" }, { value: "commercial", label: "Commercial" }]}
                value={heroFilters.type}
              />
              <input name="type" type="hidden" value={heroFilters.type} />
              <LandzoFilterSelect
                className="landzo-home-filter-select"
                label="Price Range"
                onChange={(event) => updateHeroFilter("maxPrice", event.target.value)}
                options={[{ value: "", label: "Any budget" }, { value: "5000000", label: "Up to LKR 5M" }, { value: "10000000", label: "Up to LKR 10M" }, { value: "25000000", label: "Up to LKR 25M" }, { value: "50000000", label: "Up to LKR 50M" }, { value: "100000000", label: "Up to LKR 100M" }]}
                value={heroFilters.maxPrice}
              />
              <input name="maxPrice" type="hidden" value={heroFilters.maxPrice} />
              <LandzoFilterSelect
                className="landzo-home-filter-select"
                label="Land Size"
                onChange={(event) => updateHeroFilter("landSize", event.target.value)}
                options={[{ value: "", label: "Any size" }, { value: "10", label: "10+ Perches" }, { value: "20", label: "20+ Perches" }, { value: "40", label: "40+ Perches" }, { value: "80", label: "80+ Perches" }]}
                value={heroFilters.landSize}
              />
              <input name="landSize" type="hidden" value={heroFilters.landSize} />
            </div>

            <button
              className="landzo-home-search-submit"
              type="submit"
            >
              Explore Properties
            </button>
          </form>
        </div>
      </section>

      {/* =====================================================
          FEATURED PROPERTIES
          ORIGINAL FUNCTIONALITY PRESERVED
          ===================================================== */}

      <section className="public-section public-featured-section">
        <div className="public-container">
          <div className="public-section-heading-row">
            <div>
              {hasText(
                homepage
                  .featuredProperties
                  ?.heading,
              ) ? (
                <h2>
                  {
                    homepage
                      .featuredProperties
                      .heading
                  }
                </h2>
              ) : null}

              {hasText(
                homepage
                  .featuredProperties
                  ?.description,
              ) ? (
                <p>
                  {
                    homepage
                      .featuredProperties
                      .description
                  }
                </p>
              ) : null}
            </div>

           <Link
  className="public-section-link landzo-featured-view-all"
  to="/properties"
>
  <span>View All</span>

  <span className="landzo-featured-view-all-icon">
    <FeaturedArrowIcon />
  </span>
</Link>
          </div>

          {featuredProperties.length >
          0 ? (
            <div className="public-featured-grid">
              {featuredProperties.map(
                (property) => (
                  <PublicPropertyCard
                    key={
                      property.code
                    }
                    property={
                      property
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <div className="public-empty-state">
              <p>
                No featured
                properties are
                available right
                now.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
    EXPLORE ON MAP
    ===================================================== */}
<section className="landzo-home-location-section">
  <div className="landzo-home-location-inner">

    <div className="landzo-home-location-copy">
      <h2>
        Explore on Map
      </h2>

      <p>
        See properties around your
        preferred areas.
      </p>

      <Link
        className="landzo-home-location-button"
        to="/explore"
      >
        <span>
          Open Map
        </span>

        <OpenMapIcon />
      </Link>
    </div>


   <div
  aria-hidden="true"
  className="landzo-home-location-art"
>
  <LocationMapArtwork />
</div>

  </div>
</section>


{/* =====================================================
    BROWSE BY PURPOSE
    ===================================================== */}

<section className="landzo-purpose-section">
  <div className="landzo-purpose-inner">

    <div className="landzo-purpose-heading-row">
      <h2>
        Browse by Purpose
      </h2>

      <Link
        className="landzo-purpose-see-all"
        to="/properties"
      >
        <span>
          See All
        </span>

        <span className="landzo-purpose-see-all-icon">
          <FeaturedArrowIcon />
        </span>
      </Link>
    </div>


    <div
  className="landzo-purpose-track"
  ref={purposeTrackRef}

  onMouseEnter={() =>
    setIsPurposePaused(true)
  }

  onMouseLeave={(event) => {
    const isDesktop =
      window.matchMedia(
        "(min-width: 1025px)",
      ).matches;

    if (
      !isDesktop ||
      !event.currentTarget.contains(
        document.activeElement,
      )
    ) {
      setIsPurposePaused(false);
    }
  }}

  onFocusCapture={() => {
    if (
      window.matchMedia(
        "(min-width: 1025px)",
      ).matches
    ) {
      setIsPurposePaused(true);
    }
  }}

  onBlurCapture={(event) => {
    if (
      window.matchMedia(
        "(min-width: 1025px)",
      ).matches &&
      !event.currentTarget.contains(
        event.relatedTarget,
      )
    ) {
      setIsPurposePaused(false);
    }
  }}

  onTouchStart={() =>
    setIsPurposePaused(true)
  }

  onTouchEnd={() =>
    setIsPurposePaused(false)
  }
>
     {[
  ...purposeItems,
  ...purposeItems,
].map(
  (item, index) => (
    <Link
      className="landzo-purpose-card"
      key={`${item.id}-${index}`}
      to={item.to}
    >
      <span className="landzo-purpose-icon-shell">
        <PurposeIcon
          type={item.icon}
        />
      </span>

      <span className="landzo-purpose-card-title">
        {item.title}
      </span>
    </Link>
  ),
)}
    </div>


    <div
  aria-label="Purpose carousel position"
  className="landzo-purpose-dots"
>
  {purposeItems.map(
    (item, index) => (
      <button
        aria-label={`Go to ${item.title}`}
        className={
          index === purposeSlide
            ? "is-active"
            : ""
        }
        key={item.id}
        onClick={() => {
          const track =
            purposeTrackRef.current;

          const cards =
            track?.querySelectorAll(
              ".landzo-purpose-card",
            );

          const target =
            cards?.[index];

          if (
            !track ||
            !target
          ) {
            return;
          }

          setPurposeSlide(
            index,
          );

          track.scrollTo({
            left:
              target.offsetLeft -
              track.offsetLeft,

            behavior:
              "smooth",
          });
        }}
        type="button"
      />
    ),
  )}
</div>

  </div>
</section>



{/* =====================================================
    VERIFIED / TRANSPARENT / RELIABLE
    ===================================================== */}

<section className="landzo-trust-section">
  <div className="landzo-trust-card">

    {/* EXACT FIGMA BACKGROUND */}

    <img
      aria-hidden="true"
      alt=""
      className="landzo-trust-background"
      src="/verified-trust-bg.svg"
    />


    {/* CONTENT */}

    <div className="landzo-trust-content">

      <h2 className="landzo-trust-heading">
        Verified. Transparent. Reliable.
      </h2>


      <div className="landzo-trust-items">

        {trustItems.map(
          (item) => (
            <div
              className="landzo-trust-item"
              key={item.id}
            >

              <div className="landzo-trust-icon-shell">
                <img
                  alt=""
                  className="landzo-trust-icon"
                  src={item.icon}
                />
              </div>


              <span className="landzo-trust-label">
                {item.label}
              </span>

            </div>
          ),
        )}

      </div>

    </div>
  </div>
</section>


{/* =====================================================
    LIST YOUR PROPERTY CTA
    ===================================================== */}

<section className="landzo-list-property-section">
  <div className="landzo-list-property-card">

    <div className="landzo-list-property-copy">

      <h2>
        Have Land to
        <br />
        Sell, Rent or Lease?
      </h2>

      <p>
        List your property and reach genuine
        <br />
        buyers &amp; tenants.
      </p>

      <Link
        className="landzo-list-property-button"
        to="/contact"
      >
        List Your Property
      </Link>

    </div>


    <div
      aria-hidden="true"
      className="landzo-list-property-art"
    >
      <img
        alt=""
        src="/list-property-illustration.webp"
      />
    </div>

  </div>
</section>

      {/* =====================================================
          STATS
          ORIGINAL FUNCTIONALITY PRESERVED
          ===================================================== */}

      {hasStats ? (
        <section className="public-section public-stats-section">
          <div className="public-container">
            {hasText(
              homepage.stats
                ?.heading,
            ) ? (
              <h2>
                {
                  homepage.stats
                    .heading
                }
              </h2>
            ) : null}

            {stats.length > 0 ? (
              <div className="public-stats-grid">
                {stats.map(
                  (item) => (
                    <div
                      className="public-stat-card"
                      key={
                        item.id ||
                        `${item.value}-${item.label}`
                      }
                    >
                      <strong>
                        {
                          item.value
                        }
                      </strong>

                      <span>
                        {
                          item.label
                        }
                      </span>
                    </div>
                  ),
                )}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

     
    
    </>
  );
};