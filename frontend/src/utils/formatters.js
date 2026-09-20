export const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export const formatLabel = (value) =>
  value
    ? value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "-";

const pricingPeriodSuffixes = {
  month: " / month",
  year: " / year",
  monthly: " / month",
  annual: " / year",
  total: " total lease",
};

export const formatPricing = (pricing) => {
  if (!pricing) {
    return "No pricing";
  }

  const sections = [pricing.sale, pricing.rent, pricing.lease].filter(Boolean);
  const first = sections[0];

  if (!first) {
    return pricing.currency;
  }

  const suffix = pricingPeriodSuffixes[first.period] || "";
  const amount = first.amount ? ` ${first.amount.toLocaleString()}` : "";
  return `${pricing.currency}${amount}${suffix} (${formatLabel(first.mode)})`;
};

export const formatLocation = (location) =>
  [location?.area?.name, location?.city?.name, location?.district?.name, location?.province?.name]
    .filter(Boolean)
    .join(", ") || "-";

export const toNumberOrUndefined = (value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  return Number(value);
};

export const cleanObject = (input) =>
  Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== ""),
  );

