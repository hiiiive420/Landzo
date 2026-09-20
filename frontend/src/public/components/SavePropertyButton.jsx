import { useSyncExternalStore } from "react";

import {
  analyticsEventTypes,
  recordAnalyticsEventSafely,
} from "../../api/analytics.api";
import {
  isPropertySaved,
  subscribeToSavedProperties,
  toggleSavedProperty,
} from "../../utils/savedProperties";
const PropertyHeartIcon = ({
  isSaved = false,
}) => (
  <svg
    aria-hidden="true"
    className="public-property-heart-icon"
    focusable="false"
    viewBox="0 0 24 24"
  >
    <path
      d="
        M12 20.3
        5.2 13.8
        A5.1 5.1 0 0 1
        12 6.7
        A5.1 5.1 0 0 1
        18.8 13.8
        Z
      "
      fill={
        isSaved
          ? "currentColor"
          : "none"
      }
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  </svg>
);
export const SavePropertyButton = ({
  propertyId,
  propertyCode,
  propertyTitle = "property",
  surface,
  className = "",
}) => {
  const saved = useSyncExternalStore(
    subscribeToSavedProperties,
    () => isPropertySaved(propertyCode),
    () => false,
  );

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const result = toggleSavedProperty(propertyCode);

    if (!result.changed || !propertyId) {
      return;
    }

    recordAnalyticsEventSafely({
      eventType: result.saved
        ? analyticsEventTypes.propertySave
        : analyticsEventTypes.propertyUnsave,
      propertyId,
      context: {
        surface,
      },
    });
  };

  const safeTitle = propertyTitle || "property";
  const label = saved
    ? `Remove ${safeTitle} from saved properties`
    : `Save ${safeTitle}`;

  return (
    <button
      aria-label={label}
      aria-pressed={saved}
      className={`public-save-button${saved ? " is-saved" : ""}${className ? ` ${className}` : ""}`}
      onClick={handleClick}
      type="button"
    >
      <PropertyHeartIcon
        isSaved={saved}
      />

      <span className="sr-only">
        {label}
      </span>
    </button>
  );
};