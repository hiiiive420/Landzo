import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  getPublicProperty,
} from "../../api/publicProperties.api";

import {
  PublicPropertyCard,
} from "../components/PublicPropertyCard";

import {
  getSavedPropertyCodes,
  pruneSavedPropertyCodes,
  subscribeToSavedProperties,
} from "../../utils/savedProperties";


/* =========================================================
   HELPERS
   ========================================================= */

const getPropertyTypeKey = (
  property,
) => {
  const rawType =
    property?.type?.value ??
    property?.type?.slug ??
    property?.type?.name ??
    property?.type ??
    "";

  const value = String(
    rawType,
  )
    .trim()
    .toLowerCase();


  if (
    value.includes(
      "apartment",
    )
  ) {
    return "apartment";
  }


  if (
    value.includes(
      "commercial",
    )
  ) {
    return "commercial";
  }


  if (
    value.includes(
      "house",
    )
  ) {
    return "house";
  }


  if (
    value.includes(
      "land",
    )
  ) {
    return "land";
  }


  return "other";
};


const SavedHeartIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <path
      d="
        M12 20.3
        5.2 13.8
        A5.1 5.1 0 0 1
        12 6.7
        A5.1 5.1 0 0 1
        18.8 13.8
        Z
      "
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
  </svg>
);


const CardViewIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <rect
      x="4"
      y="5"
      width="16"
      height="14"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />

    <path
      d="M9 5v14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />
  </svg>
);


const MapViewIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <path
      d="
        M4 6.5
        9 4
        15 6.5
        20 4
        V17.5
        L15 20
        9 17.5
        4 20
        Z
      "
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />

    <path
      d="M9 4v13.5M15 6.5V20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    />
  </svg>
);


const SparkleIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <path
      d="
        M12 3
        c.7 4.2 2.8 6.3 7 7
        -4.2.7-6.3 2.8-7 7
        -.7-4.2-2.8-6.3-7-7
        4.2-.7 6.3-2.8 7-7Z
      "
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);


/* =========================================================
   FETCH SAVED PROPERTY
   ========================================================= */

const fetchSavedProperty =
  async (
    propertyCode,
  ) => {
    try {
      const property =
        await getPublicProperty(
          propertyCode,
        );

      return {
        property,
        propertyCode,
        status:
          "fulfilled",
      };
    } catch (error) {
      if (
        error.response?.status ===
        404
      ) {
        return {
          propertyCode,
          status:
            "unavailable",
        };
      }

      return {
        propertyCode,
        status:
          "failed",
      };
    }
  };


/* =========================================================
   PAGE
   ========================================================= */

export const PublicSavedPropertiesPage =
  () => {

    const [
      savedCodes,
      setSavedCodes,
    ] = useState(
      () =>
        getSavedPropertyCodes(),
    );


    const [
      properties,
      setProperties,
    ] = useState([]);


    const [
      isLoading,
      setIsLoading,
    ] = useState(true);


    const [
      failedCount,
      setFailedCount,
    ] = useState(0);


    const [
      activeType,
      setActiveType,
    ] = useState("all");


    const [
      sortMode,
      setSortMode,
    ] = useState("saved");


    const savedCodeKey =
      useMemo(
        () =>
          savedCodes.join("|"),
        [savedCodes],
      );


    /* =====================================================
       SAVED STORE SUBSCRIPTION
       ===================================================== */

    useEffect(
      () =>
        subscribeToSavedProperties(
          (codes) => {
            setSavedCodes(
              codes,
            );
          },
        ),
      [],
    );


    /* =====================================================
       LOAD SAVED PROPERTIES
       ===================================================== */

    useEffect(() => {
      let ignore = false;


      const loadSavedProperties =
        async () => {

          if (
            savedCodes.length ===
            0
          ) {
            setProperties([]);

            setFailedCount(0);

            setIsLoading(false);

            return;
          }


          setIsLoading(true);

          setFailedCount(0);


          const results =
            await Promise.all(
              savedCodes.map(
                (
                  propertyCode,
                ) =>
                  fetchSavedProperty(
                    propertyCode,
                  ),
              ),
            );


          if (ignore) {
            return;
          }


          const currentProperties =
            results

              .filter(
                (result) =>
                  result.status ===
                    "fulfilled" &&
                  result.property,
              )

              .map(
                (result) =>
                  result.property,
              );


          const unavailableCodes =
            results

              .filter(
                (result) =>
                  result.status ===
                  "unavailable",
              )

              .map(
                (result) =>
                  result.propertyCode,
              );


          const failedLookups =
            results.filter(
              (result) =>
                result.status ===
                "failed",
            ).length;


          setProperties(
            currentProperties,
          );

          setFailedCount(
            failedLookups,
          );

          setIsLoading(false);


          if (
            unavailableCodes.length >
            0
          ) {
            pruneSavedPropertyCodes(
              savedCodes.filter(
                (
                  propertyCode,
                ) =>
                  !unavailableCodes.includes(
                    propertyCode,
                  ),
              ),
            );
          }
        };


      void loadSavedProperties();


      return () => {
        ignore = true;
      };
    }, [
      savedCodeKey,
      savedCodes,
    ]);


    /* =====================================================
       COUNTS
       ===================================================== */

    const typeCounts =
      useMemo(() => {

        const counts = {
          all:
            properties.length,

          land: 0,

          house: 0,

          apartment: 0,

          commercial: 0,
        };


        properties.forEach(
          (property) => {

            const type =
              getPropertyTypeKey(
                property,
              );


            if (
              Object.hasOwn(
                counts,
                type,
              )
            ) {
              counts[type] += 1;
            }
          },
        );


        return counts;
      }, [
        properties,
      ]);


    /* =====================================================
       FILTER + SORT
       ===================================================== */

    const visibleProperties =
      useMemo(() => {

        let next =
          activeType ===
          "all"

            ? [...properties]

            : properties.filter(
                (
                  property,
                ) =>
                  getPropertyTypeKey(
                    property,
                  ) ===
                  activeType,
              );


        if (
          sortMode ===
          "title"
        ) {
          next.sort(
            (a, b) =>
              String(
                a?.title ?? "",
              ).localeCompare(
                String(
                  b?.title ?? "",
                ),
              ),
          );
        }


        return next;
      }, [
        properties,
        activeType,
        sortMode,
      ]);


    const filterItems = [
      {
        key: "all",
        label: "All",
      },
      {
        key: "land",
        label: "Land",
      },
      {
        key: "house",
        label: "House",
      },
      {
        key: "apartment",
        label: "Apartment",
      },
      {
        key: "commercial",
        label: "Commercial",
      },
    ];


    /* =====================================================
       RENDER
       ===================================================== */

    return (
      <section className="public-section landzo-saved-page">

        <div className="public-container landzo-saved-container">


          {/* ===============================================
              PAGE HEADING
              =============================================== */}

          <div className="landzo-saved-heading">

            <div className="landzo-saved-heading-copy">

              <h1>
                Saved Properties
              </h1>

              <p>
                Properties you've
                saved for later
              </p>

            </div>


            <div className="landzo-saved-count">

              <SavedHeartIcon />

              <span>
                {properties.length}
                {" "}
                Saved
              </span>

            </div>

          </div>


          {/* ===============================================
              TYPE FILTER
              =============================================== */}

          <div className="landzo-saved-type-tabs">

            {filterItems.map(
              (item) => (

                <button
                  className={
                    activeType ===
                    item.key
                      ? "is-active"
                      : ""
                  }
                  key={
                    item.key
                  }
                  onClick={() =>
                    setActiveType(
                      item.key,
                    )
                  }
                  type="button"
                >
                  {item.label}

                  <span>
                    (
                    {
                      typeCounts[
                        item.key
                      ]
                    }
                    )
                  </span>
                </button>

              ),
            )}

          </div>


          {/* ===============================================
              TOOLBAR
              =============================================== */}

          <div className="landzo-saved-toolbar">

            <label className="landzo-saved-sort">

              <span>
                ↕ Sort:
              </span>

              <select
                onChange={(
                  event,
                ) =>
                  setSortMode(
                    event.target
                      .value,
                  )
                }
                value={
                  sortMode
                }
              >
                <option value="saved">
                  Recently Saved
                </option>

                <option value="title">
                  Name A–Z
                </option>
              </select>

            </label>


            <div className="landzo-saved-view-toggle">

              <button
                aria-label="Card view"
                className="is-active"
                type="button"
              >
                <CardViewIcon />

                <span>
                  Card
                </span>
              </button>


              <Link
                aria-label="Open map"
                to="/explore"
              >
                <MapViewIcon />

                <span>
                  Map
                </span>
              </Link>

            </div>

          </div>


          {/* ===============================================
              FAILED LOOKUPS
              =============================================== */}

          {failedCount > 0 ? (

            <p className="public-alert public-alert-error">

              Some saved
              properties could not
              be refreshed. Try
              again in a moment.

            </p>

          ) : null}


          {/* ===============================================
              LOADING
              =============================================== */}

          {isLoading ? (

            <div className="public-empty-state landzo-saved-loading">

              <p>
                Loading saved
                properties...
              </p>

            </div>

          ) : null}


          {/* ===============================================
              SAVED PROPERTY CARDS
              SAME EXISTING COMPONENT
              =============================================== */}

          {!isLoading &&
          visibleProperties.length >
            0 ? (

            <div className="landzo-saved-property-list">

              {visibleProperties.map(
                (
                  property,
                ) => (

                 <PublicPropertyCard
  key={property.code}
  property={property}
  variant="saved"
/>

                ),
              )}

            </div>

          ) : null}


          {/* ===============================================
              NO RESULTS FOR SELECTED TYPE
              =============================================== */}

          {!isLoading &&
          properties.length > 0 &&
          visibleProperties.length ===
            0 ? (

            <div className="public-empty-state landzo-saved-empty">

              <p>
                No saved properties
                in this category.
              </p>

              <button
                className="public-link-button"
                onClick={() =>
                  setActiveType(
                    "all",
                  )
                }
                type="button"
              >
                View All Saved
              </button>

            </div>

          ) : null}


          {/* ===============================================
              NOTHING SAVED
              =============================================== */}

          {!isLoading &&
          properties.length ===
            0 ? (

            <div className="public-empty-state landzo-saved-empty">

              <p>
                No saved
                properties yet
              </p>

              <Link
                className="public-link-button"
                to="/properties"
              >
                Browse Properties
              </Link>

            </div>

          ) : null}


          {/* ===============================================
              BOTTOM CTA
              =============================================== */}

          {!isLoading &&
          properties.length > 0 ? (

            <div className="landzo-saved-explore-cta">

              <span className="landzo-saved-explore-icon">
                <SparkleIcon />
              </span>


              <div>
                <strong>
                  Found a property
                  you like?
                </strong>

                <p>
                  Save more
                  properties to
                  compare and
                  decide at your
                  own pace.
                </p>
              </div>


              <Link
                to="/properties"
              >
                Explore Properties
                <span
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>

            </div>

          ) : null}

        </div>

      </section>
    );
  };