import { useEffect, useMemo, useState } from "react";

import { getErrorMessage } from "../../../api/apiClient";
import { getLocation } from "../../../api/locations.api";
import { LocationFields } from "../../../components/forms/LocationFields";
import { PropertyMapPicker } from "../../../components/forms/PropertyMapPicker";

const LOCATION_LEVELS = ["province", "district", "city", "area"];

const EMPTY_LABELS = {
  province: "",
  district: "",
  city: "",
  area: "",
};

const INITIAL_FORM = {
  name: "",
  level: "province",
  sortOrder: "0",
  map: null,
};

const createCascade = ({ labels = {}, ...patch } = {}) => ({
  province: null,
  district: null,
  city: null,
  area: null,
  displayAddress: "",
  ...patch,
  labels: {
    ...EMPTY_LABELS,
    ...labels,
  },
});

const getMatchName = (match) => {
  if (!match || typeof match === "string") {
    return "";
  }

  return match.name ?? "";
};

const getResolvedLabel = (resolvedLocation, level) =>
  getMatchName(resolvedLocation?.matches?.[level]) ||
  resolvedLocation?.suggestedNames?.[level]?.[0] ||
  "";

const getResolvedLabels = (resolvedLocation) =>
  LOCATION_LEVELS.reduce(
    (labels, level) => ({
      ...labels,
      [level]: getResolvedLabel(resolvedLocation, level),
    }),
    {},
  );

const getResolvedLocationId = (match) => {
  if (!match) {
    return null;
  }

  if (typeof match === "string") {
    return match;
  }

  return match.id ?? match._id ?? null;
};

const getSavedDisplayAddress = (location) =>
  location?.displayAddress ?? location?.address ?? "";

const getDerivedParentId = (level, cascade) => {
  if (level === "district") {
    return cascade.province;
  }

  if (level === "city") {
    return cascade.district;
  }

  if (level === "area") {
    return cascade.city;
  }

  return null;
};

const getInitialCascade = (initialLocation) => {
  if (!initialLocation) {
    return createCascade();
  }

  const parentId = initialLocation.parent?.id ?? null;
  const locationId = initialLocation.id ?? null;
  const locationName = initialLocation.name ?? "";
  const parentName = initialLocation.parent?.name ?? "";
  const displayAddress = getSavedDisplayAddress(initialLocation);

  if (initialLocation.level === "province") {
    return createCascade({
      province: locationId,
      displayAddress,
      labels: {
        province: locationName,
      },
    });
  }

  if (initialLocation.level === "district") {
    return createCascade({
      province: parentId,
      district: locationId,
      displayAddress,
      labels: {
        province: parentName,
        district: locationName,
      },
    });
  }

  if (initialLocation.level === "city") {
    return createCascade({
      district: parentId,
      city: locationId,
      displayAddress,
      labels: {
        district: parentName,
        city: locationName,
      },
    });
  }

  if (initialLocation.level === "area") {
    return createCascade({
      city: parentId,
      area: locationId,
      displayAddress,
      labels: {
        city: parentName,
        area: locationName,
      },
    });
  }

  return createCascade();
};

const mergeCascade = (current, patch) =>
  createCascade({
    ...current,
    ...patch,
    labels: {
      ...(current.labels ?? EMPTY_LABELS),
      ...(patch.labels ?? {}),
    },
  });

const mergeMissingLabels = (currentLabels, nextLabels) =>
  LOCATION_LEVELS.reduce(
    (labels, level) => ({
      ...labels,
      [level]: currentLabels?.[level] || nextLabels?.[level] || "",
    }),
    {},
  );

const getAutomaticCreateTarget = (resolvedLocation) => {
  let parentId = null;
  let detectedLevels = 0;

  for (const level of LOCATION_LEVELS) {
    const match = resolvedLocation?.matches?.[level];
    const name = getResolvedLabel(resolvedLocation, level);

    if (!name) {
      break;
    }

    detectedLevels += 1;

    const matchId = getResolvedLocationId(match);

    if (matchId) {
      parentId = matchId;
      continue;
    }

    if (level === "province" || parentId) {
      return {
        name,
        level,
        parentId: level === "province" ? null : parentId,
      };
    }

    return null;
  }

  if (!detectedLevels) {
    return null;
  }

  return null;
};

const getCreateTargetMessage = (resolvedLocation, target) => {
  if (target) {
    return "";
  }

  const detectedLevels = LOCATION_LEVELS.filter((level) =>
    Boolean(getResolvedLabel(resolvedLocation, level)),
  );

  const allDetectedLevelsExist =
    detectedLevels.length === LOCATION_LEVELS.length &&
    detectedLevels.every((level) => Boolean(getResolvedLocationId(resolvedLocation?.matches?.[level])));

  return allDetectedLevelsExist
    ? "This location hierarchy already exists in the Location Catalog."
    : "No new catalog location was detected for this map point.";
};
export const LocationForm = ({
  initialLocation = null,
  level = "province",
  submitting = false,
  onSubmit,
  submitLabel,
}) => {
  const isEditing = Boolean(initialLocation);
  const fixedLevel = initialLocation?.level ?? level;

  const [form, setForm] = useState(() => {
    if (!initialLocation) {
      return {
        ...INITIAL_FORM,
        level: fixedLevel,
      };
    }

    return {
      name: initialLocation.name ?? "",
      level: initialLocation.level ?? "province",
      sortOrder: String(initialLocation.sortOrder ?? 0),
      map: initialLocation.map ?? null,
    };
  });

  const [cascade, setCascade] = useState(() => getInitialCascade(initialLocation));
  const [centerHint, setCenterHint] = useState(null);
  const [pendingLocationAutoSelection, setPendingLocationAutoSelection] = useState(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyError, setHierarchyError] = useState("");
  const [resolvedHierarchy, setResolvedHierarchy] = useState(null);
  const [mapResetKey, setMapResetKey] = useState(0);

  const automaticCreateTarget = useMemo(
    () => (isEditing ? null : getAutomaticCreateTarget(resolvedHierarchy)),
    [isEditing, resolvedHierarchy],
  );
  const createTargetMessage = useMemo(
    () => (isEditing || !resolvedHierarchy ? "" : getCreateTargetMessage(resolvedHierarchy, automaticCreateTarget)),
    [automaticCreateTarget, isEditing, resolvedHierarchy],
  );
  const derivedParentId = isEditing
    ? getDerivedParentId(form.level, cascade)
    : automaticCreateTarget?.parentId ?? null;
  const canSubmitCreate = isEditing || Boolean(automaticCreateTarget);

  const resetCreateForm = () => {
    setForm({
      ...INITIAL_FORM,
      level: fixedLevel,
    });
    setCascade(createCascade());
    setCenterHint(null);
    setPendingLocationAutoSelection(null);
    setHierarchyError("");
    setResolvedHierarchy(null);
    setMapResetKey((current) => current + 1);
  };

  useEffect(() => {
    if (!initialLocation) {
      return undefined;
    }

    let ignore = false;

    const hydrateCascade = async () => {
      setHierarchyLoading(true);
      setHierarchyError("");
      await Promise.resolve();

      try {
        const parentId = initialLocation.parent?.id ?? null;

        if (initialLocation.level === "province") {
          if (!ignore) {
            setCascade(getInitialCascade(initialLocation));
          }

          return;
        }

        if (initialLocation.level === "district") {
          if (!ignore) {
            setCascade(getInitialCascade(initialLocation));
          }

          return;
        }

        if (initialLocation.level === "city") {
          const district = parentId ? await getLocation(parentId) : null;

          if (!ignore) {
            setCascade((current) =>
              mergeCascade(current, {
                province: district?.parent?.id ?? current.province,
                district: parentId,
                city: initialLocation.id,
                labels: {
                  province: district?.parent?.name ?? current.labels?.province ?? "",
                  district: district?.name ?? initialLocation.parent?.name ?? "",
                  city: initialLocation.name ?? "",
                },
              }),
            );
          }

          return;
        }

        if (initialLocation.level === "area") {
          const city = parentId ? await getLocation(parentId) : null;
          const districtId = city?.parent?.id ?? null;
          const district = districtId ? await getLocation(districtId) : null;

          if (!ignore) {
            setCascade((current) =>
              mergeCascade(current, {
                province: district?.parent?.id ?? current.province,
                district: districtId,
                city: parentId,
                area: initialLocation.id,
                labels: {
                  province: district?.parent?.name ?? current.labels?.province ?? "",
                  district: district?.name ?? "",
                  city: city?.name ?? initialLocation.parent?.name ?? "",
                  area: initialLocation.name ?? "",
                },
              }),
            );
          }
        }
      } catch (requestError) {
        if (!ignore) {
          setHierarchyError(getErrorMessage(requestError));
        }
      } finally {
        if (!ignore) {
          setHierarchyLoading(false);
        }
      }
    };

    hydrateCascade();

    return () => {
      ignore = true;
    };
  }, [initialLocation]);


  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleResolvedLocation = (resolvedLocation, context = {}) => {
    const matches = resolvedLocation?.matches ?? {};
    const labels = getResolvedLabels(resolvedLocation);
    const automaticTarget = !isEditing
      ? getAutomaticCreateTarget(resolvedLocation)
      : null;

    if (!isEditing) {
      setResolvedHierarchy(resolvedLocation);
    }

    setCascade((current) => {
      const preserveSavedHierarchy = isEditing && context.source === "initial";

      return mergeCascade(current, {
        province: preserveSavedHierarchy
          ? current.province ?? getResolvedLocationId(matches.province)
          : getResolvedLocationId(matches.province),
        district: preserveSavedHierarchy
          ? current.district ?? getResolvedLocationId(matches.district)
          : getResolvedLocationId(matches.district),
        city: preserveSavedHierarchy
          ? current.city ?? getResolvedLocationId(matches.city)
          : getResolvedLocationId(matches.city),
        area: preserveSavedHierarchy
          ? current.area ?? getResolvedLocationId(matches.area)
          : getResolvedLocationId(matches.area),
        displayAddress: current.displayAddress || resolvedLocation?.displayName || "",
        labels: preserveSavedHierarchy ? mergeMissingLabels(current.labels, labels) : labels,
      });
    });

    setForm((current) => ({
      ...current,
      name: isEditing ? current.name : automaticTarget?.name ?? "",
      level: isEditing ? current.level : automaticTarget?.level ?? "province",
      map: resolvedLocation?.map ?? current.map,
    }));

    if (!(isEditing && context.source === "initial")) {
      setPendingLocationAutoSelection({
        key: `${Date.now()}:${resolvedLocation?.id ?? "manual"}`,
        matches,
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (hierarchyLoading || !canSubmitCreate) {
      return;
    }

    const payload = {
      name: isEditing ? form.name.trim() : automaticCreateTarget.name,
      sortOrder: Number(form.sortOrder),
      map: form.map,
      parentId: derivedParentId,
    };

    if (!isEditing) {
      payload.level = automaticCreateTarget.level;
    }

    const createdLocation = await onSubmit(payload);

    if (!isEditing && createdLocation) {
      resetCreateForm();
    }
  };
  return (
    <form className="stack" onSubmit={handleSubmit}>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Location Details</h2>
            <p className="muted">
              Maintain the canonical LANDZO location hierarchy.
            </p>
          </div>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Name</span>
            <input
              name="name"
              type="text"
              minLength={2}
              maxLength={120}
              required
              value={form.name}
              onChange={handleChange}
              readOnly={!isEditing}
              placeholder="Enter location name"
            />
          </label>

          <label className="field">
            <span>Sort Order</span>
            <input
              name="sortOrder"
              type="number"
              min="0"
              max="100000"
              step="1"
              required
              value={form.sortOrder}
              onChange={handleChange}
            />
          </label>
        </div>

        {hierarchyError ? (
          <div className="alert alert-danger" role="alert">
            {hierarchyError}
          </div>
        ) : null}
        {createTargetMessage ? (
          <div className="alert alert-info" role="status">
            {createTargetMessage}
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h2>Location</h2>
        <LocationFields
          value={cascade}
          onChange={setCascade}
          onCenterHintChange={setCenterHint}
          autoSelection={pendingLocationAutoSelection}
          onAutoSelectionApplied={() => setPendingLocationAutoSelection(null)}
          mode="derived"
        />
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Representative Map Point</h2>
            <p className="muted">Search or click the map to store a catalog center for this location.</p>
          </div>
        </div>
        <PropertyMapPicker
          value={form.map}
          onChange={(map) => {
            if (!map) {
              setResolvedHierarchy(null);
            }

            setForm((current) => ({
              ...current,
              name: map || isEditing ? current.name : "",
              level: map || isEditing ? current.level : "province",
              map,
            }));
          }}
          onResolvedLocation={handleResolvedLocation}
          centerHint={centerHint}
          emptyMessage="No representative map point selected yet. Click the map to place one."
          resolveInitialSelection={isEditing}
          resetKey={isEditing ? 0 : mapResetKey}
        />
      </section>

      <div className="form-actions">
        <button
          className="button primary"
          type="submit"
          disabled={submitting || hierarchyLoading || !canSubmitCreate}
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
};