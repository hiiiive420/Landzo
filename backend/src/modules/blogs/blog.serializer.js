const serializeId = (value) =>
  value?._id?.toString?.() ??
  value?.toString?.() ??
  null;

const serializeStaffReference = (user) => {
  if (!user) {
    return null;
  }

  if (user.fullName || user.email) {
    return {
      id: serializeId(user),
      fullName: user.fullName ?? null,
      email: user.email ?? null,
    };
  }

  return {
    id: serializeId(user),
  };
};

const serializePublicAuthor = (user) => {
  if (!user) {
    return null;
  }

  if (user.fullName) {
    return {
      id: serializeId(user),
      fullName: user.fullName,
    };
  }

  return {
    id: serializeId(user),
  };
};

const serializeAdminFeaturedImage = (image) => {
  if (!image) {
    return null;
  }

  return {
    publicId: image.publicId,
    secureUrl: image.secureUrl,
    alt: image.alt ?? "",
    width: image.width ?? null,
    height: image.height ?? null,
    format: image.format ?? null,
    bytes: image.bytes ?? null,
  };
};

const serializePublicFeaturedImage = (image) => {
  if (!image) {
    return null;
  }

  return {
    url: image.secureUrl,
    alt: image.alt ?? "",
    width: image.width ?? null,
    height: image.height ?? null,
  };
};

export const serializeBlog = (blog) => ({
  id: serializeId(blog),

  title: blog.title,

  slug: blog.slug,

  excerpt: blog.excerpt,

  content: blog.content,

  category: blog.category,

  tags: blog.tags ?? [],

  author: serializeStaffReference(blog.author),

  featuredImage: serializeAdminFeaturedImage(
    blog.featuredImage,
  ),

  metaTitle: blog.metaTitle ?? "",

  metaDescription: blog.metaDescription ?? "",

  status: blog.status,

  publishDate:
    blog.publishDate?.toISOString?.() ?? null,

  featured: Boolean(blog.featured),

  readingTime: blog.readingTime ?? 1,

  views: blog.views ?? 0,

  deletedAt:
    blog.deletedAt?.toISOString?.() ?? null,

  createdBy: serializeStaffReference(
    blog.createdBy,
  ),

  updatedBy: serializeStaffReference(
    blog.updatedBy,
  ),

  createdAt:
    blog.createdAt?.toISOString?.() ?? null,

  updatedAt:
    blog.updatedAt?.toISOString?.() ?? null,
});

export const serializeBlogListItem = (blog) => ({
  id: serializeId(blog),

  title: blog.title,

  slug: blog.slug,

  excerpt: blog.excerpt,

  category: blog.category,

  tags: blog.tags ?? [],

  author: serializeStaffReference(blog.author),

  featuredImage: serializeAdminFeaturedImage(
    blog.featuredImage,
  ),

  status: blog.status,

  publishDate:
    blog.publishDate?.toISOString?.() ?? null,

  featured: Boolean(blog.featured),

  readingTime: blog.readingTime ?? 1,

  views: blog.views ?? 0,

  deletedAt:
    blog.deletedAt?.toISOString?.() ?? null,

  createdAt:
    blog.createdAt?.toISOString?.() ?? null,

  updatedAt:
    blog.updatedAt?.toISOString?.() ?? null,
});

export const serializePublicBlog = (blog) => ({
  id: serializeId(blog),

  title: blog.title,

  slug: blog.slug,

  excerpt: blog.excerpt,

  content: blog.content,

  category: blog.category,

  tags: blog.tags ?? [],

  author: serializePublicAuthor(blog.author),

  featuredImage: serializePublicFeaturedImage(
    blog.featuredImage,
  ),

  metaTitle: blog.metaTitle ?? "",

  metaDescription: blog.metaDescription ?? "",

  publishDate:
    blog.publishDate?.toISOString?.() ?? null,

  featured: Boolean(blog.featured),

  readingTime: blog.readingTime ?? 1,

  views: blog.views ?? 0,
});

export const serializePublicBlogListItem = (
  blog,
) => ({
  id: serializeId(blog),

  title: blog.title,

  slug: blog.slug,

  excerpt: blog.excerpt,

  category: blog.category,

  tags: blog.tags ?? [],

  author: serializePublicAuthor(blog.author),

  featuredImage: serializePublicFeaturedImage(
    blog.featuredImage,
  ),

  publishDate:
    blog.publishDate?.toISOString?.() ?? null,

  featured: Boolean(blog.featured),

  readingTime: blog.readingTime ?? 1,
  views: blog.views ?? 0,
  
});