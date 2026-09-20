import { useEffect, useState } from "react";

import { listLocations } from "../../api/locations.api";
import { Field } from "./Field";

const toSelectValue = (value) => value || "";
const fromSelectValue = (value) => value || null;

const findById = (locations, id) => locations.find((location) => location.id === id);
const hasLocation = (locations, id) => Boolean(id) && locations.some((location) => location.id === id);

const getDisplayLabel = (value, level) => value.labels?.[level] ?? "";

const getLocationLabel = (locations, id, displayLabel, loaded) => {
  if (displayLabel) {
    return displayLabel;
  }

  if (!id) {
    return "Not detected";
  }

  const location = findById(locations, id);

  if (location) {
    return location.name;
  }

  return loaded ? "Not detected" : "Resolving...";
};

export const LocationFields = ({
  value,
  onChange,
  onCenterHintChange,
  autoSelection = null,
  onAutoSelectionApplied,
  mode = "manual",
  levels = ["province", "district", "city", "area"],
  showDisplayAddress = true,
}) => {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [provincesLoaded, setProvincesLoaded] = useState(false);
  const [districtsLoaded, setDistrictsLoaded] = useState(false);
  const [citiesLoaded, setCitiesLoaded] = useState(false);
  const [areasLoaded, setAreasLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    const loadProvinces = async () => {
      setProvincesLoaded(false);

      try {
        const response = await listLocations({ level: "province", status: "active", limit: 100 });
        if (active) {
          setProvinces(response.data ?? []);
        }
      } catch {
        if (active) {
          setProvinces([]);
        }
      } finally {
        if (active) {
          setProvincesLoaded(true);
        }
      }
    };

    loadProvinces();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadDistricts = async () => {
      setDistrictsLoaded(false);
      await Promise.resolve();

      if (!value.province) {
        if (active) {
          setDistricts([]);
          setDistrictsLoaded(true);
        }
        return;
      }

      try {
        const response = await listLocations({ level: "district", parentId: value.province, status: "active", limit: 100 });
        if (active) {
          setDistricts(response.data ?? []);
        }
      } catch {
        if (active) {
          setDistricts([]);
        }
      } finally {
        if (active) {
          setDistrictsLoaded(true);
        }
      }
    };

    loadDistricts();

    return () => {
      active = false;
    };
  }, [value.province]);

  useEffect(() => {
    let active = true;

    const loadCities = async () => {
      setCitiesLoaded(false);
      await Promise.resolve();

      if (!value.district) {
        if (active) {
          setCities([]);
          setCitiesLoaded(true);
        }
        return;
      }

      try {
        const response = await listLocations({ level: "city", parentId: value.district, status: "active", limit: 100 });
        if (active) {
          setCities(response.data ?? []);
        }
      } catch {
        if (active) {
          setCities([]);
        }
      } finally {
        if (active) {
          setCitiesLoaded(true);
        }
      }
    };

    loadCities();

    return () => {
      active = false;
    };
  }, [value.district]);

  useEffect(() => {
    let active = true;

    const loadAreas = async () => {
      setAreasLoaded(false);
      await Promise.resolve();

      if (!value.city) {
        if (active) {
          setAreas([]);
          setAreasLoaded(true);
        }
        return;
      }

      try {
        const response = await listLocations({ level: "area", parentId: value.city, status: "active", limit: 100 });
        if (active) {
          setAreas(response.data ?? []);
        }
      } catch {
        if (active) {
          setAreas([]);
        }
      } finally {
        if (active) {
          setAreasLoaded(true);
        }
      }
    };

    loadAreas();

    return () => {
      active = false;
    };
  }, [value.city]);

  useEffect(() => {
    const selectedLocation =
      findById(areas, value.area) ||
      findById(cities, value.city) ||
      findById(districts, value.district) ||
      findById(provinces, value.province);

    onCenterHintChange?.(selectedLocation?.map ?? null);
  }, [areas, cities, districts, provinces, value.area, value.city, value.district, value.province, onCenterHintChange]);

  useEffect(() => {
    if (!autoSelection || !provincesLoaded) {
      return;
    }

    const matches = autoSelection.matches ?? {};
    const targetProvince = matches.province?.id ?? null;
    const targetDistrict = targetProvince ? (matches.district?.id ?? null) : null;
    const targetCity = targetDistrict ? (matches.city?.id ?? null) : null;
    const targetArea = targetCity ? (matches.area?.id ?? null) : null;

    if (targetProvince && !hasLocation(provinces, targetProvince)) {
      onAutoSelectionApplied?.();
      return;
    }

    if (value.province !== targetProvince) {
      onChange({ ...value, province: targetProvince, district: null, city: null, area: null });
      return;
    }

    if (targetDistrict) {
      if (!districtsLoaded) {
        return;
      }

      if (!hasLocation(districts, targetDistrict)) {
        onAutoSelectionApplied?.();
        return;
      }

      if (value.district !== targetDistrict) {
        onChange({ ...value, district: targetDistrict, city: null, area: null });
        return;
      }
    }

    if (targetCity) {
      if (!citiesLoaded) {
        return;
      }

      if (!hasLocation(cities, targetCity)) {
        onAutoSelectionApplied?.();
        return;
      }

      if (value.city !== targetCity) {
        onChange({ ...value, city: targetCity, area: null });
        return;
      }
    }

    if (targetArea) {
      if (!areasLoaded) {
        return;
      }

      if (!hasLocation(areas, targetArea)) {
        onAutoSelectionApplied?.();
        return;
      }

      if (value.area !== targetArea) {
        onChange({ ...value, area: targetArea });
        return;
      }
    }

    onAutoSelectionApplied?.();
  }, [
    areas,
    areasLoaded,
    autoSelection,
    cities,
    citiesLoaded,
    districts,
    districtsLoaded,
    onAutoSelectionApplied,
    onChange,
    provinces,
    provincesLoaded,
    value,
  ]);

  const updateLocation = (patch) => onChange({ ...value, ...patch });
  const shouldShowLevel = (level) => levels.includes(level);

  if (mode === "derived") {
    return (
      <div className="form-grid">
        {shouldShowLevel("province") ? (
          <Field label="Province">
            <input value={getLocationLabel(provinces, value.province, getDisplayLabel(value, "province"), provincesLoaded)} readOnly />
          </Field>
        ) : null}
        {shouldShowLevel("district") ? (
          <Field label="District">
            <input value={getLocationLabel(districts, value.district, getDisplayLabel(value, "district"), districtsLoaded)} readOnly />
          </Field>
        ) : null}
        {shouldShowLevel("city") ? (
          <Field label="City">
            <input value={getLocationLabel(cities, value.city, getDisplayLabel(value, "city"), citiesLoaded)} readOnly />
          </Field>
        ) : null}
        {shouldShowLevel("area") ? (
          <Field label="Area">
            <input value={getLocationLabel(areas, value.area, getDisplayLabel(value, "area"), areasLoaded)} readOnly />
          </Field>
        ) : null}
        {showDisplayAddress ? (
          <Field label="Display address">
            <textarea value={value.displayAddress || ""} onChange={(event) => updateLocation({ displayAddress: event.target.value })} rows={3} />
          </Field>
        ) : null}
      </div>
    );
  }
  return (
    <div className="form-grid">
      {shouldShowLevel("province") ? (
        <Field label="Province">
          <select
            value={toSelectValue(value.province)}
            onChange={(event) =>
              updateLocation({ province: fromSelectValue(event.target.value), district: null, city: null, area: null })
            }
          >
            <option value="">Select province</option>
            {provinces.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </Field>
      ) : null}
      {shouldShowLevel("district") ? (
        <Field label="District">
          <select
            value={toSelectValue(value.district)}
            onChange={(event) => updateLocation({ district: fromSelectValue(event.target.value), city: null, area: null })}
            disabled={!value.province}
          >
            <option value="">Select district</option>
            {districts.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </Field>
      ) : null}
      {shouldShowLevel("city") ? (
        <Field label="City">
          <select
            value={toSelectValue(value.city)}
            onChange={(event) => updateLocation({ city: fromSelectValue(event.target.value), area: null })}
            disabled={!value.district}
          >
            <option value="">Select city</option>
            {cities.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </Field>
      ) : null}
      {shouldShowLevel("area") ? (
        <Field label="Area">
          <select
            value={toSelectValue(value.area)}
            onChange={(event) => updateLocation({ area: fromSelectValue(event.target.value) })}
            disabled={!value.city}
          >
            <option value="">Select area</option>
            {areas.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </Field>
      ) : null}
      {showDisplayAddress ? (
        <Field label="Display address">
          <textarea value={value.displayAddress || ""} onChange={(event) => updateLocation({ displayAddress: event.target.value })} rows={3} />
        </Field>
      ) : null}
    </div>
  );
};


