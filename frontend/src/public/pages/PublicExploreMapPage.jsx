import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  analyticsEventTypes,
  analyticsSurfaces,
  recordAnalyticsEventSafely,
} from "../../api/analytics.api";
import { getPublicApiErrorMessage } from "../../api/publicApiClient";
import { listPublicExploreMapProperties } from "../../api/publicProperties.api";
import { SavePropertyButton } from "../components/SavePropertyButton";

const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const SRI_LANKA_CENTER = { lat: 7.8731, lng: 80.7718 };
const SRI_LANKA_ZOOM = 7;
const MARKER_ZOOM = 14;

let leafletLoadPromise;

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

const pricingLabels = {
  fixed: "Fixed price",
  negotiable: "Negotiable",
  price_on_request: "Price on request",
};

const leasePeriodSuffixes = {
  monthly: " / month",
  annual: " / year",
  total: " total lease",
};

const isValidMap = (map) =>
  map &&
  Number.isFinite(map.lat) &&
  Number.isFinite(map.lng) &&
  map.lat >= -90 &&
  map.lat <= 90 &&
  map.lng >= -180 &&
  map.lng <= 180;

const ensureLeafletCss = () => {
  if (document.getElementById("landzo-leaflet-css")) {
    return;
  }

  const link = document.createElement("link");
  link.id = "landzo-leaflet-css";
  link.rel = "stylesheet";
  link.href = LEAFLET_CSS_URL;
  document.head.appendChild(link);
};

const loadLeaflet = () => {
  if (window.L) {
    ensureLeafletCss();
    return Promise.resolve(window.L);
  }

  if (leafletLoadPromise) {
    return leafletLoadPromise;
  }

  leafletLoadPromise = new Promise((resolve, reject) => {
    ensureLeafletCss();

    const existingScript = document.getElementById("landzo-leaflet-js");

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.L));
      existingScript.addEventListener("error", () => reject(new Error("Leaflet failed to load")));
      return;
    }

    const script = document.createElement("script");
    script.id = "landzo-leaflet-js";
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Leaflet failed to load"));
    document.head.appendChild(script);
  });

  return leafletLoadPromise;
};

const createMarkerIcon = (leaflet) =>
  leaflet.divIcon({
    className: "public-explore-marker",
    html: "<span></span>",
    iconAnchor: [14, 28],
    iconSize: [28, 28],
  });

const formatAmount = (amount, currency) => {
  if (!Number.isFinite(amount)) {
    return null;
  }

  return new Intl.NumberFormat("en-LK", {
    currency: currency || "LKR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
};

const getPriceLabel = (property) => {
  const pricing = property.pricing;

  if (!pricing) {
    return "";
  }

  if (!pricing.priceVisible) {
    return "Price on request";
  }

  const transactionType = property.transactionTypes?.[0];
  const section = pricing[transactionType] || pricing.sale || pricing.rent || pricing.lease;

  if (!section) {
    return "";
  }

  const amount = formatAmount(section.amount, pricing.currency);

  if (amount) {
    return `${amount}${transactionType === "lease" ? leasePeriodSuffixes[section.period] || "" : ""}`;
  }

  return pricingLabels[section.mode] || "";
};

const getLocationLabel = (property) => {
  const location = property.location || {};
  const parts = [
    location.displayAddress,
    location.area?.name,
    location.city?.name,
    location.district?.name,
    location.province?.name,
  ].filter(Boolean);

  return parts.join(", ") || "Sri Lanka";
};

const getTransactionLabel = (transactionTypes = []) =>
  transactionTypes.map((type) => transactionLabels[type] || type).join(" / ");

export const PublicExploreMapPage = () => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);
  const leafletRef = useRef(null);
  const selectedTrackedRef = useRef(null);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [mapError, setMapError] = useState("");
  const [isMapReady, setIsMapReady] = useState(false);

  const validProperties = useMemo(
    () => properties.filter((property) => isValidMap(property.map)),
    [properties],
  );

  useEffect(() => {
    let ignore = false;

    const loadProperties = async () => {
      try {
        setIsLoading(true);
        setError("");

        const result = await listPublicExploreMapProperties();

        if (!ignore) {
          setProperties(result);
          setSelectedProperty(result.find((property) => isValidMap(property.map)) ?? null);
        }
      } catch (requestError) {
        if (!ignore) {
          setProperties([]);
          setSelectedProperty(null);
          setError(getPublicApiErrorMessage(requestError));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void loadProperties();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((leaflet) => {
        if (cancelled || !containerRef.current || mapRef.current) {
          return;
        }

        leafletRef.current = leaflet;
        const map = leaflet
          .map(containerRef.current, {
            scrollWheelZoom: false,
          })
          .setView([SRI_LANKA_CENTER.lat, SRI_LANKA_CENTER.lng], SRI_LANKA_ZOOM);

        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19,
          })
          .addTo(map);

        markerLayerRef.current = leaflet.layerGroup().addTo(map);
        mapRef.current = map;
        setIsMapReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setMapError("Map could not be loaded. Check your connection and try again.");
        }
      });

    return () => {
      cancelled = true;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerLayerRef.current = null;
        setIsMapReady(false);
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;

    if (!isMapReady || !map || !container || typeof ResizeObserver === "undefined") {
    return undefined;
    }

    let frameId = 0;
    const invalidateMapSize = () => {
    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(() => {
      map.invalidateSize({ pan: false });
    });
    };

    invalidateMapSize();

    const resizeObserver = new ResizeObserver(invalidateMapSize);
    resizeObserver.observe(container);

    return () => {
    resizeObserver.disconnect();
    cancelAnimationFrame(frameId);
    };
  }, [isMapReady]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;

    if (!isMapReady || !leaflet || !map || !markerLayer) {
      return;
    }

    markerLayer.clearLayers();

    const bounds = [];

    validProperties.forEach((property) => {
      const latlng = [property.map.lat, property.map.lng];
      bounds.push(latlng);

      const marker = leaflet
        .marker(latlng, {
          icon: createMarkerIcon(leaflet),
          title: property.title,
        })
        .addTo(markerLayer);

      marker.on("click", () => {
        setSelectedProperty(property);
        map.setView(latlng, Math.max(map.getZoom(), MARKER_ZOOM));

        if (selectedTrackedRef.current !== property.id) {
          selectedTrackedRef.current = property.id;
          recordAnalyticsEventSafely({
            eventType: analyticsEventTypes.mapInteraction,
            propertyId: property.id,
            context: {
              surface: analyticsSurfaces.exploreMap,
            },
          });
        }
      });
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: MARKER_ZOOM });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], MARKER_ZOOM);
    } else {
      map.setView([SRI_LANKA_CENTER.lat, SRI_LANKA_CENTER.lng], SRI_LANKA_ZOOM);
    }
  }, [isMapReady, validProperties]);

  const priceLabel = selectedProperty ? getPriceLabel(selectedProperty) : "";
  const locationLabel = selectedProperty ? getLocationLabel(selectedProperty) : "";

return (
  <main className="landzo-explore-page">

    {/* =====================================================
        EXPLORE INTRO
        ===================================================== */}

    <section className="landzo-explore-intro">

      <div className="landzo-explore-intro-copy">

        <span className="landzo-explore-eyebrow">
          LANDZO EXPLORE
        </span>

        <h1>
          Explore properties
          <br />
          on the map
        </h1>

        <p>
          Discover available LANDZO properties across Sri Lanka
          using our interactive map.
        </p>

      </div>


      <Link
        className="landzo-explore-all-properties"
        to="/properties"
      >
        View all properties
        <span aria-hidden="true">
          →
        </span>
      </Link>

    </section>


    {/* =====================================================
        MAP + SELECTED PROPERTY
        ===================================================== */}

    <section className="landzo-explore-content">

      <div className="landzo-explore-map-card">

        <div className="landzo-explore-map-heading">

          <div>
            <h2>
              Explore Map
            </h2>

            <p>
              {isLoading
                ? "Loading properties..."
                : `${validProperties.length} ${
                    validProperties.length === 1
                      ? "property"
                      : "properties"
                  } available on map`}
            </p>
          </div>

        </div>


        {error ? (
          <p className="public-alert public-alert-error">
            {error}
          </p>
        ) : null}


        {mapError ? (
          <p className="public-alert public-alert-error">
            {mapError}
          </p>
        ) : null}


        <div
          className="public-explore-map landzo-explore-map"
          ref={containerRef}
        />

      </div>


      {/* ===================================================
          SELECTED PROPERTY
          =================================================== */}

      <aside
        aria-live="polite"
        className="landzo-explore-selected"
      >

        {selectedProperty ? (
          <article className="landzo-explore-property-card">

            {/* IMAGE */}

            <Link
              className="landzo-explore-property-media"
              to={`/properties/${selectedProperty.code}`}
            >

              {selectedProperty.coverImage?.url ? (
                <img
                  alt={
                    selectedProperty.title ||
                    "LANDZO property"
                  }
                  loading="lazy"
                  src={selectedProperty.coverImage.url}
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="public-property-card-fallback"
                />
              )}


              {selectedProperty.transactionTypes?.[0] ? (
                <span
                  className={[
                    "landzo-explore-transaction",
                    `is-${selectedProperty.transactionTypes[0]}`,
                  ].join(" ")}
                >
                  For{" "}
                  {transactionLabels[
                    selectedProperty.transactionTypes[0]
                  ] ||
                    selectedProperty.transactionTypes[0]}
                </span>
              ) : null}

            </Link>


            {/* CONTENT */}

            <div className="landzo-explore-property-body">

              <div className="landzo-explore-property-top">

                <div className="landzo-explore-property-badges">

                  {selectedProperty.type ? (
                    <span>
                      {typeLabels[
                        selectedProperty.type
                      ] ||
                        selectedProperty.type}
                    </span>
                  ) : null}


                  {selectedProperty.status ? (
                    <span>
                      {selectedProperty.status}
                    </span>
                  ) : null}

                </div>


                <span className="landzo-explore-property-code">
                  {selectedProperty.code}
                </span>

              </div>


              <h2>
                {selectedProperty.title}
              </h2>


              <p className="landzo-explore-property-location">
                {locationLabel}
              </p>


              {priceLabel ? (
                <strong className="landzo-explore-property-price">
                  {priceLabel}
                </strong>
              ) : null}


              {selectedProperty.transactionTypes?.length ? (
                <span className="landzo-explore-property-transaction-text">
                  {getTransactionLabel(
                    selectedProperty.transactionTypes,
                  )}
                </span>
              ) : null}


              <div className="landzo-explore-property-actions">

                <SavePropertyButton
                  className="public-explore-save landzo-explore-save"
                  propertyCode={selectedProperty.code}
                  propertyId={selectedProperty.id}
                  propertyTitle={selectedProperty.title}
                  surface={analyticsSurfaces.exploreMap}
                />


                <Link
                  className="landzo-explore-view-property"
                  to={`/properties/${selectedProperty.code}`}
                >
                  View Details
                  <span aria-hidden="true">
                    →
                  </span>
                </Link>

              </div>

            </div>

          </article>
        ) : (
          <div className="landzo-explore-empty">

            <p>
              {isLoading
                ? "Loading map-ready properties..."
                : "No map-ready properties are available right now."}
            </p>

          </div>
        )}

      </aside>

    </section>

  </main>
);
};