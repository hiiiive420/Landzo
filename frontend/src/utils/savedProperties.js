export const SAVED_PROPERTIES_STORAGE_KEY = "landzo:saved-properties";
export const SAVED_PROPERTIES_CHANGED_EVENT = "landzo:saved-properties-changed";

const MAX_SAVED_PROPERTIES = 100;
const PROPERTY_CODE_PATTERN = /^[A-Z0-9]+-[A-Z0-9-]+$/;
let memorySavedPropertyCodes = [];

export const normalizePropertyCode = (propertyCode) => {
  if (typeof propertyCode !== "string") {
    return null;
  }

  const normalized = propertyCode.trim().toUpperCase();

  if (
    normalized.length < 5 ||
    normalized.length > 48 ||
    !PROPERTY_CODE_PATTERN.test(normalized)
  ) {
    return null;
  }

  return normalized;
};

const getStorage = () => {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
};

const normalizeCodes = (codes) => {
  if (!Array.isArray(codes)) {
    return [];
  }

  const normalizedCodes = [];

  codes.forEach((code) => {
    const normalized = normalizePropertyCode(code);

    if (normalized && !normalizedCodes.includes(normalized)) {
      normalizedCodes.push(normalized);
    }
  });

  return normalizedCodes.slice(0, MAX_SAVED_PROPERTIES);
};

const emitSavedPropertiesChanged = (codes) => {
  window.dispatchEvent(
    new CustomEvent(SAVED_PROPERTIES_CHANGED_EVENT, {
      detail: {
        codes,
      },
    }),
  );
};

const writeSavedPropertyCodes = (codes, { emit = true } = {}) => {
  const storage = getStorage();
  const normalizedCodes = normalizeCodes(codes);
  memorySavedPropertyCodes = normalizedCodes;

  if (storage) {
    try {
      storage.setItem(
        SAVED_PROPERTIES_STORAGE_KEY,
        JSON.stringify(normalizedCodes),
      );
    } catch {
      // Browser storage can fail in private or restricted contexts; keep this-tab state usable.
    }
  }

  if (emit) {
    emitSavedPropertiesChanged(normalizedCodes);
  }

  return normalizedCodes;
};

export const getSavedPropertyCodes = () => {
  const storage = getStorage();

  if (!storage) {
    return memorySavedPropertyCodes;
  }

  try {
    const parsed = JSON.parse(
      storage.getItem(SAVED_PROPERTIES_STORAGE_KEY) || "[]",
    );
    const normalizedCodes = normalizeCodes(parsed);

    if (JSON.stringify(parsed) !== JSON.stringify(normalizedCodes)) {
      writeSavedPropertyCodes(normalizedCodes, { emit: false });
    } else {
      memorySavedPropertyCodes = normalizedCodes;
    }

    return normalizedCodes;
  } catch {
    writeSavedPropertyCodes([], { emit: false });

    return [];
  }
};

export const isPropertySaved = (propertyCode) => {
  const normalized = normalizePropertyCode(propertyCode);

  return normalized ? getSavedPropertyCodes().includes(normalized) : false;
};

export const saveProperty = (propertyCode) => {
  const normalized = normalizePropertyCode(propertyCode);

  if (!normalized) {
    return { changed: false, saved: false, codes: getSavedPropertyCodes() };
  }

  const currentCodes = getSavedPropertyCodes();

  if (currentCodes.includes(normalized)) {
    return { changed: false, saved: true, codes: currentCodes };
  }

  const nextCodes = writeSavedPropertyCodes([
    normalized,
    ...currentCodes,
  ]);

  return { changed: true, saved: true, codes: nextCodes };
};

export const unsaveProperty = (propertyCode) => {
  const normalized = normalizePropertyCode(propertyCode);

  if (!normalized) {
    return { changed: false, saved: false, codes: getSavedPropertyCodes() };
  }

  const currentCodes = getSavedPropertyCodes();

  if (!currentCodes.includes(normalized)) {
    return { changed: false, saved: false, codes: currentCodes };
  }

  const nextCodes = writeSavedPropertyCodes(
    currentCodes.filter((code) => code !== normalized),
  );

  return { changed: true, saved: false, codes: nextCodes };
};

export const toggleSavedProperty = (propertyCode) => {
  if (isPropertySaved(propertyCode)) {
    return unsaveProperty(propertyCode);
  }

  return saveProperty(propertyCode);
};

export const pruneSavedPropertyCodes = (propertyCodes) =>
  writeSavedPropertyCodes(propertyCodes, { emit: true });

export const subscribeToSavedProperties = (callback) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => callback(getSavedPropertyCodes());
  const handleStorage = (event) => {
    if (event.key === SAVED_PROPERTIES_STORAGE_KEY) {
      handleChange();
    }
  };

  window.addEventListener(SAVED_PROPERTIES_CHANGED_EVENT, handleChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(SAVED_PROPERTIES_CHANGED_EVENT, handleChange);
    window.removeEventListener("storage", handleStorage);
  };
};