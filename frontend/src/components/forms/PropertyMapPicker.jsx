import { useCallback, useEffect, useRef, useState } from "react";

import { getErrorMessage } from "../../api/apiClient";
import { reverseGeocode, searchPlaces } from "../../api/geocoding.api";
import { createLocation } from "../../api/locations.api";
import { PermissionGate } from "../../auth/PermissionGate";
import { permissions } from "../../utils/propertyOptions";

const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const SRI_LANKA_CENTER = { lat: 7.8731, lng: 80.7718 };
const SRI_LANKA_ZOOM = 7;
const PROPERTY_ZOOM = 16;
const SEARCH_MIN_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 300;
const CATALOG_LEVELS = ["province", "district", "city", "area"];
const CATALOG_LEVEL_LABELS = {
  province: "Province",
  district: "District",
  city: "City",
  area: "Area",
};

let leafletLoadPromise;

const isValidMapValue = (value) =>
  value &&
  Number.isFinite(value.lat) &&
  Number.isFinite(value.lng) &&
  value.lat >= -90 &&
  value.lat <= 90 &&
  value.lng >= -180 &&
  value.lng <= 180;

const roundCoordinate = (coordinate) => Number(coordinate.toFixed(6));

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
    className: "property-map-marker",
    html: "<span></span>",
    iconAnchor: [14, 28],
    iconSize: [28, 28],
  });

const getSuggestedName = (result, level) => result?.suggestedNames?.[level]?.[0] ?? "";

const getMissingCatalogItems = (result) => {
  const matches = result?.matches ?? {};
  const missingItems = [];
  let parentCanExist = true;

  for (const level of CATALOG_LEVELS) {
    if (matches[level]) {
      continue;
    }

    const name = getSuggestedName(result, level);

    if (!name || (level !== "province" && !parentCanExist)) {
      break;
    }

    missingItems.push({
      level,
      label: CATALOG_LEVEL_LABELS[level],
      name,
    });
    parentCanExist = true;
  }

  return missingItems;
};

export const PropertyMapPicker = ({
  value,
  onChange,
  onResolvedLocation,
  centerHint = null,
  emptyMessage = "No exact property pin selected yet. Click the map to place one.",
  showMissingLocationAction = false,
  resolveInitialSelection = false,
  resetKey = 0,
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const leafletRef = useRef(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onResolvedLocationRef = useRef(onResolvedLocation);
  const lastCenterHintRef = useRef(null);
  const centeredSelectedKeyRef = useRef(null);
  const initialResolvedSelectionRef = useRef(null);
  const searchRequestRef = useRef(0);
  const suppressAutocompleteRef = useRef(false);
  const [loadError, setLoadError] = useState("");
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [results, setResults] = useState([]);
  const [searchMessage, setSearchMessage] = useState("");
  const [resolvedLocation, setResolvedLocation] = useState(null);
  const [showMissingPanel, setShowMissingPanel] = useState(false);
  const [creatingMissing, setCreatingMissing] = useState(false);

  const selected = isValidMapValue(value) ? value : null;
  const missingCatalogItems = getMissingCatalogItems(resolvedLocation);

  const resetPickerState = useCallback(() => {
    searchRequestRef.current += 1;
    suppressAutocompleteRef.current = false;
    lastCenterHintRef.current = null;
    centeredSelectedKeyRef.current = null;
    initialResolvedSelectionRef.current = null;

    setQuery("");
    setSearching(false);
    setResolving(false);
    setResults([]);
    setSearchMessage("");
    setResolvedLocation(null);
    setShowMissingPanel(false);
    setCreatingMissing(false);

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (mapRef.current) {
      mapRef.current.setView([SRI_LANKA_CENTER.lat, SRI_LANKA_CENTER.lng], SRI_LANKA_ZOOM);
    }
  }, []);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onResolvedLocationRef.current = onResolvedLocation;
  }, [onResolvedLocation]);

  useEffect(() => {
    if (!resetKey) {
      return undefined;
    }

    const timer = window.setTimeout(resetPickerState, 0);

    return () => window.clearTimeout(timer);
  }, [resetKey, resetPickerState]);

  const moveMap = useCallback((mapValue, zoom = PROPERTY_ZOOM) => {
    if (mapRef.current && isValidMapValue(mapValue)) {
      mapRef.current.setView([mapValue.lat, mapValue.lng], zoom);
    }
  }, []);

  const resolveSelection = useCallback(async (mapValue, context = {}) => {
    setResolving(true);
    setSearchMessage("");
    setShowMissingPanel(false);

    try {
      const result = await reverseGeocode(mapValue);

      if (!result) {
        setResolvedLocation(null);
        setSearchMessage("Selected pin saved. No address suggestion was found for this point.");
        return;
      }

      setResolvedLocation(result);
      onResolvedLocationRef.current?.(result, context);
    } catch (error) {
      setSearchMessage(getErrorMessage(error));
    } finally {
      setResolving(false);
    }
  }, []);

  const syncMarker = useCallback(
    (mapValue) => {
      if (!leafletRef.current || !mapRef.current || !isValidMapValue(mapValue)) {
        return;
      }

      const latlng = [mapValue.lat, mapValue.lng];

      if (!markerRef.current) {
        markerRef.current = leafletRef.current
          .marker(latlng, {
            draggable: true,
            icon: createMarkerIcon(leafletRef.current),
          })
          .addTo(mapRef.current);

        markerRef.current.on("dragend", () => {
          const position = markerRef.current.getLatLng();
          const nextMap = {
            lat: roundCoordinate(position.lat),
            lng: roundCoordinate(position.lng),
          };

          onChangeRef.current(nextMap);
          resolveSelection(nextMap);
        });
      } else {
        markerRef.current.setLatLng(latlng);
      }
    },
    [resolveSelection],
  );

  const updateSelection = useCallback(
    (latlng, { center = false, reverse = true } = {}) => {
      const nextMap = {
        lat: roundCoordinate(latlng.lat),
        lng: roundCoordinate(latlng.lng),
      };

      onChangeRef.current(nextMap);
      syncMarker(nextMap);

      if (center) {
        moveMap(nextMap, PROPERTY_ZOOM);
      }

      if (reverse) {
        resolveSelection(nextMap);
      }
    },
    [moveMap, resolveSelection, syncMarker],
  );

  const runSearch = useCallback(async (searchQuery, { clearFirst = false, showTooShort = false } = {}) => {
    const trimmedQuery = searchQuery.trim();
    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;

    if (trimmedQuery.length < SEARCH_MIN_LENGTH) {
      setResults([]);
      setSearching(false);
      setSearchMessage(showTooShort && trimmedQuery ? "Enter at least 3 characters to search." : "");
      return;
    }

    if (clearFirst) {
      setResults([]);
    }

    setSearching(true);
    setSearchMessage("");

    try {
      const places = await searchPlaces(trimmedQuery);

      if (requestId !== searchRequestRef.current) {
        return;
      }

      setResults(places ?? []);

      if (!places?.length) {
        setSearchMessage("No Sri Lanka places matched that search.");
      }
    } catch (error) {
      if (requestId === searchRequestRef.current) {
        setResults([]);
        setSearchMessage(getErrorMessage(error));
      }
    } finally {
      if (requestId === searchRequestRef.current) {
        setSearching(false);
      }
    }
  }, []);

  useEffect(() => {
    if (suppressAutocompleteRef.current) {
      suppressAutocompleteRef.current = false;
      return undefined;
    }

    const trimmedQuery = query.trim();

    if (trimmedQuery.length < SEARCH_MIN_LENGTH) {
      searchRequestRef.current += 1;
      return undefined;
    }

    const timer = window.setTimeout(() => {
      runSearch(trimmedQuery, { clearFirst: false });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, runSearch]);

  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((leaflet) => {
        if (cancelled || !containerRef.current) {
          return;
        }

        leafletRef.current = leaflet;

        const initialPin = isValidMapValue(valueRef.current) ? valueRef.current : null;
        const initialCenter = initialPin || SRI_LANKA_CENTER;
        const initialZoom = initialPin ? PROPERTY_ZOOM : SRI_LANKA_ZOOM;

        const map = leaflet
          .map(containerRef.current, {
            scrollWheelZoom: false,
          })
          .setView([initialCenter.lat, initialCenter.lng], initialZoom);

        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19,
          })
          .addTo(map);

        map.on("click", (event) => updateSelection(event.latlng));

        mapRef.current = map;
        syncMarker(valueRef.current);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Map could not be loaded. Check your connection and try again.");
        }
      });

    return () => {
      cancelled = true;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [syncMarker, updateSelection]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!selected) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    syncMarker(selected);

    const selectedKey = `${selected.lat},${selected.lng}`;
    if (centeredSelectedKeyRef.current !== selectedKey) {
      centeredSelectedKeyRef.current = selectedKey;
      moveMap(selected, PROPERTY_ZOOM);
    }
  }, [moveMap, ready, selected, syncMarker]);

  useEffect(() => {
    if (!ready || !resolveInitialSelection || !selected) {
      return;
    }

    const selectedKey = `${selected.lat},${selected.lng}`;

    if (initialResolvedSelectionRef.current === selectedKey) {
      return;
    }

    initialResolvedSelectionRef.current = selectedKey;
    resolveSelection(selected, { source: "initial" });
  }, [ready, resolveInitialSelection, resolveSelection, selected]);

  useEffect(() => {
    if (!ready || selected || !isValidMapValue(centerHint)) {
      return;
    }

    const centerKey = `${centerHint.lat},${centerHint.lng}`;

    if (lastCenterHintRef.current === centerKey) {
      return;
    }

    lastCenterHintRef.current = centerKey;
    moveMap(centerHint, 12);
  }, [centerHint, moveMap, ready, selected]);

  const handleSearch = (event) => {
    event.preventDefault();
    runSearch(query, { clearFirst: true, showTooShort: true });
  };

  const handleQueryChange = (event) => {
    const nextQuery = event.target.value;

    setQuery(nextQuery);

    if (nextQuery.trim().length < SEARCH_MIN_LENGTH) {
      searchRequestRef.current += 1;
      setResults([]);
      setSearching(false);
      setSearchMessage("");
    }
  };

  const handleSelectResult = (result) => {
    suppressAutocompleteRef.current = true;
    setQuery(result.displayName || result.name || "");
    setResolvedLocation(result);
    setShowMissingPanel(false);
    updateSelection(result.map, { center: true, reverse: false });
    onResolvedLocationRef.current?.(result);
    setResults([]);
    setSearchMessage("");
  };

  const handleClearPin = () => {
    centeredSelectedKeyRef.current = null;
    initialResolvedSelectionRef.current = null;
    onChange(null);
    setResolvedLocation(null);
    setShowMissingPanel(false);
    setResults([]);
    setSearchMessage("");
  };

  const handleCreateMissingLocations = async () => {
    if (!resolvedLocation || !missingCatalogItems.length) {
      return;
    }

    setCreatingMissing(true);
    setSearchMessage("");

    try {
      const nextMatches = { ...(resolvedLocation.matches ?? {}) };
      let parentId = null;

      for (const level of CATALOG_LEVELS) {
        if (nextMatches[level]) {
          parentId = nextMatches[level].id;
          continue;
        }

        const name = getSuggestedName(resolvedLocation, level);

        if (!name || (level !== "province" && !parentId)) {
          continue;
        }

        const createdLocation = await createLocation({
          name,
          level,
          parentId: parentId ?? null,
          sortOrder: 0,
          map: null,
        });

        nextMatches[level] = {
          id: createdLocation.id,
          name: createdLocation.name,
          level: createdLocation.level,
        };
        parentId = createdLocation.id;
      }

      const nextResolvedLocation = {
        ...resolvedLocation,
        matches: nextMatches,
      };

      setResolvedLocation(nextResolvedLocation);
      setShowMissingPanel(false);
      setSearchMessage("Missing catalog locations were added.");
      onResolvedLocationRef.current?.(nextResolvedLocation);
    } catch (error) {
      setSearchMessage(getErrorMessage(error));
    } finally {
      setCreatingMissing(false);
    }
  };

  return (
    <div className="property-map-picker">
      <form className="map-search" onSubmit={handleSearch}>
        <input
          type="search"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search places in Sri Lanka"
          autoComplete="off"
        />
        <button className="button secondary" type="submit" disabled={searching}>
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      {searchMessage ? <p className="alert alert-info">{searchMessage}</p> : null}

      {results.length ? (
        <div className="map-results">
          {results.map((result) => (
            <button key={result.id} type="button" onClick={() => handleSelectResult(result)}>
              <strong>{result.name}</strong>
              <span>{result.displayName}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div ref={containerRef} className="property-map-canvas" />

      {!ready && !loadError ? <p className="property-map-loading">Loading map...</p> : null}
      {loadError ? <p className="alert alert-danger">{loadError}</p> : null}

      <div className="property-map-footer">
        {selected ? (
          <p className="property-map-summary">
            Selected pin: {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
          </p>
        ) : (
          <p className="property-map-summary muted">{emptyMessage}</p>
        )}

        <button className="button secondary small" type="button" disabled={!selected} onClick={handleClearPin}>
          Clear pin
        </button>
      </div>

      {resolving ? <p className="muted">Resolving location suggestion...</p> : null}

      {resolvedLocation ? (
        <div className="map-suggestion-panel">
          <strong>Suggested address</strong>
          <p>{resolvedLocation.displayName}</p>
          {missingCatalogItems.length ? (
            <div className="map-missing-location">
              <span>Missing in catalog: {missingCatalogItems.map((item) => item.label).join(", ")}.</span>
              {showMissingLocationAction ? (
                <PermissionGate permission={permissions.locationManage}>
                  <button className="button secondary small" type="button" onClick={() => setShowMissingPanel((current) => !current)}>
                    Add Missing Locations
                  </button>
                </PermissionGate>
              ) : null}
            </div>
          ) : null}
          {showMissingPanel ? (
            <div className="map-missing-panel">
              <ul>
                {missingCatalogItems.map((item) => (
                  <li key={item.level}>
                    {item.label}: {item.name}
                  </li>
                ))}
              </ul>
              <button className="button primary small" type="button" onClick={handleCreateMissingLocations} disabled={creatingMissing}>
                {creatingMissing ? "Adding..." : "Create missing hierarchy"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};




