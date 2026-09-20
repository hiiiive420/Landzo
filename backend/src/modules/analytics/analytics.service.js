import { AppError } from "../../common/errors/AppError.js";
import { logger } from "../../common/logging/logger.js";
import { Property } from "../properties/property.model.js";

import {
  ANALYTICS_DEFAULT_RANGE,
  ANALYTICS_EVENT_TYPES,
  ANALYTICS_EVENT_TYPE_VALUES,
  ANALYTICS_RANGES,
  ANALYTICS_TOP_PROPERTY_LIMIT,
  PROPERTY_OPTIONAL_EVENT_TYPES,
  PROPERTY_REQUIRED_EVENT_TYPES,
  PUBLIC_ANALYTICS_EVENT_TYPES,
} from "./analytics.constants.js";
import { AnalyticsEvent } from "./analyticsEvent.model.js";
import { SearchInsight } from "./searchInsight.model.js";

const dayMs = 24 * 60 * 60 * 1000;

const metricKeysByEventType = Object.freeze({
  [ANALYTICS_EVENT_TYPES.PROPERTY_VIEW]: "propertyViews",
  [ANALYTICS_EVENT_TYPES.PROPERTY_SAVE]: "propertySaves",
  [ANALYTICS_EVENT_TYPES.PROPERTY_UNSAVE]: "propertyUnsaves",
  [ANALYTICS_EVENT_TYPES.ENQUIRY_SUBMITTED]: "enquiriesSubmitted",
  [ANALYTICS_EVENT_TYPES.MAP_INTERACTION]: "mapInteractions",
  [ANALYTICS_EVENT_TYPES.WHATSAPP_CLICK]: "whatsappClicks",
});

const emptyMetrics = () => ({
  propertyViews: 0,
  propertySaves: 0,
  propertyUnsaves: 0,
  enquiriesSubmitted: 0,
  mapInteractions: 0,
  whatsappClicks: 0,
});

const toAnalyticsEventNotAllowedError = () =>
  new AppError(
    400,
    "Analytics event type is not allowed for this endpoint",
    "ANALYTICS_EVENT_NOT_ALLOWED",
  );

const toAnalyticsPropertyRequiredError = () =>
  new AppError(
    400,
    "Property id is required for this analytics event",
    "ANALYTICS_PROPERTY_REQUIRED",
  );

const toAnalyticsPropertyNotPublicError = () =>
  new AppError(
    404,
    "Property not found",
    "ANALYTICS_PROPERTY_NOT_PUBLIC",
  );

const buildContext = (context = {}) => {
  if (!context?.surface) {
    return undefined;
  }

  return {
    surface: context.surface,
  };
};

const requireValidEventType = (eventType) => {
  if (!ANALYTICS_EVENT_TYPE_VALUES.includes(eventType)) {
    throw toAnalyticsEventNotAllowedError();
  }
};

const validatePublicProperty = async (propertyId) => {
  const property = await Property.findOne({
    _id: propertyId,
    isPublic: true,
    deletedAt: null,
  }).select("_id");

  if (!property) {
    throw toAnalyticsPropertyNotPublicError();
  }

  return property._id;
};

const recordAnalyticsEvent = async ({
  eventType,
  propertyId,
  context,
  requirePublicProperty = false,
}) => {
  requireValidEventType(eventType);

  const property = propertyId
    ? requirePublicProperty
      ? await validatePublicProperty(propertyId)
      : propertyId
    : null;

  const event = await AnalyticsEvent.create({
    eventType,
    property,
    context: buildContext(context),
  });

  return event;
};

export const recordPublicAnalyticsEvent = async ({
  eventType,
  propertyId,
  context,
}) => {
  if (!PUBLIC_ANALYTICS_EVENT_TYPES.includes(eventType)) {
    throw toAnalyticsEventNotAllowedError();
  }

  if (PROPERTY_REQUIRED_EVENT_TYPES.includes(eventType) && !propertyId) {
    throw toAnalyticsPropertyRequiredError();
  }

  if (
    propertyId &&
    (PROPERTY_REQUIRED_EVENT_TYPES.includes(eventType) ||
      PROPERTY_OPTIONAL_EVENT_TYPES.includes(eventType))
  ) {
    await validatePublicProperty(propertyId);
  }

  await recordAnalyticsEvent({
    eventType,
    propertyId: propertyId ?? null,
    context,
    requirePublicProperty: false,
  });

  return {
    recorded: true,
  };
};

export const recordServerAnalyticsEvent = async ({
  eventType,
  propertyId = null,
  context,
}) => {
  await recordAnalyticsEvent({
    eventType,
    propertyId,
    context,
    requirePublicProperty: false,
  });
};

export const recordServerAnalyticsEventSafely = async ({
  eventType,
  propertyId = null,
  context,
}) => {
  try {
    await recordServerAnalyticsEvent({
      eventType,
      propertyId,
      context,
    });
  } catch (error) {
    logger.warn("Analytics event recording failed", {
      eventType,
      propertyId: propertyId?.toString?.() ?? propertyId ?? null,
      errorName: error?.name,
    });
  }
};

const getRangePeriod = ({
  range = ANALYTICS_DEFAULT_RANGE,
  now = new Date(),
} = {}) => {
  const end = new Date(now);

  if (range === ANALYTICS_RANGES.ALL) {
    return {
      start: null,
      end,
    };
  }

  const days = range === ANALYTICS_RANGES.SEVEN_DAYS ? 7 : 30;

  return {
    start: new Date(end.getTime() - days * dayMs),
    end,
  };
};

const buildRangeMatch = (period) => {
  if (!period.start) {
    return {};
  }

  return {
    createdAt: {
      $gte: period.start,
      $lte: period.end,
    },
  };
};

const buildTopPropertyPipeline = (eventType) => [
  {
    $match: {
      eventType,
      property: { $ne: null },
    },
  },
  {
    $group: {
      _id: "$property",
      count: { $sum: 1 },
    },
  },
  {
    $sort: {
      count: -1,
      _id: 1,
    },
  },
  { $limit: ANALYTICS_TOP_PROPERTY_LIMIT },
  {
    $lookup: {
      from: "properties",
      localField: "_id",
      foreignField: "_id",
      as: "propertyDoc",
      pipeline: [
        {
          $project: {
            code: 1,
            title: 1,
          },
        },
      ],
    },
  },
  {
    $unwind: {
      path: "$propertyDoc",
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $project: {
      _id: 0,
      count: 1,
      property: {
        id: { $toString: "$_id" },
        code: { $ifNull: ["$propertyDoc.code", null] },
        title: { $ifNull: ["$propertyDoc.title", null] },
      },
    },
  },
];


const searchInsightFilterKeys = Object.freeze([
  ["provinceId", "province"],
  ["districtId", "district"],
  ["cityId", "city"],
  ["areaId", "area"],
  ["type", "propertyType"],
  ["transactionType", "transactionType"],
  ["currency", "currency"],
  ["featured", "featured"],
  ["status", "status"],
  ["minPrice", "minPrice"],
  ["maxPrice", "maxPrice"],
]);

const buildSearchInsightPayload = ({ query, resultCount }) => {
  const filters = searchInsightFilterKeys
    .filter(([queryKey]) => query[queryKey] !== undefined && query[queryKey] !== "")
    .map(([, filterKey]) => filterKey);

  if (!filters.length) {
    return null;
  }

  return {
    province: query.provinceId ?? null,
    district: query.districtId ?? null,
    city: query.cityId ?? null,
    area: query.areaId ?? null,
    propertyType: query.type ?? null,
    transactionType: query.transactionType ?? null,
    currency: query.currency ?? null,
    minPrice: query.minPrice ?? null,
    maxPrice: query.maxPrice ?? null,
    filters,
    resultCount,
  };
};

export const recordSearchInsightSafely = async ({ query, resultCount }) => {
  try {
    const payload = buildSearchInsightPayload({ query, resultCount });

    if (!payload) {
      return;
    }

    await SearchInsight.create(payload);
  } catch (error) {
    logger.warn("Search insight recording failed", {
      errorName: error?.name,
      errorCode: error?.code ?? null,
    });
  }
};

const buildLocationActivityPipeline = () => [
  { $match: { property: { $ne: null } } },
  {
    $lookup: {
      from: "properties",
      localField: "property",
      foreignField: "_id",
      as: "propertyDoc",
    },
  },
  { $unwind: "$propertyDoc" },
  {
    $project: {
      locationId: {
        $ifNull: [
          "$propertyDoc.city",
          { $ifNull: ["$propertyDoc.district", "$propertyDoc.province"] },
        ],
      },
    },
  },
  { $match: { locationId: { $ne: null } } },
  {
    $group: {
      _id: "$locationId",
      count: { $sum: 1 },
    },
  },
  { $sort: { count: -1, _id: 1 } },
  { $limit: ANALYTICS_TOP_PROPERTY_LIMIT },
  {
    $lookup: {
      from: "locations",
      localField: "_id",
      foreignField: "_id",
      as: "locationDoc",
    },
  },
  { $unwind: { path: "$locationDoc", preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 0,
      count: 1,
      location: {
        id: { $toString: "$_id" },
        name: { $ifNull: ["$locationDoc.name", null] },
        level: { $ifNull: ["$locationDoc.level", null] },
      },
    },
  },
];

const buildPropertyTypeActivityPipeline = () => [
  { $match: { property: { $ne: null } } },
  {
    $lookup: {
      from: "properties",
      localField: "property",
      foreignField: "_id",
      as: "propertyDoc",
    },
  },
  { $unwind: "$propertyDoc" },
  {
    $group: {
      _id: "$propertyDoc.type",
      count: { $sum: 1 },
    },
  },
  { $sort: { count: -1, _id: 1 } },
  {
    $project: {
      _id: 0,
      propertyType: "$_id",
      count: 1,
    },
  },
];

const buildTransactionActivityPipeline = () => [
  { $match: { property: { $ne: null } } },
  {
    $lookup: {
      from: "properties",
      localField: "property",
      foreignField: "_id",
      as: "propertyDoc",
    },
  },
  { $unwind: "$propertyDoc" },
  { $unwind: "$propertyDoc.transactionTypes" },
  {
    $group: {
      _id: "$propertyDoc.transactionTypes",
      count: { $sum: 1 },
    },
  },
  { $sort: { count: -1, _id: 1 } },
  {
    $project: {
      _id: 0,
      transactionType: "$_id",
      count: 1,
    },
  },
];

const buildSearchLocationPipeline = () => [
  {
    $project: {
      locationId: {
        $ifNull: [
          "$area",
          { $ifNull: ["$city", { $ifNull: ["$district", "$province"] }] },
        ],
      },
    },
  },
  { $match: { locationId: { $ne: null } } },
  {
    $group: {
      _id: "$locationId",
      count: { $sum: 1 },
    },
  },
  { $sort: { count: -1, _id: 1 } },
  { $limit: ANALYTICS_TOP_PROPERTY_LIMIT },
  {
    $lookup: {
      from: "locations",
      localField: "_id",
      foreignField: "_id",
      as: "locationDoc",
    },
  },
  { $unwind: { path: "$locationDoc", preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 0,
      count: 1,
      location: {
        id: { $toString: "$_id" },
        name: { $ifNull: ["$locationDoc.name", null] },
        level: { $ifNull: ["$locationDoc.level", null] },
      },
    },
  },
];

const buildSearchValuePipeline = (field, outputKey) => [
  { $match: { [field]: { $ne: null } } },
  {
    $group: {
      _id: `$${field}`,
      count: { $sum: 1 },
    },
  },
  { $sort: { count: -1, _id: 1 } },
  { $limit: ANALYTICS_TOP_PROPERTY_LIMIT },
  {
    $project: {
      _id: 0,
      [outputKey]: "$_id",
      count: 1,
    },
  },
];

const buildCommonBudgetPipeline = () => [
  {
    $match: {
      $or: [{ minPrice: { $ne: null } }, { maxPrice: { $ne: null } }],
    },
  },
  {
    $group: {
      _id: {
        currency: "$currency",
        minPrice: "$minPrice",
        maxPrice: "$maxPrice",
      },
      count: { $sum: 1 },
    },
  },
  { $sort: { count: -1, "_id.maxPrice": 1, "_id.minPrice": 1 } },
  { $limit: ANALYTICS_TOP_PROPERTY_LIMIT },
  {
    $project: {
      _id: 0,
      currency: "$_id.currency",
      minPrice: "$_id.minPrice",
      maxPrice: "$_id.maxPrice",
      count: 1,
    },
  },
];

const buildSelectedFilterPipeline = () => [
  { $unwind: "$filters" },
  {
    $group: {
      _id: "$filters",
      count: { $sum: 1 },
    },
  },
  { $sort: { count: -1, _id: 1 } },
  {
    $project: {
      _id: 0,
      filter: "$_id",
      count: 1,
    },
  },
];

const getSearchInsightsSummary = async (period) => {
  const [result = {}] = await SearchInsight.aggregate([
    { $match: buildRangeMatch(period) },
    {
      $facet: {
        searchedLocations: buildSearchLocationPipeline(),
        selectedPropertyTypes: buildSearchValuePipeline("propertyType", "propertyType"),
        selectedTransactionTypes: buildSearchValuePipeline("transactionType", "transactionType"),
        commonBudgets: buildCommonBudgetPipeline(),
        selectedFilters: buildSelectedFilterPipeline(),
        zeroResultSearches: [{ $match: { resultCount: 0 } }, { $count: "count" }],
      },
    },
  ]).exec();

  return {
    searchedLocations: result.searchedLocations ?? [],
    selectedPropertyTypes: result.selectedPropertyTypes ?? [],
    selectedTransactionTypes: result.selectedTransactionTypes ?? [],
    commonBudgets: result.commonBudgets ?? [],
    selectedFilters: result.selectedFilters ?? [],
    zeroResultSearches: result.zeroResultSearches?.[0]?.count ?? 0,
  };
};
const mapCountsToMetrics = (eventCounts = []) => {
  const metrics = emptyMetrics();

  eventCounts.forEach((item) => {
    const key = metricKeysByEventType[item._id];

    if (key) {
      metrics[key] = item.count;
    }
  });

  return metrics;
};

export const getAnalyticsSummary = async ({
  range = ANALYTICS_DEFAULT_RANGE,
  now = new Date(),
} = {}) => {
  const period = getRangePeriod({ range, now });
  const [result = {}] = await AnalyticsEvent.aggregate([
    { $match: buildRangeMatch(period) },
    {
      $facet: {
        eventCounts: [
          {
            $group: {
              _id: "$eventType",
              count: { $sum: 1 },
            },
          },
        ],
        topViewedProperties: buildTopPropertyPipeline(
          ANALYTICS_EVENT_TYPES.PROPERTY_VIEW,
        ),
        topSavedProperties: buildTopPropertyPipeline(
          ANALYTICS_EVENT_TYPES.PROPERTY_SAVE,
        ),
        topEnquiredProperties: buildTopPropertyPipeline(
          ANALYTICS_EVENT_TYPES.ENQUIRY_SUBMITTED,
        ),
        locationActivity: buildLocationActivityPipeline(),
        propertyTypeActivity: buildPropertyTypeActivityPipeline(),
        transactionActivity: buildTransactionActivityPipeline(),
      },
    },
  ]).exec();
  const searchInsights = await getSearchInsightsSummary(period);

  return {
    range,
    period,
    metrics: mapCountsToMetrics(result.eventCounts),
    topViewedProperties: result.topViewedProperties ?? [],
    topSavedProperties: result.topSavedProperties ?? [],
    topEnquiredProperties: result.topEnquiredProperties ?? [],
    locationActivity: result.locationActivity ?? [],
    propertyTypeActivity: result.propertyTypeActivity ?? [],
    transactionActivity: result.transactionActivity ?? [],
    searchInsights,
  };
};
