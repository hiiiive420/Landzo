import {
  Link,
} from "react-router-dom";

import {
  analyticsSurfaces,
} from "../../api/analytics.api";

import {
  SavePropertyButton,
} from "./SavePropertyButton";


/* =========================================================
   LABELS
   ========================================================= */

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


const leasePeriodSuffixes = {
  monthly: " / month",
  annual: " / year",
  total: " total lease",
};


const pricingLabels = {
  fixed: "Fixed price",
  negotiable: "Negotiable",
  price_on_request:
    "Price on request",
};


/* =========================================================
   GENERIC FORMATTERS
   ========================================================= */

const humanizeValue = (
  value,
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "";
  }

  return String(value)
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
};


const normalizeOptionValue = (
  value,
) =>
  String(value || "")
    .trim()
    .replace(
      /([a-z0-9])([A-Z])/g,
      "$1_$2",
    )
    .replace(
      /[\s-]+/g,
      "_",
    )
    .toLowerCase();


const formatSizeUnit = (
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

  const normalizedUnit =
    normalizeOptionValue(
      unit,
    );


  const unitLabels = {
    perch: "Perch",
    perches: "Perches",

    acre: "Acre",
    acres: "Acres",

    square_feet: "Sq.ft",
    square_foot: "Sq.ft",
    sqft: "Sq.ft",
    sq_ft: "Sq.ft",

    square_meter: "Sq.m",
    square_meters: "Sq.m",
    sqm: "Sq.m",
    sq_m: "Sq.m",
  };


  let displayUnit =
    unitLabels[
      normalizedUnit
    ] ||
    humanizeValue(
      unit,
    );


  if (
    Number(value) !== 1
  ) {
    if (
      normalizedUnit ===
      "perch"
    ) {
      displayUnit =
        "Perches";
    }

    if (
      normalizedUnit ===
      "acre"
    ) {
      displayUnit =
        "Acres";
    }
  }


  return [
    value,
    displayUnit,
  ]
    .filter(Boolean)
    .join(" ");
};

/* =========================================================
   PRICE
   ========================================================= */

const formatAmount = (
  amount,
  currency,
) => {
  if (
    !Number.isFinite(amount)
  ) {
    return null;
  }


  return new Intl.NumberFormat(
    "en-LK",
    {
      currency:
        currency ||
        "LKR",

      maximumFractionDigits:
        0,

      style:
        "currency",
    },
  ).format(amount);
};


const getPriceLabel = (
  property,
) => {
  const pricing =
    property.pricing;


  if (!pricing) {
    return "";
  }


  if (
    !pricing.priceVisible
  ) {
    return "Price on request";
  }


  const transactionType =
    property
      .transactionTypes?.[0];


  const section =
    pricing[
      transactionType
    ] ||
    pricing.sale ||
    pricing.rent ||
    pricing.lease;


  if (!section) {
    return "";
  }


  const amount =
    formatAmount(
      section.amount,
      pricing.currency,
    );


  if (amount) {
    const suffix =
      transactionType ===
      "lease"
        ? leasePeriodSuffixes[
            section.period
          ] || ""
        : "";

    return `${amount}${suffix}`;
  }


  return (
    pricingLabels[
      section.mode
    ] ||
    ""
  );
};


/* =========================================================
   LOCATION
   ========================================================= */

const getLocationLabel = (
  property,
) => {
  const location =
    property.location ||
    {};


  return (
    location.displayAddress ||
    location.area?.name ||
    location.city?.name ||
    location.district?.name ||
    location.province?.name ||
    ""
  );
};


/* =========================================================
   TRANSACTION
   ========================================================= */

const getPrimaryTransaction =
  (property) =>
    property
      .transactionTypes?.[0] ||
    "";


const getTransactionLabel = (
  transactionType,
) =>
  transactionLabels[
    transactionType
  ] ||
  transactionType;


/* =========================================================
   ADMIN PROPERTY DETAIL MAPPING

   These field names match DetailsFields.jsx.

   LAND
   ---------------------------------------------------------
   landSize
   landSizeUnit
   landType
   roadWidth
   roadAccess
   utilities[]

   HOUSE
   ---------------------------------------------------------
   bedrooms
   bathrooms
   floors
   landSize
   landSizeUnit
   houseSize
   houseSizeUnit
   parkingSpaces
   furnishedStatus

   APARTMENT
   ---------------------------------------------------------
   bedrooms
   bathrooms
   floorNumber
   totalFloors
   unitSize
   unitSizeUnit
   parkingSpaces
   furnishedStatus

   COMMERCIAL
   ---------------------------------------------------------
   commercialType
   floorArea
   floorAreaUnit
   floorNumber
   parkingSpaces
   ========================================================= */

const getPropertyDetailItems = (
  property,
) => {
  const type =
    property?.type;


  const details =
    property?.details?.[
      type
    ] || {};


  const items = [];


  /* =====================================================
     LAND
     ===================================================== */

  if (type === "land") {

    const landSize =
      formatSizeUnit(
        details.landSize,
        details.landSizeUnit,
      );


    if (landSize) {
      items.push(
        landSize,
      );
    }


    if (
      details.landType
    ) {
      items.push(
        humanizeValue(
          details.landType,
        ),
      );
    }


    /*
     * Example:
     * roadWidth = 56
     * roadAccess = true
     *
     * Output:
     * 56 ft Road
     */

    if (
      details.roadWidth
    ) {
      items.push(
        `${details.roadWidth} ft Road`,
      );
    } else if (
      details.roadAccess
    ) {
      items.push(
        "Road Access",
      );
    }


    const utilities =
      Array.isArray(
        details.utilities,
      )
        ? details.utilities
        : [];


    if (
      utilities.includes(
        "water",
      )
    ) {
      items.push(
        "Water",
      );
    }


    if (
      utilities.includes(
        "electricity",
      )
    ) {
      items.push(
        "Electricity",
      );
    }


    /*
     * Avoid duplicating Road
     * when roadWidth or
     * roadAccess already exists.
     */

    if (
      utilities.includes(
        "road",
      ) &&
      !details.roadAccess &&
      !details.roadWidth
    ) {
      items.push(
        "Road",
      );
    }
  }


  /* =====================================================
     HOUSE
     ===================================================== */

  if (type === "house") {

    if (
      details.bedrooms
    ) {
      items.push(
        `${details.bedrooms} ${
          Number(
            details.bedrooms,
          ) === 1
            ? "Bed"
            : "Beds"
        }`,
      );
    }


    if (
      details.bathrooms
    ) {
      items.push(
        `${details.bathrooms} ${
          Number(
            details.bathrooms,
          ) === 1
            ? "Bath"
            : "Baths"
        }`,
      );
    }


    if (
      details.floors
    ) {
      items.push(
        `${details.floors} ${
          Number(
            details.floors,
          ) === 1
            ? "Floor"
            : "Floors"
        }`,
      );
    }


    const landSize =
      formatSizeUnit(
        details.landSize,
        details.landSizeUnit,
      );


    if (landSize) {
      items.push(
        `Land ${landSize}`,
      );
    }


    const houseSize =
      formatSizeUnit(
        details.houseSize,
        details.houseSizeUnit,
      );


    if (houseSize) {
      items.push(
        `House ${houseSize}`,
      );
    }


    if (
      details.parkingSpaces
    ) {
      items.push(
        `${details.parkingSpaces} Parking`,
      );
    }


    if (
      details.furnishedStatus
    ) {
      items.push(
        humanizeValue(
          details.furnishedStatus,
        ),
      );
    }
  }


  /* =====================================================
     APARTMENT
     ===================================================== */

  if (
    type ===
    "apartment"
  ) {

    if (
      details.bedrooms
    ) {
      items.push(
        `${details.bedrooms} ${
          Number(
            details.bedrooms,
          ) === 1
            ? "Bed"
            : "Beds"
        }`,
      );
    }


    if (
      details.bathrooms
    ) {
      items.push(
        `${details.bathrooms} ${
          Number(
            details.bathrooms,
          ) === 1
            ? "Bath"
            : "Baths"
        }`,
      );
    }


    if (
      details.floorNumber
    ) {
      items.push(
        `Floor ${details.floorNumber}`,
      );
    }


    if (
      details.totalFloors
    ) {
      items.push(
        `${details.totalFloors} Total Floors`,
      );
    }


    const unitSize =
      formatSizeUnit(
        details.unitSize,
        details.unitSizeUnit,
      );


    if (unitSize) {
      items.push(
        unitSize,
      );
    }


    if (
      details.parkingSpaces
    ) {
      items.push(
        `${details.parkingSpaces} Parking`,
      );
    }


    if (
      details.furnishedStatus
    ) {
      items.push(
        humanizeValue(
          details.furnishedStatus,
        ),
      );
    }
  }


  /* =====================================================
     COMMERCIAL
     ===================================================== */

  if (
    type ===
    "commercial"
  ) {

    if (
      details.commercialType
    ) {
      items.push(
        humanizeValue(
          details.commercialType,
        ),
      );
    }


    const floorArea =
      formatSizeUnit(
        details.floorArea,
        details.floorAreaUnit,
      );


    if (floorArea) {
      items.push(
        floorArea,
      );
    }


    if (
      details.floorNumber
    ) {
      items.push(
        `Floor ${details.floorNumber}`,
      );
    }


    if (
      details.parkingSpaces
    ) {
      items.push(
        `${details.parkingSpaces} Parking`,
      );
    }
  }


  return items
    .filter(Boolean)
    .slice(0, 5);
};


/* =========================================================
   STANDARD PROPERTY CARD
   HOME FEATURED + PROPERTIES PAGE
   ========================================================= */

const StandardPropertyCard = ({
  property,
  coverImage,
  detailPath,
  locationLabel,
  priceLabel,
  detailItems,
}) => {
  const transactionType =
    getPrimaryTransaction(
      property,
    );

  const transactionLabel =
    getTransactionLabel(
      transactionType,
    );

  return (
    <>

      <Link
        className="public-property-card-link"
        to={detailPath}
      >

        {/* IMAGE */}
        <div className="public-property-card-media">

          {coverImage?.url ? (
            <img
              alt={
                property.title ||
                "LANDZO property"
              }
              loading="lazy"
              src={coverImage.url}
            />
          ) : (
            <div
              aria-hidden="true"
              className="public-property-card-fallback"
            />
          )}


          {/* FOR SALE / RENT / LEASE */}
          {transactionLabel ? (
            <span
              className={[
                "public-property-card-transaction",

                transactionType
                  ? `is-${transactionType}`
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              For {transactionLabel}
            </span>
          ) : null}

        </div>


        {/* BODY */}
        <div className="public-property-card-body">

          {/* TITLE + CODE */}
          <div className="public-property-card-heading">

            <h3>
              {property.title}
            </h3>


            {property.code ? (
              <span className="public-property-card-code">
                {property.code}
              </span>
            ) : null}

          </div>


          {/* LOCATION */}
          {locationLabel ? (
            <p className="public-property-card-location">
              {locationLabel}
            </p>
          ) : null}


          {/* ADMIN DETAILS */}
          {detailItems.length > 0 ? (
            <div className="public-property-card-details">

              {detailItems
                .slice(0, 5)
                .map(
                  (
                    item,
                    index,
                  ) => (
                    <span
                      key={`${item}-${index}`}
                    >
                      {item}
                    </span>
                  ),
                )}

            </div>
          ) : null}


          {/* PRICE */}
          <div className="public-property-card-bottom">

            {priceLabel ? (
              <strong>
                {priceLabel}
              </strong>
            ) : (
              <span />
            )}


            {/* TYPE + TRANSACTION TAGS */}
            <div className="public-property-card-tags">

              {property.type ? (
                <span>
                  {typeLabels[
                    property.type
                  ] ||
                    property.type}
                </span>
              ) : null}


              {transactionLabel ? (
                <span>
                  For {transactionLabel}
                </span>
              ) : null}

            </div>

          </div>

        </div>

      </Link>


      {/* HEART */}
      <SavePropertyButton
        className="public-property-card-save"
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
            .propertyListing
        }
      />

    </>
  );
};

/* =========================================================
   SAVED PROPERTY CARD
   ========================================================= */

const SavedPropertyCard = ({
  property,
  coverImage,
  detailPath,
  locationLabel,
  priceLabel,
  detailItems,
}) => {

  const transactionType =
    getPrimaryTransaction(
      property,
    );


  const transactionLabel =
    getTransactionLabel(
      transactionType,
    );


  return (
    <>

      {/* ===================================================
          IMAGE
          =================================================== */}

      <div className="landzo-saved-card-media">

        {coverImage?.url ? (
          <img
            alt={
              property.title ||
              "LANDZO property"
            }
            loading="lazy"
            src={
              coverImage.url
            }
          />
        ) : (
          <div
            aria-hidden="true"
            className="public-property-card-fallback"
          />
        )}


        {/* TRANSACTION BADGE */}

        {transactionLabel ? (
          <span
            className={[
              "landzo-saved-card-transaction",

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


        {/* SAVE HEART */}

        <SavePropertyButton
          className="landzo-saved-card-heart"
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
              .propertyListing
          }
        />

      </div>


      {/* ===================================================
          BODY
          =================================================== */}

      <div className="landzo-saved-card-body">


        {/* TITLE + CODE */}

        <div className="landzo-saved-card-heading">

          <h3>
            {property.title}
          </h3>


          {property.code ? (
            <span className="landzo-saved-card-code">
              {
                property.code
              }
            </span>
          ) : null}

        </div>


        {/* LOCATION */}

        {locationLabel ? (
          <p className="landzo-saved-card-location">
            {
              locationLabel
            }
          </p>
        ) : null}


        {/* =================================================
            TYPE-SPECIFIC DETAILS

            Saved card can show up to 5
            Admin details.
            ================================================= */}

        {detailItems.length >
        0 ? (

          <div className="landzo-saved-card-details">

            {detailItems.map(
              (
                item,
                index,
              ) => (

                <span
                  key={`${item}-${index}`}
                >
                  {item}
                </span>

              ),
            )}

          </div>

        ) : null}


        {/* PRICE */}

        <div className="landzo-saved-card-price">

          {priceLabel ? (
            <strong>
              {priceLabel}
            </strong>
          ) : null}

        </div>


        {/* TAGS */}

        <div className="landzo-saved-card-tags">

          {property.type ? (
            <span>

              {typeLabels[
                property.type
              ] ||
                property.type}

            </span>
          ) : null}


          {transactionLabel ? (
            <span>
              For{" "}
              {
                transactionLabel
              }
            </span>
          ) : null}

        </div>


        {/* ACTIONS */}

        <div className="landzo-saved-card-actions">

          <Link
            className="landzo-saved-map-button"
            to="/explore"
          >
            <span
              aria-hidden="true"
            >
              ⌖
            </span>

            View on Map
          </Link>


          <Link
            className="landzo-saved-details-button"
            to={detailPath}
          >
            View Details

            <span
              aria-hidden="true"
            >
              ›
            </span>
          </Link>

        </div>

      </div>

    </>
  );
};


/* =========================================================
   MAIN PROPERTY CARD
   ========================================================= */

export const PublicPropertyCard = ({
  property,
  variant = "default",
}) => {

  /* =======================================================
     IMAGE RESOLVER

     Home / Properties listing:
     property.coverImage

     Saved / Detail API:
     property.media.coverImage
     ======================================================= */

  const coverImage =
    property.coverImage ??
    property.media?.coverImage ??
    property.media?.images?.find(
      (image) =>
        image.isCover,
    ) ??
    property.media?.images?.[0] ??
    null;


  /* =======================================================
     SHARED DATA

     Calculate ONCE and provide to
     both card variants.
     ======================================================= */

  const detailItems =
    getPropertyDetailItems(
      property,
    );


  const locationLabel =
    getLocationLabel(
      property,
    );


  const priceLabel =
    getPriceLabel(
      property,
    );


  const detailPath =
    `/properties/${property.code}`;


  const isSavedVariant =
    variant === "saved";


  return (
    <article
      className={[
        "public-property-card",

        isSavedVariant
          ? "landzo-saved-property-card"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >

      {isSavedVariant ? (

        <SavedPropertyCard
          coverImage={
            coverImage
          }
          detailPath={
            detailPath
          }
          detailItems={
            detailItems
          }
          locationLabel={
            locationLabel
          }
          priceLabel={
            priceLabel
          }
          property={
            property
          }
        />

      ) : (

        <StandardPropertyCard
          coverImage={
            coverImage
          }
          detailPath={
            detailPath
          }
          detailItems={
            detailItems
          }
          locationLabel={
            locationLabel
          }
          priceLabel={
            priceLabel
          }
          property={
            property
          }
        />

      )}

    </article>
  );
};