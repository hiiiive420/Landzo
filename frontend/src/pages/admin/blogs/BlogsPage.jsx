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
  deleteBlog,
  listBlogs,
  publishBlog,
  setBlogFeatured,
  unpublishBlog,
} from "../../../api/blogs.api";
import {
  PermissionGate,
} from "../../../auth/PermissionGate";
import {
  Alert,
} from "../../../components/common/Alert";
import {
  EmptyState,
} from "../../../components/common/EmptyState";
import {
  StatusBadge,
} from "../../../components/common/StatusBadge";
import {
  permissions,
} from "../../../utils/propertyOptions";
import {
  BLOG_FILTER_DEFAULTS,
  BLOG_SORT_OPTIONS,
  BLOG_STATUSES,
} from "./blog.constants.js";
import {
  formatBlogDate,
} from "./blog.helpers.js";

const EditIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
  >
    <path d="M4 20h4.6L19.2 9.4l-4.6-4.6L4 15.4V20z" />
    <path d="m13.4 6 4.6 4.6" />
  </svg>
);

const StarIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
  >
    <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3z" />
  </svg>
);

const PublishIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
  >
    <path d="M12 19V5" />
    <path d="m6 11 6-6 6 6" />
    <path d="M5 21h14" />
  </svg>
);

const UnpublishIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
  >
    <path d="M12 5v14" />
    <path d="m18 13-6 6-6-6" />
    <path d="M5 3h14" />
  </svg>
);

const TrashIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
  >
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M6 6l1 15h10l1-15" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
);

const getImageUrl = (image) =>
  image?.secureUrl ||
  image?.url ||
  "";

const formatAuthor = (author) =>
  author?.fullName ||
  author?.name ||
  "LANDZO";

export const BlogsPage = () => {
  const [filters, setFilters] =
    useState(
      BLOG_FILTER_DEFAULTS,
    );

  const [blogs, setBlogs] =
    useState([]);

  const [meta, setMeta] =
    useState({
      page: 1,
      totalPages: 1,
      total: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [busyAction, setBusyAction] =
    useState("");

  const [refreshKey, setRefreshKey] =
    useState(0);

  const query = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(
          filters,
        ).filter(
          ([, value]) =>
            value !== "",
        ),
      ),
    [filters],
  );

  useEffect(() => {
    let active = true;

    const loadBlogs = async () => {
      await Promise.resolve();

      if (active) {
        setLoading(true);
        setError("");
      }

      try {
        const response =
          await listBlogs(
            query,
          );

        if (active) {
          setBlogs(
            response.data ||
              [],
          );

          setMeta(
            response.meta || {
              page: 1,
              totalPages: 1,
              total: 0,
            },
          );
        }
      } catch (loadError) {
        if (active) {
          setError(
            getErrorMessage(
              loadError,
            ),
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadBlogs();

    return () => {
      active = false;
    };
  }, [
    query,
    refreshKey,
  ]);

  const updateFilter = (
    field,
    value,
  ) => {
    setFilters(
      (current) => ({
        ...current,
        [field]: value,
        page: 1,
      }),
    );
  };

  const refreshBlogs = () => {
    setRefreshKey(
      (current) =>
        current + 1,
    );
  };

  const runBlogAction = async ({
    blog,
    actionKey,
    action,
    successMessage,
  }) => {
    const key = `${actionKey}-${blog.id}`;

    setBusyAction(key);
    setError("");
    setNotice("");

    try {
      await action();

      setNotice(
        successMessage,
      );

      refreshBlogs();
    } catch (actionError) {
      setError(
        getErrorMessage(
          actionError,
        ),
      );
    } finally {
      setBusyAction("");
    }
  };

  const handlePublicationChange = (
    blog,
  ) => {
    const isPublished =
      blog.status ===
      "published";

    return runBlogAction({
      blog,

      actionKey:
        "publication",

      action: () =>
        isPublished
          ? unpublishBlog(
              blog.id,
            )
          : publishBlog(
              blog.id,
            ),

      successMessage:
        isPublished
          ? `"${blog.title}" unpublished`
          : `"${blog.title}" published`,
    });
  };

  const handleFeaturedChange = (
    blog,
  ) => {
    const nextFeatured =
      !blog.featured;

    return runBlogAction({
      blog,

      actionKey:
        "featured",

      action: () =>
        setBlogFeatured(
          blog.id,
          nextFeatured,
        ),

      successMessage:
        nextFeatured
          ? `"${blog.title}" marked as featured`
          : `"${blog.title}" removed from featured`,
    });
  };

  const handleDelete = async (
    blog,
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${blog.title}"?\n\nThe article will no longer appear in the Blog admin list or public website.`,
      );

    if (!confirmed) {
      return;
    }

    await runBlogAction({
      blog,

      actionKey: "delete",

      action: () =>
        deleteBlog(blog.id),

      successMessage:
        `"${blog.title}" deleted`,
    });
  };

  return (
    <div className="stack">
      <section className="page-heading row-between">
        <div>
          <p className="eyebrow">
            Content
          </p>

          <h1>Blogs</h1>
        </div>

        <PermissionGate
          permission={
            permissions.blogCreate
          }
        >
          <Link
            className="button primary"
            to="/admin/blogs/new"
          >
            New Draft
          </Link>
        </PermissionGate>
      </section>

      <Alert tone="danger">
        {error}
      </Alert>

      <Alert tone="success">
        {notice}
      </Alert>

      <section className="panel filters">
        <input
          placeholder="Search title, excerpt or tags"
          value={
            filters.search
          }
          onChange={(event) =>
            updateFilter(
              "search",
              event.target.value,
            )
          }
        />

        <input
          placeholder="Category"
          value={
            filters.category
          }
          onChange={(event) =>
            updateFilter(
              "category",
              event.target.value,
            )
          }
        />

        <select
          value={
            filters.status
          }
          onChange={(event) =>
            updateFilter(
              "status",
              event.target.value,
            )
          }
        >
          <option value="">
            All statuses
          </option>

          {BLOG_STATUSES.map(
            (status) => (
              <option
                key={
                  status.value
                }
                value={
                  status.value
                }
              >
                {status.label}
              </option>
            ),
          )}
        </select>

        <select
          value={
            filters.featured
          }
          onChange={(event) =>
            updateFilter(
              "featured",
              event.target.value,
            )
          }
        >
          <option value="">
            All articles
          </option>

          <option value="true">
            Featured
          </option>

          <option value="false">
            Not featured
          </option>
        </select>

        <select
          value={
            filters.sort
          }
          onChange={(event) =>
            updateFilter(
              "sort",
              event.target.value,
            )
          }
        >
          {BLOG_SORT_OPTIONS.map(
            (option) => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {option.label}
              </option>
            ),
          )}
        </select>
      </section>

      <section className="panel table-panel">
        {loading ? (
          <p>
            Loading Blogs...
          </p>
        ) : null}

        {!loading &&
        !blogs.length ? (
          <EmptyState
            title="No Blog articles found"
          />
        ) : null}

        {!loading &&
        blogs.length ? (
          <div className="table-wrap">
            <table className="property-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Article</th>
                  <th>Category</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Featured</th>
                  <th>Reading</th>
                  <th>Views</th>
                  <th>Publish Date</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {blogs.map(
                  (blog) => {
                    const imageUrl =
                      getImageUrl(
                        blog.featuredImage,
                      );

                    const isPublished =
                      blog.status ===
                      "published";

                    const publicationBusy =
                      busyAction ===
                      `publication-${blog.id}`;

                    const featuredBusy =
                      busyAction ===
                      `featured-${blog.id}`;

                    const deleteBusy =
                      busyAction ===
                      `delete-${blog.id}`;

                    const anyBusy =
                      Boolean(
                        busyAction,
                      );

                    return (
                      <tr
                        key={
                          blog.id
                        }
                      >
                        <td>
                          {imageUrl ? (
                            <img
                              src={
                                imageUrl
                              }
                              alt={
                                blog
                                  .featuredImage
                                  ?.alt ||
                                blog.title
                              }
                              width="72"
                              height="48"
                              style={{
                                objectFit:
                                  "cover",
                                borderRadius:
                                  "6px",
                              }}
                            />
                          ) : (
                            "-"
                          )}
                        </td>

                        <td>
                          <strong>
                            {
                              blog.title
                            }
                          </strong>

                          {blog.excerpt ? (
                            <div className="muted blog-table-excerpt">
                              {
                                blog.excerpt
                              }
                            </div>
                          ) : null}
                        </td>

                        <td>
                          {blog.category ||
                            "-"}
                        </td>

                        <td>
                          {formatAuthor(
                            blog.author,
                          )}
                        </td>

                        <td>
                          <StatusBadge>
                            {isPublished
                              ? "Published"
                              : "Draft"}
                          </StatusBadge>
                        </td>

                        <td>
                          {blog.featured
                            ? "Yes"
                            : "No"}
                        </td>

                        <td>
                          {blog.readingTime ||
                            1}{" "}
                          min
                        </td>

                        <td>
                          {blog.views ||
                            0}
                        </td>

                        <td>
                          {formatBlogDate(
                            blog.publishDate,
                          )}
                        </td>

                        <td>
                          {blog.updatedAt
                            ? new Date(
                                blog.updatedAt,
                              ).toLocaleDateString()
                            : "-"}
                        </td>

                        <td className="action-cell property-actions">
                          <PermissionGate
                            permission={
                              permissions.blogEdit
                            }
                          >
                            <Link
                              aria-label="Edit Blog"
                              className="icon-button icon-button-green"
                              title="Edit"
                              to={`/admin/blogs/${blog.id}/edit`}
                            >
                              <EditIcon />
                            </Link>
                          </PermissionGate>

                          <PermissionGate
                            permission={
                              permissions.blogPublish
                            }
                          >
                            <button
                              aria-label={
                                blog.featured
                                  ? "Unfeature Blog"
                                  : "Feature Blog"
                              }
                              className={[
                                "icon-button",
                                blog.featured
                                  ? "icon-button-green"
                                  : "",
                              ]
                                .filter(
                                  Boolean,
                                )
                                .join(
                                  " ",
                                )}
                              title={
                                blog.featured
                                  ? "Unfeature"
                                  : "Feature"
                              }
                              type="button"
                              disabled={
                                anyBusy
                              }
                              onClick={() =>
                                void handleFeaturedChange(
                                  blog,
                                )
                              }
                            >
                              <StarIcon />
                              {featuredBusy
                                ? null
                                : null}
                            </button>

                            <button
                              aria-label={
                                isPublished
                                  ? "Unpublish Blog"
                                  : "Publish Blog"
                              }
                              className="icon-button"
                              title={
                                isPublished
                                  ? "Unpublish"
                                  : "Publish"
                              }
                              type="button"
                              disabled={
                                anyBusy
                              }
                              onClick={() =>
                                void handlePublicationChange(
                                  blog,
                                )
                              }
                            >
                              {isPublished ? (
                                <UnpublishIcon />
                              ) : (
                                <PublishIcon />
                              )}

                              {publicationBusy
                                ? null
                                : null}
                            </button>
                          </PermissionGate>

                          <PermissionGate
                            permission={
                              permissions.blogDelete
                            }
                          >
                            <button
                              aria-label="Delete Blog"
                              className="icon-button icon-button-danger"
                              title="Delete"
                              type="button"
                              disabled={
                                anyBusy
                              }
                              onClick={() =>
                                void handleDelete(
                                  blog,
                                )
                              }
                            >
                              <TrashIcon />

                              {deleteBusy
                                ? null
                                : null}
                            </button>
                          </PermissionGate>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <div className="pagination">
        <button
          className="button secondary"
          type="button"
          disabled={
            meta.page <= 1
          }
          onClick={() =>
            setFilters(
              (current) => ({
                ...current,
                page:
                  current.page -
                  1,
              }),
            )
          }
        >
          Previous
        </button>

        <span>
          Page {meta.page} of{" "}
          {meta.totalPages ||
            1} -{" "}
          {meta.total} total
        </span>

        <button
          className="button secondary"
          type="button"
          disabled={
            meta.page >=
            meta.totalPages
          }
          onClick={() =>
            setFilters(
              (current) => ({
                ...current,
                page:
                  current.page +
                  1,
              }),
            )
          }
        >
          Next
        </button>
      </div>
    </div>
  );
};