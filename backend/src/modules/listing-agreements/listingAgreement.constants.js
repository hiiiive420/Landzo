export const LISTING_AGREEMENT_STATUSES = Object.freeze({
  GENERATED: "generated",
  PRINTED: "printed",
  SIGNED: "signed",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
});

export const LISTING_AGREEMENT_STATUS_VALUES = Object.freeze(
  Object.values(LISTING_AGREEMENT_STATUSES),
);
