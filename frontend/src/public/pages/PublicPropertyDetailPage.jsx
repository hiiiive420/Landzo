import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  analyticsEventTypes,
  analyticsSurfaces,
  recordAnalyticsEventSafely,
} from "../../api/analytics.api";

import {
  getPublicApiErrorMessage,
} from "../../api/publicApiClient";

import {
  getPublicProperty,
} from "../../api/publicProperties.api";

import {
  getPublicContactSettings,
} from "../../api/publicSettings.api";

import {
  SavePropertyButton,
} from "../components/SavePropertyButton";


/* =========================================================
   LABELS
   ========================================================= */

const leasePeriodSuffixes = {
  monthly: " / month",
  annual: " / year",
  total: " total lease",
};

const typeLabels = {
  land: "Land",
  house: "House",
  apartment: "Apartment",
  commercial: "Commercial",
};

const transactionLabels = {
  sale: "Sale",
  rent: "Rent",
  lease: "Lease",
};


/* =========================================================
   ICONS
   ========================================================= */

const BackIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
  >
    <path
      d="M15 5 8 12l7 7"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);


const ShareIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
  >
    <circle
      cx="18"
      cy="5"
      r="2.3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />

    <circle
      cx="6"
      cy="12"
      r="2.3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />

    <circle
      cx="18"
      cy="19"
      r="2.3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />

    <path
      d="m8.2 10.9 7.5-4.5M8.2 13.1l7.5 4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);


const LocationIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
  >
    <path
      d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />

    <circle
      cx="12"
      cy="10"
      r="2.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />
  </svg>
);


const CameraIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
  >
    <path
      d="M4 8h3l1.6-2h6.8L17 8h3v11H4V8Z"
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />

    <circle
      cx="12"
      cy="13"
      r="3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);


const MapIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
  >
    <path
      d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Z"
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />

    <path
      d="M9 4v14M15 6v14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    />
  </svg>
);


/* =========================================================
   FORMATTERS
   ========================================================= */

const humanize = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "";
  }

  return String(value)
    .replace(
      /([a-z0-9])([A-Z])/g,
      "$1 $2",
    )
    .replace(/[_-]/g, " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
};


const formatSize = (
  value,
  unit,
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const normalized =
    String(unit || "")
      .replace(
        /([a-z0-9])([A-Z])/g,
        "$1_$2",
      )
      .replace(/[\s-]+/g, "_")
      .toLowerCase();

  const unitLabels = {
    perch: "Perch",
    acre: "Acre",
    square_feet: "Sq.ft",
    squarefeet: "Sq.ft",
    sqft: "Sq.ft",
    square_meter: "Sq.m",
    square_meters: "Sq.m",
    squaremeter: "Sq.m",
    sqm: "Sq.m",
  };

  let label =
    unitLabels[normalized] ||
    humanize(unit);

  if (Number(value) !== 1) {
    if (normalized === "perch") {
      label = "Perches";
    }

    if (normalized === "acre") {
      label = "Acres";
    }
  }

  return `${value}${
    label ? ` ${label}` : ""
  }`;
};


const formatPrice = (
  pricing,
  transactionTypes = [],
) => {
  if (!pricing) {
    return null;
  }

  if (!pricing.priceVisible) {
    return "Price on request";
  }

  const transactionType =
    transactionTypes[0] ||
    "sale";

  const section =
    pricing[transactionType] ||
    pricing.sale ||
    pricing.rent ||
    pricing.lease;

  if (
    !section ||
    !Number.isFinite(
      section.amount,
    )
  ) {
    return "Price on request";
  }

  const amount =
    new Intl.NumberFormat(
      "en-LK",
      {
        currency:
          pricing.currency ||
          "LKR",
        maximumFractionDigits: 0,
        style: "currency",
      },
    ).format(
      section.amount,
    );

  const suffix =
    transactionType === "lease"
      ? leasePeriodSuffixes[
          section.period
        ] || ""
      : "";

  return `${amount}${suffix}`;
};


/*
 * displayAddress already contains the full address,
 * so don't append city/district/province to it again.
 */
const formatLocation = (
  location = {},
) => {
  if (
    location.displayAddress
  ) {
    return location.displayAddress;
  }

  return [
    location.area?.name,
    location.city?.name,
    location.district?.name,
    location.province?.name,
  ]
    .filter(Boolean)
    .join(", ");
};


const buildWhatsAppHref = ({
  phone,
  propertyCode,
}) => {
  const digits =
    phone?.replace?.(
      /\D/g,
      "",
    ) || "";

  if (!digits) {
    return null;
  }

  const text =
    `Hello LANDZO, I am interested in property ${propertyCode}.`;

  return `https://wa.me/${digits}?text=${encodeURIComponent(
    text,
  )}`;
};


/* =========================================================
   EXACT ADMIN DETAIL MAPPING
   ========================================================= */

const getPropertyFacts = (
  property,
) => {
  const type =
    property?.type;

  const details =
    property?.details?.[
      type
    ] || {};

  const facts = [];


  /* LAND */

  if (type === "land") {
    const size =
      formatSize(
        details.landSize,
        details.landSizeUnit,
      );

    if (size) {
      facts.push({
        label: "Land Size",
        value: size,
      });
    }

    if (details.landType) {
      facts.push({
        label: "Land Type",
        value:
          humanize(
            details.landType,
          ),
      });
    }

    if (
      details.roadWidth ||
      details.roadAccess
    ) {
      facts.push({
        label: "Road Access",
        value:
          details.roadWidth
            ? `${details.roadWidth} ft Road`
            : "Available",
      });
    }

    if (
      Array.isArray(
        details.utilities,
      ) &&
      details.utilities.length
    ) {
      facts.push({
        label: "Utilities",
        value:
          details.utilities
            .map(humanize)
            .join(" • "),
      });
    }
  }


  /* HOUSE */

  if (type === "house") {
    if (details.bedrooms) {
      facts.push({
        label: "Bedrooms",
        value:
          `${details.bedrooms} ${
            Number(
              details.bedrooms,
            ) === 1
              ? "Bedroom"
              : "Bedrooms"
          }`,
      });
    }

    if (details.bathrooms) {
      facts.push({
        label: "Bathrooms",
        value:
          `${details.bathrooms} ${
            Number(
              details.bathrooms,
            ) === 1
              ? "Bathroom"
              : "Bathrooms"
          }`,
      });
    }

    if (details.floors) {
      facts.push({
        label: "Floors",
        value:
          `${details.floors} ${
            Number(
              details.floors,
            ) === 1
              ? "Floor"
              : "Floors"
          }`,
      });
    }

    const landSize =
      formatSize(
        details.landSize,
        details.landSizeUnit,
      );

    if (landSize) {
      facts.push({
        label: "Land Size",
        value: landSize,
      });
    }

    const houseSize =
      formatSize(
        details.houseSize,
        details.houseSizeUnit,
      );

    if (houseSize) {
      facts.push({
        label: "House Size",
        value: houseSize,
      });
    }

    if (
      details.parkingSpaces
    ) {
      facts.push({
        label: "Parking",
        value:
          `${details.parkingSpaces} ${
            Number(
              details.parkingSpaces,
            ) === 1
              ? "Space"
              : "Spaces"
          }`,
      });
    }

    if (
      details.furnishedStatus
    ) {
      facts.push({
        label: "Furnished",
        value:
          humanize(
            details.furnishedStatus,
          ),
      });
    }
  }


  /* APARTMENT */

  if (
    type ===
    "apartment"
  ) {
    if (details.bedrooms) {
      facts.push({
        label: "Bedrooms",
        value:
          `${details.bedrooms} Bedrooms`,
      });
    }

    if (details.bathrooms) {
      facts.push({
        label: "Bathrooms",
        value:
          `${details.bathrooms} Bathrooms`,
      });
    }

    if (
      details.floorNumber
    ) {
      facts.push({
        label: "Floor",
        value:
          `Floor ${details.floorNumber}`,
      });
    }

    if (
      details.totalFloors
    ) {
      facts.push({
        label: "Total Floors",
        value:
          String(
            details.totalFloors,
          ),
      });
    }

    const unitSize =
      formatSize(
        details.unitSize,
        details.unitSizeUnit,
      );

    if (unitSize) {
      facts.push({
        label: "Unit Size",
        value: unitSize,
      });
    }

    if (
      details.parkingSpaces
    ) {
      facts.push({
        label: "Parking",
        value:
          `${details.parkingSpaces} Spaces`,
      });
    }

    if (
      details.furnishedStatus
    ) {
      facts.push({
        label: "Furnished",
        value:
          humanize(
            details.furnishedStatus,
          ),
      });
    }
  }


  /* COMMERCIAL */

  if (
    type ===
    "commercial"
  ) {
    if (
      details.commercialType
    ) {
      facts.push({
        label: "Commercial Type",
        value:
          humanize(
            details.commercialType,
          ),
      });
    }

    const floorArea =
      formatSize(
        details.floorArea,
        details.floorAreaUnit,
      );

    if (floorArea) {
      facts.push({
        label: "Floor Area",
        value: floorArea,
      });
    }

    if (
      details.floorNumber
    ) {
      facts.push({
        label: "Floor",
        value:
          `Floor ${details.floorNumber}`,
      });
    }

    if (
      details.parkingSpaces
    ) {
      facts.push({
        label: "Parking",
        value:
          `${details.parkingSpaces} ${
            Number(
              details.parkingSpaces,
            ) === 1
              ? "Space"
              : "Spaces"
          }`,
      });
    }
  }

  return facts;
};


/* =========================================================
   PAGE
   ========================================================= */

export const PublicPropertyDetailPage =
  () => {
    const {
      propertyCode,
    } = useParams();

    const navigate =
      useNavigate();

    const [
      property,
      setProperty,
    ] = useState(null);

    const [
      isLoading,
      setIsLoading,
    ] = useState(true);

    const [
      error,
      setError,
    ] = useState("");

    const [
      contactSettings,
      setContactSettings,
    ] = useState(null);

    const [
      activeImageIndex,
      setActiveImageIndex,
    ] = useState(0);

    const analyticsTrackedRef =
      useRef(false);


    /* =====================================================
       CONTACT SETTINGS
       ===================================================== */

    useEffect(() => {
      let ignore = false;

      const loadContactSettings =
        async () => {
          try {
            const loadedSettings =
              await getPublicContactSettings();

            if (!ignore) {
              setContactSettings(
                loadedSettings,
              );
            }
          } catch {
            if (!ignore) {
              setContactSettings(
                null,
              );
            }
          }
        };

      void loadContactSettings();

      return () => {
        ignore = true;
      };
    }, []);


    /* =====================================================
       PROPERTY
       ===================================================== */

    useEffect(() => {
      let ignore = false;

      analyticsTrackedRef.current =
        false;

      const loadProperty =
        async () => {
          try {
            setIsLoading(true);
            setError("");

            const response =
              await getPublicProperty(
                propertyCode,
              );

            if (ignore) {
              return;
            }

            setProperty(
              response,
            );

            setActiveImageIndex(
              0,
            );

            if (
              !analyticsTrackedRef.current &&
              response?.id
            ) {
              analyticsTrackedRef.current =
                true;

              recordAnalyticsEventSafely({
                eventType:
                  analyticsEventTypes
                    .propertyView,

                propertyId:
                  response.id,

                context: {
                  surface:
                    analyticsSurfaces
                      .propertyDetail,
                },
              });
            }
          } catch (
            requestError
          ) {
            if (!ignore) {
              setProperty(null);

              setError(
                getPublicApiErrorMessage(
                  requestError,
                ),
              );
            }
          } finally {
            if (!ignore) {
              setIsLoading(false);
            }
          }
        };

      if (propertyCode) {
        void loadProperty();
      }

      return () => {
        ignore = true;
      };
    }, [
      propertyCode,
    ]);


  const galleryImages =
  useMemo(() => {
    const images =
      (
        property?.media
          ?.images ?? []
      ).filter(
        (image) =>
          image?.url,
      );

    const coverImage =
      property?.media
        ?.coverImage;


    /*
     * No explicit cover:
     * retain normal image order.
     */
    if (!coverImage?.url) {
      return images;
    }


    /*
     * Remove the cover from its
     * original position so it
     * doesn't appear twice.
     */
    const remainingImages =
      images.filter(
        (image) => {
          if (
            coverImage.id &&
            image.id
          ) {
            return (
              image.id !==
              coverImage.id
            );
          }

          return (
            image.url !==
            coverImage.url
          );
        },
      );


    /*
     * Cover selected in Admin
     * ALWAYS becomes slide 1.
     */
    return [
      coverImage,
      ...remainingImages,
    ];
  }, [
    property,
  ]);


    const facts =
      useMemo(
        () =>
          property
            ? getPropertyFacts(
                property,
              )
            : [],
        [
          property,
        ],
      );


    if (isLoading) {
      return (
        <div className="landzo-detail-state">
          Loading property…
        </div>
      );
    }


    if (
      error ||
      !property
    ) {
      return (
        <div className="landzo-detail-state">

          <strong>
            Property not found
          </strong>

          <p>
            This property is
            unavailable or no
            longer exists.
          </p>

          <Link to="/properties">
            Return to properties
          </Link>

        </div>
      );
    }


    const locationLabel =
      formatLocation(
        property.location,
      );


    const priceLabel =
      formatPrice(
        property.pricing,
        property
          .transactionTypes ??
          [],
      ) ||
      "Price on request";


    const transactionType =
      property
        .transactionTypes?.[0];


    const transactionLabel =
      transactionLabels[
        transactionType
      ] ||
      transactionType;


    const activeImage =
      galleryImages[
        activeImageIndex
      ] ||
      property
        .media?.coverImage;


    const primaryFacts =
      facts.slice(0, 4);


    /*
     * These are NOT repeats.
     * Only fields not already
     * shown above go here.
     */
    const additionalFacts =
      facts.slice(4);


    const whatsappHref =
      buildWhatsAppHref({
        phone:
          contactSettings
            ?.business
            ?.whatsapp,

        propertyCode:
          property.code,
      });


    const previousImage =
      () => {
        if (
          galleryImages.length <
          2
        ) {
          return;
        }

        setActiveImageIndex(
          (current) =>
            current === 0
              ? galleryImages.length -
                1
              : current - 1,
        );
      };


    const nextImage =
      () => {
        if (
          galleryImages.length <
          2
        ) {
          return;
        }

        setActiveImageIndex(
          (current) =>
            current ===
            galleryImages.length -
              1
              ? 0
              : current + 1,
        );
      };


    const handleShare =
      async () => {
        try {
          if (
            navigator.share
          ) {
            await navigator.share({
              title:
                property.title,

              text:
                `LANDZO property ${property.code}`,

              url:
                window.location.href,
            });

            return;
          }

          await navigator
            .clipboard
            ?.writeText(
              window.location.href,
            );
        } catch {
          // User cancelled share.
        }
      };


    return (
      <main className="landzo-property-detail-page">

        {/* ===============================================
            HERO / GALLERY
            =============================================== */}

        <section className="landzo-detail-hero">

          {activeImage?.url ? (
            <img
              alt={
                property.title
              }
              className="landzo-detail-hero-image"
              src={
                activeImage.url
              }
            />
          ) : (
            <div className="landzo-detail-hero-fallback" />
          )}


          <div
            aria-hidden="true"
            className="landzo-detail-hero-shade"
          />


          {/* TOP ACTIONS */}

          <div className="landzo-detail-topbar">

            <button
              aria-label="Go back"
              className="landzo-detail-icon-button"
              onClick={() =>
                navigate(-1)
              }
              type="button"
            >
              <BackIcon />
            </button>


            <Link
              className="landzo-detail-wordmark"
              to="/"
            >
              <strong>
                LANDZO
              </strong>

              <span>
                Your Land. Your Future
              </span>
            </Link>


            <div className="landzo-detail-top-actions">

              <SavePropertyButton
                className="landzo-detail-save"
                propertyCode={
                  property.code
                }
                propertyId={
                  property.id
                }
                propertyTitle={
                  property.title
                }
                surface={
                  analyticsSurfaces
                    .propertyDetail
                }
              />


              <button
                aria-label="Share property"
                className="landzo-detail-icon-button"
                onClick={
                  handleShare
                }
                type="button"
              >
                <ShareIcon />
              </button>

            </div>

          </div>


          {transactionLabel ? (
            <span
              className={[
                "landzo-detail-status",

                transactionType
                  ? `is-${transactionType}`
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              For{" "}
              {
                transactionLabel
              }
            </span>
          ) : null}


          {galleryImages.length >
          0 ? (
            <div className="landzo-detail-photo-count">
              <CameraIcon />

              {
                galleryImages.length
              }

              {" "}
              {galleryImages.length ===
              1
                ? "Photo"
                : "Photos"}
            </div>
          ) : null}


          {galleryImages.length >
          1 ? (
            <>
              <button
                aria-label="Previous image"
                className="landzo-detail-gallery-arrow is-left"
                onClick={
                  previousImage
                }
                type="button"
              >
                ‹
              </button>


              <button
                aria-label="Next image"
                className="landzo-detail-gallery-arrow is-right"
                onClick={
                  nextImage
                }
                type="button"
              >
                ›
              </button>


              <div className="landzo-detail-gallery-dots">

                {galleryImages.map(
                  (
                    image,
                    index,
                  ) => (
                    <button
                      aria-label={`Open photo ${index + 1}`}
                      className={
                        index ===
                        activeImageIndex
                          ? "is-active"
                          : ""
                      }
                      key={
                        image.id ||
                        image.url
                      }
                      onClick={() =>
                        setActiveImageIndex(
                          index,
                        )
                      }
                      type="button"
                    />
                  ),
                )}

              </div>
            </>
          ) : null}

        </section>


        {/* ===============================================
            PROPERTY SUMMARY
            =============================================== */}

        <section className="landzo-detail-summary">

          <div className="landzo-detail-heading-row">

            <div>

              <h1>
                {
                  property.title
                }
              </h1>


              {locationLabel ? (
                <p className="landzo-detail-location-label">

                  <LocationIcon />

                  <span>
                    {
                      locationLabel
                    }
                  </span>

                </p>
              ) : null}

            </div>


            <span className="landzo-detail-code">
              {
                property.code
              }
            </span>

          </div>


          <strong className="landzo-detail-price">
            {
              priceLabel
            }
          </strong>


          {/* Details shown ONCE */}

          {primaryFacts.length >
          0 ? (
            <div className="landzo-detail-facts">

              {primaryFacts.map(
                (fact) => (
                  <div
                    className="landzo-detail-fact"
                    key={
                      fact.label
                    }
                  >

                    <span>
                      {
                        fact.label
                      }
                    </span>

                    <strong>
                      {
                        fact.value
                      }
                    </strong>

                  </div>
                ),
              )}

            </div>
          ) : null}

        </section>


        {/* ===============================================
            ABOUT
            =============================================== */}

        {property.description ? (
          <section className="landzo-detail-panel">

            <h2>
              About This Property
            </h2>

            <p className="landzo-detail-description">
              {
                property.description
              }
            </p>

          </section>
        ) : null}


        {/* ===============================================
            REMAINING NON-DUPLICATED DETAILS
            =============================================== */}

        {additionalFacts.length >
        0 ? (
          <section className="landzo-detail-panel">

            <h2>
              Additional Details
            </h2>

            <div className="landzo-detail-additional-grid">

              {additionalFacts.map(
                (fact) => (
                  <div
                    key={
                      fact.label
                    }
                  >
                    <span>
                      {
                        fact.label
                      }
                    </span>

                    <strong>
                      {
                        fact.value
                      }
                    </strong>
                  </div>
                ),
              )}

            </div>

          </section>
        ) : null}


        {/* ===============================================
            LOCATION
            Reuses your previous Home location artwork.
            =============================================== */}

       {Number.isFinite(
  property.map?.lat,
) &&
Number.isFinite(
  property.map?.lng,
) ? (
  <section className="landzo-detail-panel landzo-detail-location-panel">

    <h2>
      Location
    </h2>


    {locationLabel ? (
      <p className="landzo-detail-map-address">

        <LocationIcon />

        <span>
          {locationLabel}
        </span>

      </p>
    ) : null}


    <div className="landzo-detail-dynamic-map">

      <iframe
        loading="lazy"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${
          property.map.lng -
          0.008
        }%2C${
          property.map.lat -
          0.008
        }%2C${
          property.map.lng +
          0.008
        }%2C${
          property.map.lat +
          0.008
        }&layer=mapnik&marker=${
          property.map.lat
        }%2C${
          property.map.lng
        }`}
        title={`${property.title} location`}
      />


      <Link
        className="landzo-detail-open-map"
        to="/explore"
      >
        <MapIcon />

        <span>
          Open in
          <strong>
            Explore Map
          </strong>
        </span>
      </Link>

    </div>

  </section>
) : null}


        {/* ===============================================
            TRUST
            =============================================== */}

        <div className="landzo-detail-trust">

          <div>
            <strong>
              ✓
            </strong>

            <span>
              Verified
              Property
            </span>
          </div>


          <div>
            <strong>
              ▣
            </strong>

            <span>
              Document
              Support
            </span>
          </div>


          <div>
            <strong>
              ⌖
            </strong>

            <span>
              Site Visit
              Assistance
            </span>
          </div>

        </div>


        {/* ===============================================
            CONTACT
            =============================================== */}

        <section className="landzo-detail-contact">

          <div className="landzo-detail-contact-copy">

            <strong>
              Interested in this property?
            </strong>

            <span>
              Get in touch with our
              property team.
            </span>

          </div>


          {whatsappHref ? (
            <a
              className="landzo-detail-contact-button is-whatsapp"
              href={
                whatsappHref
              }
              onClick={() =>
                recordAnalyticsEventSafely({
                  eventType:
                    analyticsEventTypes
                      .whatsappClick,

                  propertyId:
                    property.id,

                  context: {
                    surface:
                      analyticsSurfaces
                        .propertyDetail,
                  },
                })
              }
              rel="noreferrer"
              target="_blank"
            >
              WhatsApp
            </a>
          ) : null}


          <Link
            className="landzo-detail-contact-button is-enquiry"
            to={`/contact?property=${encodeURIComponent(
              property.code,
            )}`}
          >
            Send Enquiry
          </Link>

        </section>

      </main>
    );
  };