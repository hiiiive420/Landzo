import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  listPublicExploreMapProperties,
} from "../../api/publicProperties.api";


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
  isPrimary = false,
) =>
  leaflet.divIcon({
    className: [
      "landzo-home-map-marker",
      isPrimary
        ? "is-primary"
        : "",
    ]
      .filter(Boolean)
      .join(" "),

    html: `
      <span class="landzo-home-map-marker-pin">
        <span class="landzo-home-map-marker-dot"></span>
      </span>
    `,

    iconAnchor: isPrimary
      ? [18, 45]
      : [13, 34],

    iconSize: isPrimary
      ? [36, 46]
      : [26, 35],
  });


  export const HomeExploreMapPreview =
  () => {
    const containerRef =
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
                result,
              );
            }
          } catch {
            if (!ignore) {
              setProperties(
                [],
              );
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
                    false,

                  zoomControl:
                    false,

                  dragging:
                    false,

                  touchZoom:
                    false,

                  doubleClickZoom:
                    false,

                  scrollWheelZoom:
                    false,

                  boxZoom:
                    false,

                  keyboard:
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


    /* -----------------------------------------
       Render dynamic ADMIN markers
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
        !markerLayer
      ) {
        return;
      }

      markerLayer.clearLayers();

      const bounds = [];


      validProperties
        .slice(0, 5)
        .forEach(
          (
            property,
            index,
          ) => {
            const latlng = [
              property.map.lat,
              property.map.lng,
            ];

            bounds.push(
              latlng,
            );


            leaflet
              .marker(
                latlng,
                {
                  icon:
                    createHomeMarkerIcon(
                      leaflet,
                      index === 2,
                    ),

                  title:
                    property.title,
                },
              )
              .addTo(
                markerLayer,
              );
          },
        );


      if (bounds.length > 1) {
        map.fitBounds(
          bounds,
          {
            padding: [
              22,
              22,
            ],

            maxZoom: 13,
          },
        );
      } else if (
        bounds.length === 1
      ) {
        map.setView(
          bounds[0],
          13,
        );
      }
    }, [validProperties]);


    return (
      <div className="landzo-home-map-frame">
        <div
          className="landzo-home-map"
          ref={containerRef}
        />
      </div>
    );
  };