import {
  useEffect,
  useState,
} from "react";
import {
  Link,
} from "react-router-dom";

import {
  getAnalyticsSummary,
} from "../../../api/analytics.api";
import {
  getErrorMessage,
} from "../../../api/apiClient";
import {
  Alert,
} from "../../../components/common/Alert";
import {
  EmptyState,
} from "../../../components/common/EmptyState";
import {
  formatDateTime,
} from "../../../utils/formatters";

const rangeOptions = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

const metricDefinitions = [
  { key: "propertyViews", label: "Property Views" },
  { key: "propertySaves", label: "Property Saves" },
  { key: "propertyUnsaves", label: "Property Unsaves" },
  { key: "enquiriesSubmitted", label: "Enquiries" },
  { key: "mapInteractions", label: "Map Interactions" },
  { key: "whatsappClicks", label: "WhatsApp Clicks" },
];

const propertyTypeLabels = {
  land: "Land",
  house: "House",
  apartment: "Apartment",
  commercial: "Commercial",
};

const transactionTypeLabels = {
  sale: "Sale",
  rent: "Rent",
  lease: "Lease",
};

const filterLabels = {
  province: "Province",
  district: "District",
  city: "City",
  area: "Area",
  propertyType: "Property type",
  transactionType: "Transaction",
  currency: "Currency",
  featured: "Featured",
  status: "Status",
  minPrice: "Minimum budget",
  maxPrice: "Maximum budget",
};

const formatLocationLabel = (item = {}) => {
  const location = item.location || {};
  if (!location.name) {
    return "Unknown location";
  }
  return location.level ? `${location.name} (${location.level})` : location.name;
};

const formatBudgetLabel = (item = {}) => {
  const currency = item.currency || "Any currency";
  const min = item.minPrice ? formatCount(item.minPrice) : null;
  const max = item.maxPrice ? formatCount(item.maxPrice) : null;

  if (min && max) {
    return `${currency} ${min} - ${max}`;
  }
  if (max) {
    return `Up to ${currency} ${max}`;
  }
  if (min) {
    return `${currency} ${min}+`;
  }
  return "Budget not specified";
};
const topSections = [
  {
    key: "topViewedProperties",
    title: "Top Viewed Properties",
    countLabel: "views",
  },
  {
    key: "topSavedProperties",
    title: "Top Saved Properties",
    countLabel: "saves",
  },
  {
    key: "topEnquiredProperties",
    title: "Top Enquired Properties",
    countLabel: "enquiries",
  },
];

const formatCount = (value) =>
  Number(value || 0).toLocaleString("en");

const formatPeriod = (period) => {
  if (!period?.start) {
    return period?.end
      ? `Through ${formatDateTime(period.end)}`
      : "All recorded events";
  }

  return `${formatDateTime(period.start)} to ${formatDateTime(period.end)}`;
};

const AnalyticsCountList = ({ title, description, countLabel, items = [], getLabel }) => (
  <section className="panel analytics-top-panel">
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        <p className="muted">{description}</p>
      </div>
    </div>

    {items.length ? (
      <div className="analytics-ranking-list">
        {items.map((item, index) => (
          <div className="analytics-ranking-row" key={`${title}-${index}-${getLabel(item)}` }>
            <span className="analytics-rank">{index + 1}</span>
            <div className="analytics-property-label">
              <strong>{getLabel(item)}</strong>
            </div>
            <strong className="analytics-count">
              {formatCount(item.count)} {countLabel}
            </strong>
          </div>
        ))}
      </div>
    ) : (
      <EmptyState title="No matching data yet">
        This section will fill as matching activity is recorded.
      </EmptyState>
    )}
  </section>
);

const getPropertyTypeLabel = (item = {}) =>
  propertyTypeLabels[item.propertyType] || item.propertyType || "Unknown type";

const getTransactionTypeLabel = (item = {}) =>
  transactionTypeLabels[item.transactionType] || item.transactionType || "Unknown transaction";

const getFilterLabel = (item = {}) =>
  filterLabels[item.filter] || item.filter || "Unknown filter";
const TopPropertyList = ({ title, countLabel, items = [] }) => (
  <section className="panel analytics-top-panel">
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        <p className="muted">
          Ranked by recorded action count.
        </p>
      </div>
    </div>

    {items.length ? (
      <div className="analytics-ranking-list">
        {items.map((item, index) => {
          const property = item.property || {};
          const label = property.code || "Historical property";
          const titleText = property.title || "Property details unavailable";

          return (
            <div
              className="analytics-ranking-row"
              key={`${label}-${index}`}
            >
              <span className="analytics-rank">
                {index + 1}
              </span>

              <div className="analytics-property-label">
                <strong>{label}</strong>
                <span>{titleText}</span>
              </div>

              <strong className="analytics-count">
                {formatCount(item.count)} {countLabel}
              </strong>

              {property.id ? (
                <Link
                  className="button secondary small"
                  to={`/admin/properties/${property.id}/edit`}
                >
                  Open Property
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>
    ) : (
      <EmptyState title="No property data yet">
        This list will fill as matching property events are recorded.
      </EmptyState>
    )}
  </section>
);

export const AnalyticsPage = () => {
  const [range, setRange] = useState("30d");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadSummary = async () => {
      await Promise.resolve();

      if (active) {
        setLoading(true);
        setError("");
      }

      try {
        const result = await getAnalyticsSummary({ range });

        if (active) {
          setSummary(result);
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSummary();

    return () => {
      active = false;
    };
  }, [range]);

  const metrics = summary?.metrics || {};
  const searchInsights = summary?.searchInsights || {};

  return (
    <div className="stack analytics-page">
      <section className="page-heading row-between">
        <div>
          <p className="eyebrow">Insights</p>
          <h1>Analytics</h1>
          <p className="muted">
            Lightweight recorded interaction counts for LANDZO properties, enquiries, maps and WhatsApp actions.
          </p>
        </div>

        <label className="field analytics-range-field">
          <span>Range</span>
          <select
            value={range}
            onChange={(event) =>
              setRange(event.target.value)
            }
          >
            {rangeOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <Alert tone="danger">{error}</Alert>

      {summary?.period ? (
        <p className="muted analytics-period">
          {formatPeriod(summary.period)}
        </p>
      ) : null}

      {loading ? (
        <section className="panel">
          <p>Loading analytics...</p>
        </section>
      ) : null}

      {!loading && summary ? (
        <>
          <section className="analytics-metric-grid">
            {metricDefinitions.map((metric) => (
              <article
                className="panel analytics-metric-card"
                key={metric.key}
              >
                <span>{metric.label}</span>
                <strong>{formatCount(metrics[metric.key])}</strong>
              </article>
            ))}
          </section>

          <section className="analytics-top-grid">
            {topSections.map((section) => (
              <TopPropertyList
                key={section.key}
                title={section.title}
                countLabel={section.countLabel}
                items={summary[section.key] || []}
              />
            ))}
          </section>
          <section className="analytics-top-grid">
            <AnalyticsCountList
              title="Most Viewed Locations"
              description="Locations attached to recorded Property activity."
              countLabel="events"
              items={summary.locationActivity || []}
              getLabel={formatLocationLabel}
            />
            <AnalyticsCountList
              title="Property Type Analytics"
              description="Activity grouped by authoritative Property type."
              countLabel="events"
              items={summary.propertyTypeActivity || []}
              getLabel={getPropertyTypeLabel}
            />
            <AnalyticsCountList
              title="Transaction Analytics"
              description="Activity grouped by selected transaction type."
              countLabel="events"
              items={summary.transactionActivity || []}
              getLabel={getTransactionTypeLabel}
            />
          </section>

          <section className="analytics-top-grid" aria-label="Location Analytics">
            <AnalyticsCountList
              title="Most Searched Districts"
              description="District filters selected in public searches."
              countLabel="searches"
              items={(searchInsights.searchedLocations || []).filter((item) => item.location?.level === "district")}
              getLabel={formatLocationLabel}
            />
            <AnalyticsCountList
              title="Most Searched Locations"
              description="Structured location filters selected by visitors."
              countLabel="searches"
              items={searchInsights.searchedLocations || []}
              getLabel={formatLocationLabel}
            />
            <AnalyticsCountList
              title="Popular Property Areas"
              description="Area filters selected in public searches."
              countLabel="searches"
              items={(searchInsights.searchedLocations || []).filter((item) => item.location?.level === "area")}
              getLabel={formatLocationLabel}
            />
          </section>

          <section className="analytics-top-grid" aria-label="Search Insights">
            <AnalyticsCountList
              title="Most Selected Property Types"
              description="Public search filters grouped by Property type."
              countLabel="searches"
              items={searchInsights.selectedPropertyTypes || []}
              getLabel={getPropertyTypeLabel}
            />
            <AnalyticsCountList
              title="Common Budgets"
              description="Budget ranges selected in public searches."
              countLabel="searches"
              items={searchInsights.commonBudgets || []}
              getLabel={formatBudgetLabel}
            />
            <AnalyticsCountList
              title="Most Selected Filters"
              description="Structured filters most often used by visitors."
              countLabel="uses"
              items={searchInsights.selectedFilters || []}
              getLabel={getFilterLabel}
            />
            <AnalyticsCountList
              title="Selected Transactions"
              description="Public search filters grouped by transaction type."
              countLabel="searches"
              items={searchInsights.selectedTransactionTypes || []}
              getLabel={getTransactionTypeLabel}
            />
            <article className="panel analytics-metric-card">
              <span>Searches with Zero Results</span>
              <strong>{formatCount(searchInsights.zeroResultSearches)}</strong>
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
};
