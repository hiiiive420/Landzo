import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useSearchParams,
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
  submitPublicEnquiry,
} from "../../api/publicEnquiries.api";

import {
  getPublicProperty,
} from "../../api/publicProperties.api";

import {
  getPublicContactSettings,
} from "../../api/publicSettings.api";


/* =========================================================
   FORM
   ========================================================= */

const defaultForm = {
  fullName: "",
  email: "",
  phone: "",
  preferredContactMethod:
    "whatsapp",
  interestType:
    "this_property",
  siteVisitDate: "",
  message: "",
};


const cleanPropertyCode = (
  value,
) =>
  value
    ?.trim?.()
    .toUpperCase() ||
  "";


const toReadableError = (
  error,
) => {
  const code =
    error.response
      ?.data?.code;

  if (
    code ===
    "PUBLIC_ENQUIRY_PROPERTY_NOT_FOUND"
  ) {
    return "That property is not available for enquiries.";
  }

  return getPublicApiErrorMessage(
    error,
  );
};


/* =========================================================
   LABELS
   ========================================================= */

const transactionLabels = {
  sale: "Sale",
  rent: "Rent",
  lease: "Lease",
};


const typeLabels = {
  land: "Land",
  house: "House",
  apartment: "Apartment",
  commercial: "Commercial",
};


const interestLabels = {
  this_property:
    "This Property Only",

  similar_properties:
    "Similar Properties",

  general_consultation:
    "General Consultation",
};


const contactMethodLabels = {
  whatsapp: "WhatsApp",
  phone: "Phone Call",
  email: "Email",
};


/* =========================================================
   ICONS
   ========================================================= */

const SearchIcon = () => (
  <svg
    aria-hidden="true"
    className="landzo-properties-search-icon"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <circle
      cx="10.8"
      cy="10.8"
      fill="none"
      r="6.2"
      stroke="currentColor"
      strokeWidth="1.65"
    />

    <path
      d="m15.4 15.4 4.2 4.2"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.65"
    />
  </svg>
);


const TuneIcon = () => (
  <svg
    aria-hidden="true"
    className="landzo-properties-tune-icon"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <path
      d="
        M4 7h8
        M16 7h4
        M4 12h3
        M11 12h9
        M4 17h10
        M18 17h2
      "
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.6"
    />

    <circle
      cx="14"
      cy="7"
      fill="none"
      r="2"
      stroke="currentColor"
      strokeWidth="1.5"
    />

    <circle
      cx="9"
      cy="12"
      fill="none"
      r="2"
      stroke="currentColor"
      strokeWidth="1.5"
    />

    <circle
      cx="16"
      cy="17"
      fill="none"
      r="2"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);


const ChatIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
  >
    <path
      d="M5 5.5h14v10H9l-4 3v-13Z"
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
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
      fill="none"
      r="2.2"
      stroke="currentColor"
      strokeWidth="1.6"
    />
  </svg>
);


const UserIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
  >
    <circle
      cx="12"
      cy="8"
      r="3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />

    <path
      d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
  </svg>
);


const PhoneIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
  >
    <path
      d="M7.2 4.5 5 6c-.8.5-1 1.4-.7 2.2 2 4.9 6 8.9 10.9 10.9.8.3 1.7.1 2.2-.7l1.6-2.3-4.1-2.8-1.7 2a12 12 0 0 1-4.8-4.8l2-1.7-3.2-4.3Z"
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);


const MailIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
  >
    <rect
      x="4"
      y="6"
      width="16"
      height="12"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />

    <path
      d="m5.5 8 6.5 5 6.5-5"
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);


const CalendarIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
  >
    <rect
      x="4"
      y="6"
      width="16"
      height="14"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />

    <path
      d="M8 3v5M16 3v5M4 10h16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
  </svg>
);


const ShieldIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
  >
    <path
      d="M12 3 19 6v5c0 4.5-2.5 7.6-7 10-4.5-2.4-7-5.5-7-10V6l7-3Z"
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />

    <path
      d="m9 12 2 2 4-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
  </svg>
);


const WhatsAppIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
  >
    <path
      d="M20 11.7a8 8 0 0 1-11.7 7.1L4 20l1.2-4.1A8 8 0 1 1 20 11.7Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />

    <path
      d="M8.5 8.4c.5 2.7 2.5 4.8 5.2 5.3"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.5"
    />
  </svg>
);


/* =========================================================
   PROPERTY HELPERS
   ========================================================= */

const humanize = (
  value,
) => {
  if (!value) {
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
      .toLowerCase();

  const labels = {
    perch: "Perches",
    acre: "Acres",
    square_feet: "Sq.ft",
    squarefeet: "Sq.ft",
    sqft: "Sq.ft",
    square_meter: "Sq.m",
    squaremeter: "Sq.m",
    sqm: "Sq.m",
  };

  return `${value} ${
    labels[normalized] ||
    humanize(unit)
  }`;
};


const getLocationLabel = (
  property,
) => {
  const location =
    property?.location || {};

  return (
    location.displayAddress ||
    [
      location.area?.name,
      location.city?.name,
      location.district?.name,
      location.province?.name,
    ]
      .filter(Boolean)
      .join(", ")
  );
};


const getPriceLabel = (
  property,
) => {
  const pricing =
    property?.pricing;

  if (!pricing) {
    return "";
  }

  if (!pricing.priceVisible) {
    return "Price on request";
  }

  const transactionType =
    property
      ?.transactionTypes?.[0];

  const section =
    pricing[
      transactionType
    ] ||
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

  return new Intl.NumberFormat(
    "en-LK",
    {
      style: "currency",
      currency:
        pricing.currency ||
        "LKR",
      maximumFractionDigits: 0,
    },
  ).format(
    section.amount,
  );
};


const getPropertyDetailItems = (
  property,
) => {
  const type =
    property?.type;

  const details =
    property
      ?.details?.[type] ||
    {};

  const items = [];

  if (type === "land") {
    const size =
      formatSize(
        details.landSize,
        details.landSizeUnit,
      );

    if (size) {
      items.push(size);
    }

    if (details.landType) {
      items.push(
        humanize(
          details.landType,
        ),
      );
    }

    if (details.roadWidth) {
      items.push(
        `${details.roadWidth} ft Road`,
      );
    }
  }

  if (type === "house") {
    if (details.bedrooms) {
      items.push(
        `${details.bedrooms} Beds`,
      );
    }

    if (details.bathrooms) {
      items.push(
        `${details.bathrooms} Baths`,
      );
    }

    if (details.floors) {
      items.push(
        `${details.floors} Floors`,
      );
    }
  }

  if (type === "apartment") {
    if (details.bedrooms) {
      items.push(
        `${details.bedrooms} Beds`,
      );
    }

    if (details.bathrooms) {
      items.push(
        `${details.bathrooms} Baths`,
      );
    }

    if (details.floorNumber) {
      items.push(
        `Floor ${details.floorNumber}`,
      );
    }
  }

  if (type === "commercial") {
    if (
      details.commercialType
    ) {
      items.push(
        humanize(
          details.commercialType,
        ),
      );
    }

    const area =
      formatSize(
        details.floorArea,
        details.floorAreaUnit,
      );

    if (area) {
      items.push(area);
    }

    if (
      details.floorNumber
    ) {
      items.push(
        `Floor ${details.floorNumber}`,
      );
    }
  }

  return items.slice(0, 3);
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
    propertyCode
      ? `Hello LANDZO, I am interested in property ${propertyCode}.`
      : "Hello LANDZO, I would like to enquire about a property.";

  return `https://wa.me/${digits}?text=${encodeURIComponent(
    text,
  )}`;
};


/* =========================================================
   PAGE
   ========================================================= */

export const PublicContactPage =
  () => {
    const [
      searchParams,
    ] =
      useSearchParams();

    const navigate =
      useNavigate();

    const propertyCode =
      cleanPropertyCode(
        searchParams.get(
          "property",
        ),
      );


    const [
      form,
      setForm,
    ] = useState(
      defaultForm,
    );


    const [
      settings,
      setSettings,
    ] = useState(null);


    const [
      property,
      setProperty,
    ] = useState(null);


    const [
      isLoadingSettings,
      setIsLoadingSettings,
    ] = useState(true);


    const [
      isLoadingProperty,
      setIsLoadingProperty,
    ] = useState(
      Boolean(propertyCode),
    );


    const [
      isSubmitting,
      setIsSubmitting,
    ] = useState(false);


    const [
      error,
      setError,
    ] = useState("");


    const [
      propertyError,
      setPropertyError,
    ] = useState("");


    const [
      success,
      setSuccess,
    ] = useState("");


    const [
      propertySearch,
      setPropertySearch,
    ] = useState("");


    const [
      showGuidelines,
      setShowGuidelines,
    ] = useState(false);


    /* =====================================================
       SETTINGS
       ===================================================== */

    useEffect(() => {
      let ignore = false;

      const loadSettings =
        async () => {
          try {
            setIsLoadingSettings(
              true,
            );

            const loadedSettings =
              await getPublicContactSettings();

            if (!ignore) {
              setSettings(
                loadedSettings,
              );
            }
          } catch {
            if (!ignore) {
              setSettings(null);
            }
          } finally {
            if (!ignore) {
              setIsLoadingSettings(
                false,
              );
            }
          }
        };

      void loadSettings();

      return () => {
        ignore = true;
      };
    }, []);


    /* =====================================================
       PROPERTY
       ===================================================== */

    useEffect(() => {
      let ignore = false;

      const loadProperty =
        async () => {
          if (!propertyCode) {
            setProperty(null);

            setPropertyError(
              "",
            );

            setIsLoadingProperty(
              false,
            );

            return;
          }

          try {
            setIsLoadingProperty(
              true,
            );

            setPropertyError(
              "",
            );

            const loadedProperty =
              await getPublicProperty(
                propertyCode,
              );

            if (!ignore) {
              setProperty(
                loadedProperty,
              );
            }
          } catch {
            if (!ignore) {
              setProperty(null);

              setPropertyError(
                "This property is not available for enquiries.",
              );
            }
          } finally {
            if (!ignore) {
              setIsLoadingProperty(
                false,
              );
            }
          }
        };

      void loadProperty();

      return () => {
        ignore = true;
      };
    }, [
      propertyCode,
    ]);


    /* =====================================================
       WHATSAPP
       ===================================================== */

    const whatsappHref =
      useMemo(
        () =>
          buildWhatsAppHref({
            phone:
              settings
                ?.business
                ?.whatsapp,

            propertyCode:
              property?.code ||
              propertyCode,
          }),
        [
          property?.code,
          propertyCode,
          settings
            ?.business
            ?.whatsapp,
        ],
      );


    /* =====================================================
       PROPERTY DISPLAY
       ===================================================== */

    const coverImage =
      property?.media
        ?.coverImage ??
      property?.media
        ?.images?.find(
          (image) =>
            image.isCover,
        ) ??
      property?.media
        ?.images?.[0] ??
      null;


    const transactionType =
      property
        ?.transactionTypes?.[0];


    const transactionLabel =
      transactionLabels[
        transactionType
      ] ||
      transactionType;


    const propertyDetails =
      property
        ? getPropertyDetailItems(
            property,
          )
        : [];


    const locationLabel =
      property
        ? getLocationLabel(
            property,
          )
        : "";


    const priceLabel =
      property
        ? getPriceLabel(
            property,
          )
        : "";


    /* =====================================================
       FORM
       ===================================================== */

    const updateField = (
      field,
      value,
    ) => {
      setForm(
        (current) => ({
          ...current,
          [field]: value,
        }),
      );

      setError("");
      setSuccess("");
    };


    const handleSearch = (
      event,
    ) => {
      event.preventDefault();

      const value =
        propertySearch.trim();

      if (!value) {
        navigate(
          "/properties",
        );

        return;
      }

      navigate(
        `/properties?search=${encodeURIComponent(
          value,
        )}`,
      );
    };


    const handleSubmit =
      async (
        event,
      ) => {
        event.preventDefault();

        setIsSubmitting(
          true,
        );

        setError("");
        setSuccess("");


        /*
         * Keep API schema compatible.
         * New design-only fields are
         * appended to message.
         */

        const extraContext = [
          `Preferred contact: ${
            contactMethodLabels[
              form.preferredContactMethod
            ]
          }`,

          `Interest: ${
            interestLabels[
              form.interestType
            ]
          }`,

          form.siteVisitDate
            ? `Preferred site visit date: ${form.siteVisitDate}`
            : null,
        ]
          .filter(Boolean)
          .join("\n");


        const finalMessage = [
          form.message.trim(),
          extraContext,
        ]
          .filter(Boolean)
          .join("\n\n");


        const payload = {
          fullName:
            form.fullName,

          email:
            form.email ||
            undefined,

          phone:
            form.phone ||
            undefined,

          message:
            finalMessage ||
            undefined,

          ...(propertyCode
            ? {
                propertyCode,
              }
            : {}),
        };


        try {
          await submitPublicEnquiry(
            payload,
          );

          setSuccess(
            "Your enquiry has been submitted. LANDZO will contact you soon.",
          );

          setForm(
            defaultForm,
          );
        } catch (
          requestError
        ) {
          setError(
            toReadableError(
              requestError,
            ),
          );
        } finally {
          setIsSubmitting(
            false,
          );
        }
      };


    const handleWhatsAppClick =
      () => {
        recordAnalyticsEventSafely({
          eventType:
            analyticsEventTypes
              .whatsappClick,

          propertyId:
            property?.id,

          context: {
            surface:
              property?.id
                ? analyticsSurfaces
                    .propertyDetail
                : analyticsSurfaces
                    .enquiry,
          },
        });
      };


    return (
      <main className="landzo-enquiry-page">

        {/* ===============================================
            SAME SEARCH HEADER AS PROPERTIES
            =============================================== */}

        <section className="public-properties-hero landzo-properties-hero landzo-enquiry-search-hero">

          <div
            aria-hidden="true"
            className="landzo-properties-hero-overlay"
          />


          <form
            className="landzo-properties-search-form landzo-enquiry-search-form"
            onSubmit={
              handleSearch
            }
          >
            <SearchIcon />


            <input
              aria-label="Search properties"
              maxLength={80}
              onChange={(
                event,
              ) =>
                setPropertySearch(
                  event.target.value,
                )
              }
              placeholder="Search location, property code or keyword..."
              type="search"
              value={
                propertySearch
              }
            />


            <button
              aria-label="Search properties"
              className="landzo-properties-search-filter"
              type="submit"
            >
              <TuneIcon />
            </button>

          </form>

        </section>


        <div className="landzo-enquiry-container">

          {/* =============================================
              PAGE HEADING
              ============================================= */}

          <section className="landzo-enquiry-heading">

            <div className="landzo-enquiry-heading-icon">
              <ChatIcon />
            </div>


            <div className="landzo-enquiry-heading-copy">

              <h1>
                Enquire About a Property
              </h1>

              <p>
                Get in touch with our team for more details.
              </p>

            </div>


            <button
              className="landzo-enquiry-guidelines-button"
              onClick={() =>
                setShowGuidelines(
                  (current) =>
                    !current,
                )
              }
              type="button"
            >
              Enquiry Guidelines
            </button>

          </section>


          {showGuidelines ? (
            <div className="landzo-enquiry-guidelines">

              <strong>
                Before sending your enquiry
              </strong>

              <p>
                Provide accurate contact details and a short description of what you need. Property-specific enquiries will automatically include the property code.
              </p>

            </div>
          ) : null}


          {/* =============================================
              PROPERTY SUMMARY
              ============================================= */}

          {isLoadingProperty ? (
            <div className="landzo-enquiry-property-loading">
              Loading property...
            </div>
          ) : null}


          {!isLoadingProperty &&
          property ? (
            <section className="landzo-enquiry-property-card">

              <div className="landzo-enquiry-property-media">

                {coverImage?.url ? (
                  <img
                    alt={
                      property.title ||
                      "LANDZO property"
                    }
                    src={
                      coverImage.url
                    }
                  />
                ) : (
                  <div className="landzo-enquiry-property-fallback" />
                )}


                {transactionLabel ? (
                  <span className={`landzo-enquiry-property-transaction is-${transactionType}`}>
                    For{" "}
                    {
                      transactionLabel
                    }
                  </span>
                ) : null}

              </div>


              <div className="landzo-enquiry-property-copy">

                <div className="landzo-enquiry-property-topline">

                  {property.type ? (
                    <span className="landzo-enquiry-property-type">
                      {typeLabels[
                        property.type
                      ] ||
                        property.type}
                    </span>
                  ) : null}


                  <span className="landzo-enquiry-property-code">
                    {
                      property.code
                    }
                  </span>

                </div>


                <h2>
                  {
                    property.title
                  }
                </h2>


                {locationLabel ? (
                  <p className="landzo-enquiry-property-location">
                    <LocationIcon />

                    <span>
                      {
                        locationLabel
                      }
                    </span>
                  </p>
                ) : null}


                {propertyDetails.length ? (
                  <div className="landzo-enquiry-property-details">

                    {propertyDetails.map(
                      (
                        item,
                        index,
                      ) => (
                        <span
                          key={`${item}-${index}`}
                        >
                          {
                            item
                          }
                        </span>
                      ),
                    )}

                  </div>
                ) : null}


                {priceLabel ? (
                  <strong className="landzo-enquiry-property-price">
                    {
                      priceLabel
                    }
                  </strong>
                ) : null}

              </div>

            </section>
          ) : null}


          {!isLoadingProperty &&
          propertyError ? (
            <div className="public-form-error">
              {
                propertyError
              }
            </div>
          ) : null}


          {/* =============================================
              FORM
              ============================================= */}

          <form
            className="landzo-enquiry-form"
            id="landzo-enquiry-form"
            onSubmit={
              handleSubmit
            }
          >

            <h2>
              Your Information
            </h2>


            <div className="landzo-enquiry-two-column">

              <label>
                <span>
                  Full Name
                  <b>*</b>
                </span>

                <div className="landzo-enquiry-input">

                  <UserIcon />

                  <input
                    autoComplete="name"
                    maxLength={120}
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "fullName",
                        event.target.value,
                      )
                    }
                    placeholder="Enter your full name"
                    required
                    type="text"
                    value={
                      form.fullName
                    }
                  />

                </div>
              </label>


              <label>
                <span>
                  Phone Number
                  <b>*</b>
                </span>

                <div className="landzo-enquiry-input">

                  <PhoneIcon />

                  <input
                    autoComplete="tel"
                    maxLength={40}
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "phone",
                        event.target.value,
                      )
                    }
                    placeholder="07X XXX XXXX"
                    required
                    type="tel"
                    value={
                      form.phone
                    }
                  />

                </div>
              </label>

            </div>


            <label>
              <span>
                Email Address
              </span>

              <div className="landzo-enquiry-input">

                <MailIcon />

                <input
                  autoComplete="email"
                  maxLength={254}
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "email",
                      event.target.value,
                    )
                  }
                  placeholder="Enter your email address"
                  type="email"
                  value={
                    form.email
                  }
                />

              </div>
            </label>


            <label>
              <span>
                Preferred Contact Method
                <b>*</b>
              </span>

              <select
                className="landzo-enquiry-select"
                onChange={(
                  event,
                ) =>
                  updateField(
                    "preferredContactMethod",
                    event.target.value,
                  )
                }
                required
                value={
                  form.preferredContactMethod
                }
              >
                <option value="whatsapp">
                  WhatsApp
                </option>

                <option value="phone">
                  Phone Call
                </option>

                <option value="email">
                  Email
                </option>
              </select>
            </label>


            {/* INTEREST */}

            <div className="landzo-enquiry-interest">

              <span className="landzo-enquiry-label">
                I'm Interested In
                <b>*</b>
              </span>


              <div className="landzo-enquiry-interest-grid">

                {Object.entries(
                  interestLabels,
                ).map(
                  ([
                    value,
                    label,
                  ]) => (

                    <label
                      className={[
                        "landzo-enquiry-interest-option",

                        form.interestType ===
                        value
                          ? "is-active"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={
                        value
                      }
                    >

                      <input
                        checked={
                          form.interestType ===
                          value
                        }
                        name="interestType"
                        onChange={() =>
                          updateField(
                            "interestType",
                            value,
                          )
                        }
                        type="radio"
                        value={
                          value
                        }
                      />

                      <span>
                        {
                          label
                        }
                      </span>

                    </label>

                  ),
                )}

              </div>

            </div>


            {/* SITE VISIT */}

            <label>
              <span>
                Preferred Site Visit Date
              </span>

              <div className="landzo-enquiry-input">

                <CalendarIcon />

                <input
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "siteVisitDate",
                      event.target.value,
                    )
                  }
                  type="date"
                  value={
                    form.siteVisitDate
                  }
                />

              </div>
            </label>


            {/* MESSAGE */}

            <label>
              <span>
                Your Message
                <b>*</b>
              </span>

              <textarea
                maxLength={5000}
                onChange={(
                  event,
                ) =>
                  updateField(
                    "message",
                    event.target.value,
                  )
                }
                placeholder="Tell us more about your requirements..."
                required
                rows={5}
                value={
                  form.message
                }
              />
            </label>


            {/* PRIVACY */}

            <p className="landzo-enquiry-security-note">
              <ShieldIcon />

              <span>
                Your information is secure and will never be shared with third parties.
              </span>
            </p>


            {error ? (
              <div className="public-form-error">
                {error}
              </div>
            ) : null}


            {success ? (
              <div className="public-form-success">
                {success}
              </div>
            ) : null}


            <button
              className="landzo-enquiry-submit"
              disabled={
                isSubmitting
              }
              type="submit"
            >
              <span
                aria-hidden="true"
              >
                ➤
              </span>

              {isSubmitting
                ? "Sending Enquiry..."
                : "Send Enquiry"}
            </button>

          </form>


          {/* =============================================
              WHATSAPP
              ============================================= */}

          {whatsappHref ? (
            <section className="landzo-enquiry-whatsapp-card">

              <div className="landzo-enquiry-whatsapp-icon">
                <WhatsAppIcon />
              </div>


              <div className="landzo-enquiry-whatsapp-copy">

                <strong>
                  Want to talk directly?
                </strong>

                <span>
                  Chat with our team on WhatsApp for faster assistance.
                </span>

              </div>


              <a
                href={
                  whatsappHref
                }
                onClick={
                  handleWhatsAppClick
                }
                rel="noreferrer"
                target="_blank"
              >
                <WhatsAppIcon />

                Chat on WhatsApp
              </a>

            </section>
          ) : null}


          {!isLoadingSettings &&
          !settings ? (
            <p className="landzo-enquiry-settings-error">
              Contact details are temporarily unavailable.
            </p>
          ) : null}

        </div>

      </main>
    );
  };