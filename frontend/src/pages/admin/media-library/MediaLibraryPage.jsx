import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
} from "react-router-dom";

import {
  getErrorMessage,
} from "../../../api/apiClient";
import {
  getMediaLibrary,
} from "../../../api/mediaLibrary.api";
import {
  Alert,
} from "../../../components/common/Alert";
import {
  EmptyState,
} from "../../../components/common/EmptyState";
import {
  formatDateTime,
  formatLabel,
} from "../../../utils/formatters";

const sourceOptions = [
  { value: "", label: "All" },
  { value: "property", label: "Property" },
  { value: "blog", label: "Blog" },
  { value: "homepage", label: "Homepage" },
];

const formatOptions = [
  { value: "", label: "All" },
  { value: "webp", label: "WebP" },
  { value: "jpg", label: "JPG" },
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" },
];

const defaultFilters = {
  page: 1,
  limit: 24,
  source: "",
  search: "",
  format: "",
};

const getOpenLabel = (source) => {
  if (source === "property") {
    return "Open Property";
  }

  if (source === "blog") {
    return "Open Blog";
  }

  if (source === "homepage") {
    return "Open Homepage";
  }

  return "Open";
};

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${Number.parseFloat(kilobytes.toFixed(1))} KB`;
  }

  const megabytes = kilobytes / 1024;

  return `${Number.parseFloat(megabytes.toFixed(1))} MB`;
};

const formatDimensions = (width, height) => {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return "";
  }

  return `${width} x ${height}`;
};

const buildQuery = (filters) =>
  Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== "",
    ),
  );

const MediaCard = ({ item }) => {
  const dimensions = formatDimensions(
    item.width,
    item.height,
  );
  const fileSize = formatFileSize(item.bytes);
  const meta = [
    dimensions,
    item.format?.toUpperCase(),
    fileSize,
  ].filter(Boolean);

  return (
    <article className="media-library-card">
      <div className="media-library-preview">
        <img
          src={item.url}
          alt={
            item.alt ||
            `${formatLabel(item.source)} ${formatLabel(item.role)} media`
          }
          loading="lazy"
        />

        <span className="media-library-source">
          {formatLabel(item.source)}
        </span>
      </div>

      <div className="media-library-card-body">
        <div>
          <p className="media-library-role">
            {formatLabel(item.role)}
          </p>

          <h2>{item.owner?.label || "Untitled owner"}</h2>

          {item.owner?.secondaryLabel ? (
            <p className="muted">
              {item.owner.secondaryLabel}
            </p>
          ) : null}
        </div>

        {meta.length ? (
          <p className="media-library-meta">
            {meta.join(" | ")}
          </p>
        ) : null}

        <div className="media-library-card-footer">
          {item.timestamp ? (
            <span>
              Updated {formatDateTime(item.timestamp)}
            </span>
          ) : null}

          {item.owner?.adminPath ? (
            <Link
              className="button secondary small"
              to={item.owner.adminPath}
            >
              {getOpenLabel(item.source)}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export const MediaLibraryPage = () => {
  const [filters, setFilters] =
    useState(defaultFilters);
  const [searchDraft, setSearchDraft] =
    useState("");
  const [items, setItems] =
    useState([]);
  const [meta, setMeta] =
    useState({
      page: 1,
      limit: defaultFilters.limit,
      total: 0,
      totalPages: 1,
    });
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  const query = useMemo(
    () => buildQuery(filters),
    [filters],
  );

  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.source) ||
    Boolean(filters.format);

  useEffect(() => {
    let active = true;

    const loadMedia = async () => {
      await Promise.resolve();

      if (active) {
        setLoading(true);
        setError("");
      }

      try {
        const response = await getMediaLibrary(query);

        if (active) {
          setItems(response.items || []);
          setMeta({
            page: response.page || 1,
            limit: response.limit || defaultFilters.limit,
            total: response.total || 0,
            totalPages: response.totalPages || 1,
          });
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

    void loadMedia();

    return () => {
      active = false;
    };
  }, [query]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
      page: 1,
    }));
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    updateFilter("search", searchDraft.trim());
  };

  return (
    <div className="stack media-library-page">
      <section className="page-heading row-between">
        <div>
          <p className="eyebrow">Content</p>
          <h1>Media Library</h1>
          <p className="muted">
            Browse public images currently used by Properties, Blogs and the Homepage. Edit media from its owning module.
          </p>
        </div>

        <span className="status-badge">
          {meta.total} media
        </span>
      </section>

      <Alert tone="danger">{error}</Alert>

      <section className="panel media-library-filters">
        <form
          className="media-library-search"
          onSubmit={handleSearchSubmit}
        >
          <label className="field">
            <span>Search</span>
            <input
              value={searchDraft}
              placeholder="Search owner, code or slot"
              onChange={(event) =>
                setSearchDraft(event.target.value)
              }
            />
          </label>

          <button
            className="button primary"
            type="submit"
          >
            Search
          </button>
        </form>

        <label className="field">
          <span>Source</span>
          <select
            value={filters.source}
            onChange={(event) =>
              updateFilter("source", event.target.value)
            }
          >
            {sourceOptions.map((option) => (
              <option
                key={option.label}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Format</span>
          <select
            value={filters.format}
            onChange={(event) =>
              updateFilter("format", event.target.value)
            }
          >
            {formatOptions.map((option) => (
              <option
                key={option.label}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {loading ? (
        <section className="panel">
          <p>Loading media library...</p>
        </section>
      ) : null}

      {!loading && !items.length ? (
        <section className="panel">
          <EmptyState
            title={
              hasActiveFilters
                ? "No media matches these filters"
                : "No media in the library yet"
            }
          >
            {hasActiveFilters
              ? "Try a different search, source or format."
              : "Images will appear here once Properties, Blogs or Homepage sections use public media."}
          </EmptyState>
        </section>
      ) : null}

      {!loading && items.length ? (
        <section className="media-library-grid">
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
            />
          ))}
        </section>
      ) : null}

      <div className="pagination">
        <button
          className="button secondary"
          type="button"
          disabled={meta.page <= 1}
          onClick={() =>
            setFilters((current) => ({
              ...current,
              page: current.page - 1,
            }))
          }
        >
          Previous
        </button>

        <span>
          Page {meta.page} of {meta.totalPages || 1} -{" "}
          {meta.total} total
        </span>

        <button
          className="button secondary"
          type="button"
          disabled={meta.page >= meta.totalPages}
          onClick={() =>
            setFilters((current) => ({
              ...current,
              page: current.page + 1,
            }))
          }
        >
          Next
        </button>
      </div>
    </div>
  );
};


