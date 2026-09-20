import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import {
  deleteBlog,
  getBlog,
  publishBlog,
  setBlogFeatured,
  unpublishBlog,
  updateBlog,
} from "../../../api/blogs.api";
import { PermissionGate } from "../../../auth/PermissionGate";
import { Alert } from "../../../components/common/Alert";
import { permissions } from "../../../utils/propertyOptions";
import BlogWizard from "./BlogWizard.jsx";

const formStateFromBlog = (blog) => ({
  title: blog?.title || "",
  excerpt: blog?.excerpt || "",
  content: blog?.content || "",
  category: blog?.category || "",
  tags: Array.isArray(blog?.tags)
    ? blog.tags
    : [],
  featuredImageFile: null,
  featuredImageAlt:
    blog?.featuredImage?.alt || "",
  removeFeaturedImage: false,
  metaTitle: blog?.metaTitle || "",
  metaDescription:
    blog?.metaDescription || "",
});

export const BlogEditPage = () => {
  const { blogId } = useParams();
  const navigate = useNavigate();

  const [blog, setBlog] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [blogAction, setBlogAction] =
    useState(null);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  useEffect(() => {
    let active = true;

    const loadBlog = async () => {
      await Promise.resolve();

      if (active) {
        setLoading(true);
        setError("");
        setNotice("");
      }

      try {
        const loaded =
          await getBlog(blogId);

        if (active) {
          setBlog(loaded);
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

    void loadBlog();

    return () => {
      active = false;
    };
  }, [blogId]);

  const initialValues = useMemo(
    () =>
      formStateFromBlog(blog),
    [blog],
  );

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  const handleSubmit = async (
    values,
  ) => {
    setSaving(true);
    clearMessages();

    try {
      const {
        featuredImageFile,
        removeFeaturedImage,
        ...editableFields
      } = values;

      const payload = {
        ...editableFields,
      };

      if (removeFeaturedImage) {
        payload.removeFeaturedImage =
          true;
      }

      const updated =
        await updateBlog({
          blogId,
          payload,
          featuredImage:
            featuredImageFile,
        });

      setBlog(updated);
      setNotice("Blog saved");
    } catch (updateError) {
      setError(
        getErrorMessage(
          updateError,
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const runBlogAction = async ({
    actionKey,
    action,
    successMessage,
  }) => {
    setBlogAction(actionKey);
    clearMessages();

    try {
      const updated =
        await action();

      setBlog(updated);

      setNotice(
        successMessage,
      );
    } catch (actionError) {
      setError(
        getErrorMessage(
          actionError,
        ),
      );
    } finally {
      setBlogAction(null);
    }
  };

  const handlePublicationChange =
    () => {
      const isPublished =
        blog?.status ===
        "published";

      return runBlogAction({
        actionKey: "publication",

        action: () =>
          isPublished
            ? unpublishBlog(
                blogId,
              )
            : publishBlog(
                blogId,
              ),

        successMessage:
          isPublished
            ? "Blog unpublished"
            : "Blog published",
      });
    };

  const handleFeaturedChange =
    () => {
      const nextFeatured =
        !blog?.featured;

      return runBlogAction({
        actionKey: "featured",

        action: () =>
          setBlogFeatured(
            blogId,
            nextFeatured,
          ),

        successMessage:
          nextFeatured
            ? "Blog marked as featured"
            : "Blog removed from featured",
      });
    };

  const handleDelete = async () => {
    const confirmed =
      window.confirm(
        `Delete "${blog?.title || "this Blog"}"?\n\nThe article will no longer appear in the Blog admin list or public website.`,
      );

    if (!confirmed) {
      return;
    }

    setBlogAction("delete");
    clearMessages();

    try {
      await deleteBlog(blogId);

      navigate("/admin/blogs");
    } catch (deleteError) {
      setError(
        getErrorMessage(
          deleteError,
        ),
      );

      setBlogAction(null);
    }
  };

  if (loading) {
    return (
      <p>Loading Blog...</p>
    );
  }

  if (!blog) {
    return (
      <div className="stack">
        <section className="page-heading">
          <p className="eyebrow">
            Blogs
          </p>

          <h1>Blog</h1>
        </section>

        <Alert tone="danger">
          {error ||
            "Blog could not be loaded."}
        </Alert>
      </div>
    );
  }

  const isBusy =
    saving ||
    Boolean(blogAction);

  const isPublished =
    blog.status ===
    "published";

  return (
    <div className="stack">
      <section className="page-heading row-between">
        <div>
          <p className="eyebrow">
            Blogs
          </p>

          <h1>
            {blog.title ||
              "Blog"}
          </h1>
        </div>

        <div className="form-actions">
          <PermissionGate
            permission={
              permissions.blogPublish
            }
          >
            <button
              className="button secondary"
              type="button"
              disabled={isBusy}
              onClick={() =>
                void handleFeaturedChange()
              }
            >
              {blogAction ===
              "featured"
                ? "Updating..."
                : blog.featured
                  ? "Unfeature"
                  : "Feature"}
            </button>

            <button
              className="button primary"
              type="button"
              disabled={isBusy}
              onClick={() =>
                void handlePublicationChange()
              }
            >
              {blogAction ===
              "publication"
                ? isPublished
                  ? "Unpublishing..."
                  : "Publishing..."
                : isPublished
                  ? "Unpublish"
                  : "Publish"}
            </button>
          </PermissionGate>

          <PermissionGate
            permission={
              permissions.blogDelete
            }
          >
            <button
              className="button secondary danger"
              type="button"
              disabled={isBusy}
              onClick={() =>
                void handleDelete()
              }
            >
              {blogAction ===
              "delete"
                ? "Deleting..."
                : "Delete"}
            </button>
          </PermissionGate>
        </div>
      </section>

      <div className="blog-edit-status-row">
        <span
          className={[
            "status-badge",
            isPublished
              ? "success"
              : "warning",
          ].join(" ")}
        >
          {isPublished
            ? "Published"
            : "Draft"}
        </span>

        {blog.featured ? (
          <span className="status-badge">
            Featured
          </span>
        ) : null}

        {blog.publishDate ? (
          <span className="muted">
            Published{" "}
            {new Date(
              blog.publishDate,
            ).toLocaleDateString()}
          </span>
        ) : null}
      </div>

      <Alert tone="danger">
        {error}
      </Alert>

      <Alert tone="success">
        {notice}
      </Alert>

      <BlogWizard
        key={blog.id}
        mode="edit"
        existingBlog={blog}
        initialValues={
          initialValues
        }
        onSubmit={
          handleSubmit
        }
        isSubmitting={
          saving
        }
      />
    </div>
  );
};