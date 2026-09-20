import { apiClient } from "./apiClient";
import { publicApiClient } from "./publicApiClient";

export const analyticsEventTypes = Object.freeze({
  propertyView: "property_view",
  propertySave: "property_save",
  propertyUnsave: "property_unsave",
  mapInteraction: "map_interaction",
  whatsappClick: "whatsapp_click",
});

export const analyticsSurfaces = Object.freeze({
  homepage: "homepage",
  propertyListing: "property_listing",
  propertyDetail: "property_detail",
  exploreMap: "explore_map",
  savedProperties: "saved_properties",
  enquiry: "enquiry",
});

const allowedEventTypes = new Set(Object.values(analyticsEventTypes));
const allowedSurfaces = new Set(Object.values(analyticsSurfaces));

export const getAnalyticsSummary = async ({ range } = {}) => {
  const params = range ? { range } : {};
  const { data } = await apiClient.get("/admin/analytics/summary", {
    params,
  });

  return data.data;
};

export const recordAnalyticsEvent = async ({
  eventType,
  propertyId,
  context,
} = {}) => {
  if (!allowedEventTypes.has(eventType)) {
    return { recorded: false };
  }

  const payload = {
    eventType,
  };

  if (propertyId) {
    payload.propertyId = propertyId;
  }

  if (context?.surface && allowedSurfaces.has(context.surface)) {
    payload.context = {
      surface: context.surface,
    };
  }

  const { data } = await publicApiClient.post(
    "/analytics/events",
    payload,
  );

  return data.data;
};

export const recordAnalyticsEventSafely = (event) => {
  void recordAnalyticsEvent(event).catch(() => {});
};
