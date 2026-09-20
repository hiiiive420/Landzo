import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { getErrorMessage } from "../../../api/apiClient";
import { createBlog } from "../../../api/blogs.api";
import { Alert } from "../../../components/common/Alert";
import BlogWizard from "./BlogWizard.jsx";
import { BLOG_FORM_DEFAULTS } from "./blog.constants.js";

export const BlogCreatePage = () => {
  const navigate = useNavigate();

  const [error, setError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const handleSubmit = async (
    values,
  ) => {
    setSaving(true);
    setError("");

    try {
      const { featuredImageFile } = values;

const payload = {
  title: values.title,
  excerpt: values.excerpt,
  content: values.content,
  category: values.category,
  tags: values.tags,
  featuredImageAlt: values.featuredImageAlt,
  metaTitle: values.metaTitle,
  metaDescription: values.metaDescription,
};

      const blog = await createBlog({
        payload,
        featuredImage:
          featuredImageFile,
      });

      navigate(
        `/admin/blogs/${blog.id}/edit`,
      );
    } catch (createError) {
      setError(
        getErrorMessage(
          createError,
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack">
      <section className="page-heading">
        <p className="eyebrow">
          Blogs
        </p>

        <h1>New Draft</h1>
      </section>

      <Alert tone="danger">
        {error}
      </Alert>

      <BlogWizard
        mode="create"
        initialValues={
          BLOG_FORM_DEFAULTS
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