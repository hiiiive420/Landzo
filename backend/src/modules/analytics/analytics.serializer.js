const serializeTopProperty = (item = {}) => ({
  count: item.count ?? 0,
  property: item.property
    ? {
        id: item.property.id ?? null,
        code: item.property.code ?? null,
        title: item.property.title ?? null,
      }
    : null,
});


const serializeLocationCount = (item = {}) => ({
  count: item.count ?? 0,
  location: item.location
    ? {
        id: item.location.id ?? null,
        name: item.location.name ?? null,
        level: item.location.level ?? null,
      }
    : null,
});

const serializePropertyTypeCount = (item = {}) => ({
  propertyType: item.propertyType ?? null,
  count: item.count ?? 0,
});

const serializeTransactionTypeCount = (item = {}) => ({
  transactionType: item.transactionType ?? null,
  count: item.count ?? 0,
});

const serializeBudgetCount = (item = {}) => ({
  currency: item.currency ?? null,
  minPrice: item.minPrice ?? null,
  maxPrice: item.maxPrice ?? null,
  count: item.count ?? 0,
});

const serializeFilterCount = (item = {}) => ({
  filter: item.filter ?? null,
  count: item.count ?? 0,
});
export const serializeAnalyticsSummary = (summary = {}) => ({
  range: summary.range,
  period: {
    start: summary.period?.start
      ? summary.period.start.toISOString()
      : null,
    end: summary.period?.end
      ? summary.period.end.toISOString()
      : null,
  },
  metrics: {
    propertyViews: summary.metrics?.propertyViews ?? 0,
    propertySaves: summary.metrics?.propertySaves ?? 0,
    propertyUnsaves: summary.metrics?.propertyUnsaves ?? 0,
    enquiriesSubmitted: summary.metrics?.enquiriesSubmitted ?? 0,
    mapInteractions: summary.metrics?.mapInteractions ?? 0,
    whatsappClicks: summary.metrics?.whatsappClicks ?? 0,
  },
  topViewedProperties: (summary.topViewedProperties ?? []).map(
    serializeTopProperty,
  ),
  topSavedProperties: (summary.topSavedProperties ?? []).map(
    serializeTopProperty,
  ),
  topEnquiredProperties: (summary.topEnquiredProperties ?? []).map(
    serializeTopProperty,
  ),
  locationActivity: (summary.locationActivity ?? []).map(
    serializeLocationCount,
  ),
  propertyTypeActivity: (summary.propertyTypeActivity ?? []).map(
    serializePropertyTypeCount,
  ),
  transactionActivity: (summary.transactionActivity ?? []).map(
    serializeTransactionTypeCount,
  ),
  searchInsights: {
    searchedLocations: (summary.searchInsights?.searchedLocations ?? []).map(
      serializeLocationCount,
    ),
    selectedPropertyTypes: (
      summary.searchInsights?.selectedPropertyTypes ?? []
    ).map(serializePropertyTypeCount),
    selectedTransactionTypes: (
      summary.searchInsights?.selectedTransactionTypes ?? []
    ).map(serializeTransactionTypeCount),
    commonBudgets: (summary.searchInsights?.commonBudgets ?? []).map(
      serializeBudgetCount,
    ),
    selectedFilters: (summary.searchInsights?.selectedFilters ?? []).map(
      serializeFilterCount,
    ),
    zeroResultSearches: summary.searchInsights?.zeroResultSearches ?? 0,
  },
});
