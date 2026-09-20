const separatorPattern = /[\s_.,/\\-]+/g;
const nonSlugCharacterPattern = /[^a-z0-9\s-]/g;

const normalizeToken = (token) => {
  if (/^\d+$/.test(token)) {
    return String(Number(token));
  }

  return token;
};

export const normalizeLocationName = (value) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(separatorPattern, " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(normalizeToken)
    .join(" ");

export const createLocationSlug = (value) => {
  const canonical = normalizeLocationName(value).replace(nonSlugCharacterPattern, "");
  return canonical.replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
};

export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
