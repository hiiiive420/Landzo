import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  listPublicExploreMapProperties,
} from "../../api/publicProperties.api";
import { getPublicApiErrorMessage } from "../../api/publicApiClient";


const LEAFLET_CSS_URL =
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

const LEAFLET_JS_URL =
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";


const SRI_LANKA_CENTER = {
  lat: 7.8731,
  lng: 80.7718,
};

const SRI_LANKA_ZOOM = 7;


let leafletLoadPromise;


const isValidMap = (map) =>
  map &&
  Number.isFinite(map.lat) &&
  Number.isFinite(map.lng) &&
  map.lat >= -90 &&
  map.lat <= 90 &&
  map.lng >= -180 &&
  map.lng <= 180;


const ensureLeafletCss = () => {
  if (
    document.getElementById(
      "landzo-leaflet-css",
    )
  ) {
    return;
  }

  const link =
    document.createElement("link");

  link.id = "landzo-leaflet-css";
  link.rel = "stylesheet";
  link.href = LEAFLET_CSS_URL;

  document.head.appendChild(link);
};


const loadLeaflet = () => {
  if (window.L) {
    ensureLeafletCss();

    return Promise.resolve(
      window.L,
    );
  }

  if (leafletLoadPromise) {
    return leafletLoadPromise;
  }

  leafletLoadPromise =
    new Promise(
      (resolve, reject) => {
        ensureLeafletCss();

        const existingScript =
          document.getElementById(
            "landzo-leaflet-js",
          );

        if (existingScript) {
          existingScript.addEventListener(
            "load",
            () =>
              resolve(
                window.L,
              ),
          );

          existingScript.addEventListener(
            "error",
            () =>
              reject(
                new Error(
                  "Leaflet failed to load",
                ),
              ),
          );

          return;
        }

        const script =
          document.createElement(
            "script",
          );

        script.id =
          "landzo-leaflet-js";

        script.src =
          LEAFLET_JS_URL;

        script.async = true;

        script.onload = () =>
          resolve(window.L);

        script.onerror = () =>
          reject(
            new Error(
              "Leaflet failed to load",
            ),
          );

        document.head.appendChild(
          script,
        );
      },
    );

  return leafletLoadPromise;
};

const createHomeMarkerIcon = (
  leaflet,
) =>
  leaflet.divIcon({
    className: "public-explore-marker",
    html: "<span></span>",
    iconAnchor: [14, 28],
    iconSize: [28, 28],
  });


const HomeExploreMapPreviewContent =
  () => {
      const navigate =
        useNavigate();

      const containerRef =
      useRef(null);

      const frameRef =
        useRef(null);

      const mapRef =
        useRef(null);

    const markerLayerRef =
      useRef(null);

    const leafletRef =
      useRef(null);

    const [
      properties,
      setProperties,
    ] = useState([]);

    const [
      isPropertiesLoading,
      setIsPropertiesLoading,
    ] = useState(true);

    const [
      propertiesError,
      setPropertiesError,
    ] = useState("");

    const [
      mapError,
      setMapError,
    ] = useState("");

    const [
      isMapReady,
      setIsMapReady,
    ] = useState(false);

    const validProperties =
      useMemo(
        () =>
          properties.filter(
            (property) =>
              isValidMap(
                property.map,
              ),
          ),
        [properties],
      );


    /* -----------------------------------------
       Load ADMIN/BACKEND map-ready properties
       ----------------------------------------- */

    useEffect(() => {
      let ignore = false;

      const loadProperties =
        async () => {
          try {
            const result =
              await listPublicExploreMapProperties();

            if (!ignore) {
              setProperties(
                Array.isArray(result)
                  ? result
                  : [],
              );
            }
          } catch (error) {
            if (!ignore) {
              setPropertiesError(
                getPublicApiErrorMessage(error),
              );
            }
          } finally {
            if (!ignore) {
              setIsPropertiesLoading(false);
            }
          }
        };

      void loadProperties();

      return () => {
        ignore = true;
      };
    }, []);


    /* -----------------------------------------
       Initialise Leaflet
       ----------------------------------------- */

    useEffect(() => {
      let cancelled = false;

      loadLeaflet()
        .then((leaflet) => {
          if (
            cancelled ||
            !containerRef.current ||
            mapRef.current
          ) {
            return;
          }

          leafletRef.current =
            leaflet;

          const map =
            leaflet
              .map(
                containerRef.current,
                {
                  attributionControl:
                    true,

                  scrollWheelZoom:
                    false,
                },
              )
              .setView(
                [
                  SRI_LANKA_CENTER.lat,
                  SRI_LANKA_CENTER.lng,
                ],
                SRI_LANKA_ZOOM,
              );


          leaflet
            .tileLayer(
              "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
              {
                attribution:
                  "&copy; OpenStreetMap contributors",
                maxZoom: 19,
              },
            )
            .addTo(map);


          markerLayerRef.current =
            leaflet
              .layerGroup()
              .addTo(map);

          mapRef.current =
            map;
          setIsMapReady(true);
        })
        .catch((error) => {
          if (!cancelled) {
            setMapError(
              error instanceof Error
                ? error.message
                : "Map temporarily unavailable",
            );
          }
        });

      return () => {
        cancelled = true;

        if (mapRef.current) {
          mapRef.current.remove();

          mapRef.current = null;

          markerLayerRef.current =
            null;
        }
      };
    }, []);

    useEffect(() => {
      const map =
        mapRef.current;

      const container =
        containerRef.current;

      const frame =
        frameRef.current;

      if (
        !isMapReady ||
        !map ||
        !container ||
        !frame
      ) {
        return undefined;
      }

      let frameId = 0;

      const invalidateMapSize = () => {
        window.cancelAnimationFrame(
          frameId,
        );

        frameId =
          window.requestAnimationFrame(
            () => {
              map.invalidateSize({
                pan: false,
              });
            },
          );
      };

      invalidateMapSize();

      const resizeObserver =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(
              invalidateMapSize,
            );

      resizeObserver?.observe(frame);
      resizeObserver?.observe(container);

      window.addEventListener(
        "resize",
        invalidateMapSize,
      );

      return () => {
        resizeObserver?.disconnect();
        window.removeEventListener(
          "resize",
          invalidateMapSize,
        );
        window.cancelAnimationFrame(
          frameId,
        );
      };
    }, [isMapReady]);


    /* -----------------------------------------
       Render public property markers
       ----------------------------------------- */

    useEffect(() => {
      const leaflet =
        leafletRef.current;

      const map =
        mapRef.current;

      const markerLayer =
        markerLayerRef.current;

      if (
        !leaflet ||
        !map ||
        !markerLayer ||
        !isMapReady
      ) {
        return;
      }

      markerLayer.clearLayers();

      const bounds = [];


      validProperties
        .forEach(
          (
            property,
          ) => {
            const latlng = [
              property.map.lat,
              property.map.lng,
            ];

            bounds.push(
              latlng,
            );


            const marker =
              leaflet
              .marker(
                latlng,
                {
                  icon:
                    createHomeMarkerIcon(
                      leaflet,
                    ),

                  title:
                    property.title,
                },
              )
              .addTo(
                markerLayer,
              );

            marker.on(
              "click",
              () => {
                if (property.code) {
                  navigate(
                    `/properties/${encodeURIComponent(property.code)}`,
                  );
                }
              },
            );
          },
        );


      if (bounds.length > 1) {
        map.fitBounds(
          bounds,
          {
            padding: [
              45,
              45,
            ],

            maxZoom: 8,
          },
        );
      } else if (
        bounds.length === 1
      ) {
        map.setView(
          bounds[0],
          8,
        );
      } else {
        map.setView(
          [
            SRI_LANKA_CENTER.lat,
            SRI_LANKA_CENTER.lng,
          ],
          SRI_LANKA_ZOOM,
        );
      }
    }, [isMapReady, navigate, validProperties]);


    return (
      <div
        className="landzo-home-map-frame"
        ref={frameRef}
      >
        <div
          className="landzo-home-map"
          ref={containerRef}
        />
        {mapError ? (
          <div
            className="landzo-home-map-message is-error"
            role="status"
          >
            Map temporarily unavailable
          </div>
        ) : isPropertiesLoading ? (
          <div
            className="landzo-home-map-message"
            role="status"
          >
            Loading property locations…
          </div>
        ) : propertiesError ? (
          <div
            className="landzo-home-map-message is-data-error"
            role="status"
          >
            Property locations are temporarily unavailable
          </div>
        ) : null}
      </div>
    );
  };

export const HomeExploreMapPreview =
  () => {
    const [
      isDesktop,
      setIsDesktop,
    ] = useState(false);

    useEffect(() => {
      const desktopQuery =
        window.matchMedia(
          "(min-width: 1025px)",
        );

      const updateDesktopState =
        () => {
          setIsDesktop(
            desktopQuery.matches,
          );
        };

      updateDesktopState();
      desktopQuery.addEventListener(
        "change",
        updateDesktopState,
      );

      return () => {
        desktopQuery.removeEventListener(
          "change",
          updateDesktopState,
        );
      };
    }, []);

    return isDesktop
      ? <HomeExploreMapPreviewContent />
      : null;
  };