import { apiClient } from "./apiClient";

export const listBlogs = async (params = {}) => {
  const { data } = await apiClient.get(
    "/admin/blogs",
    { params },
  );

  return data;
};

export const getBlog = async (blogId) => {
  const { data } = await apiClient.get(
    `/admin/blogs/${blogId}`,
  );

  return data.data;
};

export const createBlog = async ({
  payload,
  featuredImage = null,
  onUploadProgress,
}) => {
  const formData = new FormData();

  Object.entries(payload).forEach(
    ([key, value]) => {
      if (
        value === undefined ||
        value === null
      ) {
        return;
      }

      if (key === "tags") {
        formData.append(
          key,
          JSON.stringify(value),
        );

        return;
      }

      formData.append(key, String(value));
    },
  );

  if (featuredImage) {
    formData.append(
      "featuredImage",
      featuredImage,
    );
  }

  const { data } = await apiClient.post(
    "/admin/blogs",
    formData,
    {
      onUploadProgress,
    },
  );

  return data.data;
};

export const updateBlog = async ({
  blogId,
  payload = {},
  featuredImage = null,
  onUploadProgress,
}) => {
  const formData = new FormData();

  Object.entries(payload).forEach(
    ([key, value]) => {
      if (value === undefined) {
        return;
      }

      if (key === "tags") {
        formData.append(
          key,
          JSON.stringify(value),
        );

        return;
      }

      formData.append(
        key,
        value === null ? "" : String(value),
      );
    },
  );

  if (featuredImage) {
    formData.append(
      "featuredImage",
      featuredImage,
    );
  }

  const { data } = await apiClient.patch(
    `/admin/blogs/${blogId}`,
    formData,
    {
      onUploadProgress,
    },
  );

  return data.data;
};

export const publishBlog = async (
  blogId,
) => {
  const { data } = await apiClient.post(
    `/admin/blogs/${blogId}/publish`,
  );

  return data.data;
};

export const unpublishBlog = async (
  blogId,
) => {
  const { data } = await apiClient.post(
    `/admin/blogs/${blogId}/unpublish`,
  );

  return data.data;
};

export const setBlogFeatured = async (
  blogId,
  featured,
) => {
  const { data } = await apiClient.patch(
    `/admin/blogs/${blogId}/featured`,
    {
      featured,
    },
  );

  return data.data;
};

export const deleteBlog = async (
  blogId,
) => {
  const { data } = await apiClient.delete(
    `/admin/blogs/${blogId}`,
  );

  return data.data;
};

export const uploadBlogEditorImage = async ({
  file,
  onUploadProgress,
}) => {
  const formData = new FormData();

  formData.append("image", file);

  const { data } = await apiClient.post(
    "/admin/blogs/editor-image",
    formData,
    {
      onUploadProgress,
    },
  );

  return data.data;
};

/*
 * Public helpers are included here because the
 * backend API already exists. They will be useful
 * when LANDZO's public Blog pages are built.
 */

export const listPublishedBlogs = async (
  params = {},
) => {
  const { data } = await apiClient.get(
    "/blogs",
    { params },
  );

  return data;
};

export const getPublishedBlogBySlug =
  async (slug) => {
    const { data } = await apiClient.get(
      `/blogs/${slug}`,
    );

    return data.data;
  };

export const incrementBlogView = async (
  blogId,
) => {
  const { data } = await apiClient.patch(
    `/blogs/${blogId}/view`,
  );

  return data.data;
};