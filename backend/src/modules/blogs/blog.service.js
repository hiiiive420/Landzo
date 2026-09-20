import mongoose from "mongoose";

import { AppError } from "../../common/errors/AppError.js";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit/audit.constants.js";
import { recordAuditLog } from "../audit/audit.service.js";

import {
  BLOG_SORT_OPTIONS,
  BLOG_SORTS,
  BLOG_STATUSES,
  MAX_BLOG_CONTENT_IMAGES,
} from "./blog.constants.js";
import {
  extractBlogContentImagePublicIds,
  prepareBlogContent,
} from "./blogHtml.service.js";
import {
  deleteBlogImageFromCloudinary,
  deleteBlogImagesFromCloudinary,
  uploadBlogImageToCloudinary,
} from "./blogMedia.cloudinary.js";
import { Blog } from "./blog.model.js";
import {
  serializeBlog,
  serializeBlogListItem,
  serializePublicBlog,
  serializePublicBlogListItem,
} from "./blog.serializer.js";

const BLOG_FEATURED_IMAGE_FOLDER =
  "landzo/blogs/featured";

const BLOG_CONTENT_IMAGE_FOLDER =
  "landzo/blogs/content";

const duplicateKeyCode = 11000;

const ADMIN_STAFF_POPULATE = Object.freeze([
  {
    path: "author",
    select: "fullName email",
  },
  {
    path: "createdBy",
    select: "fullName email",
  },
  {
    path: "updatedBy",
    select: "fullName email",
  },
]);

const PUBLIC_AUTHOR_POPULATE = Object.freeze([
  {
    path: "author",
    select: "fullName",
  },
]);

const escapeRegex = (value) =>
  String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

const hasOwn = (value, key) =>
  value != null &&
  Object.prototype.hasOwnProperty.call(
    value,
    key,
  );

const blogNotFound = () =>
  new AppError(
    404,
    "Blog not found",
    "BLOG_NOT_FOUND",
  );

const publishedBlogNotFound = () =>
  new AppError(
    404,
    "Published blog not found",
    "PUBLISHED_BLOG_NOT_FOUND",
  );

const blogContentImageLimitExceeded = () =>
  new AppError(
    400,
    `Blog content can contain a maximum of ${MAX_BLOG_CONTENT_IMAGES} images`,
    "BLOG_CONTENT_IMAGE_LIMIT_EXCEEDED",
  );

const blogContentEmpty = () =>
  new AppError(
    400,
    "Blog content is empty after sanitization",
    "BLOG_CONTENT_EMPTY_AFTER_SANITIZATION",
  );

const blogUpdateRequired = () =>
  new AppError(
    400,
    "At least one blog field or image change is required",
    "BLOG_UPDATE_REQUIRED",
  );

const blogSlugConflict = () =>
  new AppError(
    409,
    "A blog with this slug already exists",
    "BLOG_SLUG_CONFLICT",
  );

const populateAdminBlog = async (blog) => {
  if (!blog) {
    return null;
  }

  await blog.populate(ADMIN_STAFF_POPULATE);

  return blog;
};

const populatePublicBlog = async (blog) => {
  if (!blog) {
    return null;
  }

  await blog.populate(PUBLIC_AUTHOR_POPULATE);

  return blog;
};

const countContentImages = (content = "") => {
  const matches =
    String(content).match(/<img\b/gi);

  return matches?.length ?? 0;
};

const validatePreparedContent = (content) => {
  const plainText = String(content)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

  const imageCount =
    countContentImages(content);

  if (!plainText && imageCount === 0) {
    throw blogContentEmpty();
  }

  if (
    imageCount > MAX_BLOG_CONTENT_IMAGES
  ) {
    throw blogContentImageLimitExceeded();
  }
};

const prepareContentForStorage = ({
  content,
  title,
}) => {
  const prepared = prepareBlogContent({
    content,
    title,
  });

  validatePreparedContent(prepared);

  return prepared;
};

const isManagedBlogContentPublicId = (
  publicId,
) =>
  typeof publicId === "string" &&
  publicId.startsWith(
    `${BLOG_CONTENT_IMAGE_FOLDER}/`,
  );

const getManagedContentImagePublicIds = (
  content,
) =>
  new Set(
    [
      ...extractBlogContentImagePublicIds(
        content,
      ),
    ].filter(isManagedBlogContentPublicId),
  );

const safelyDeleteImage = async ({
  env,
  publicId,
}) => {
  if (!publicId) {
    return;
  }

  try {
    await deleteBlogImageFromCloudinary({
      env,
      publicId,
    });
  } catch {
    // Cleanup failure must not mask the
    // original database/application error.
  }
};

const safelyDeleteImages = async ({
  env,
  publicIds,
}) => {
  try {
    await deleteBlogImagesFromCloudinary({
      env,
      publicIds,
    });
  } catch {
    // Best-effort cleanup.
  }
};

const handleDuplicateSlugError = (
  error,
) => {
  if (error?.code === duplicateKeyCode) {
    throw blogSlugConflict();
  }

  throw error;
};

const recordBlogAuditLog = async ({ actorUserId, action, blog }) => {
  try {
    await recordAuditLog({
      actorUserId,
      action,
      entityType: AUDIT_ENTITY_TYPES.BLOG,
      entityId: blog._id,
      entityLabel: "Blog",
    });
  } catch (error) {
    console.error("Blog audit write failed", {
      action,
      entityType: AUDIT_ENTITY_TYPES.BLOG,
      errorCode: error?.code || "AUDIT_WRITE_FAILED",
    });
  }
};

const buildAdminBlogFilter = (query) => {
  const filter = {
    deletedAt: null,
  };

  if (query.status) {
    filter.status = query.status;
  }

  if (
    typeof query.featured === "boolean"
  ) {
    filter.featured = query.featured;
  }

  if (query.category) {
    filter.category = new RegExp(
      `^${escapeRegex(query.category)}$`,
      "i",
    );
  }

  if (query.tag) {
    filter.tags = new RegExp(
      `^${escapeRegex(query.tag)}$`,
      "i",
    );
  }

  if (query.search) {
    const pattern = new RegExp(
      escapeRegex(query.search),
      "i",
    );

    filter.$or = [
      { title: pattern },
      { excerpt: pattern },
      { category: pattern },
      { tags: pattern },
    ];
  }

  return filter;
};

const buildPublicBlogFilter = (
  query,
) => {
  const filter = {
    deletedAt: null,
    status: BLOG_STATUSES.PUBLISHED,
  };

  if (
    typeof query.featured === "boolean"
  ) {
    filter.featured = query.featured;
  }

  if (query.category) {
    filter.category = new RegExp(
      `^${escapeRegex(query.category)}$`,
      "i",
    );
  }

  if (query.tag) {
    filter.tags = new RegExp(
      `^${escapeRegex(query.tag)}$`,
      "i",
    );
  }

  if (query.search) {
    const pattern = new RegExp(
      escapeRegex(query.search),
      "i",
    );

    filter.$or = [
      { title: pattern },
      { excerpt: pattern },
      { category: pattern },
      { tags: pattern },
    ];
  }

  if (query.exclude) {
    if (
      mongoose.isValidObjectId(
        query.exclude,
      )
    ) {
      filter._id = {
        $ne: query.exclude,
      };
    } else {
      filter.slug = {
        $ne: query.exclude,
      };
    }
  }

  return filter;
};

export const listAdminBlogs = async (
  query,
) => {
  const page = query.page;
  const limit = query.limit;

  const filter =
    buildAdminBlogFilter(query);

  const sort =
    BLOG_SORT_OPTIONS[query.sort] ??
    BLOG_SORT_OPTIONS[
      BLOG_SORTS.NEWEST
    ];

  const skip = (page - 1) * limit;

  const [blogs, total] =
    await Promise.all([
      Blog.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(
          ADMIN_STAFF_POPULATE,
        ),

      Blog.countDocuments(filter),
    ]);

  return {
    data: blogs.map(
      serializeBlogListItem,
    ),

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(
        total / limit,
      ),
    },
  };
};

export const getAdminBlog = async (
  blogId,
) => {
  const blog = await Blog.findOne({
    _id: blogId,
    deletedAt: null,
  });

  if (!blog) {
    throw blogNotFound();
  }

  await populateAdminBlog(blog);

  return serializeBlog(blog);
};

export const createBlog = async ({
  env,
  actorUserId,
  input,
  featuredImageFile = null,
}) => {
  const content =
    prepareContentForStorage({
      content: input.content,
      title: input.title,
    });

  let featuredImage = null;

  if (featuredImageFile) {
    const uploaded =
      await uploadBlogImageToCloudinary({
        env,
        file: featuredImageFile,
        folder:
          BLOG_FEATURED_IMAGE_FOLDER,
      });

    featuredImage = {
      ...uploaded,
      alt:
        input.featuredImageAlt ?? "",
    };
  }

  try {
    const blog = await Blog.create({
      title: input.title,
      excerpt: input.excerpt,
      content,
      category: input.category,
      tags: input.tags ?? [],
      featuredImage,
      metaTitle:
        input.metaTitle ?? "",
      metaDescription:
        input.metaDescription ?? "",
      status: BLOG_STATUSES.DRAFT,
      featured: false,
      author: actorUserId,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });

    await recordBlogAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.BLOG_CREATED,
      blog,
    });

    await populateAdminBlog(blog);

    return serializeBlog(blog);
  } catch (error) {
    await safelyDeleteImage({
      env,
      publicId:
        featuredImage?.publicId,
    });

    handleDuplicateSlugError(error);
  }
};

export const updateBlog = async ({
  env,
  actorUserId,
  blogId,
  input,
  featuredImageFile = null,
}) => {
  const blog = await Blog.findOne({
    _id: blogId,
    deletedAt: null,
  });

  if (!blog) {
    throw blogNotFound();
  }

  const previousContentImageIds =
    getManagedContentImagePublicIds(
      blog.content,
    );

  const hasContentUpdate =
    hasOwn(input, "content");

  const hasTitleUpdate =
    hasOwn(input, "title");

  let nextContent = blog.content;

  if (hasContentUpdate) {
    nextContent =
      prepareContentForStorage({
        content: input.content,
        title:
          input.title ?? blog.title,
      });
  } else if (hasTitleUpdate) {
    /*
     * Keep stored HTML safe and normalize
     * headings against the new title.
     */
    nextContent =
      prepareContentForStorage({
        content: blog.content,
        title: input.title,
      });
  }

  const nextContentImageIds =
    getManagedContentImagePublicIds(
      nextContent,
    );

  const removedContentImageIds = [
    ...previousContentImageIds,
  ].filter(
    (publicId) =>
      !nextContentImageIds.has(publicId),
  );

  const hasAltUpdate = hasOwn(
    input,
    "featuredImageAlt",
  );

  const removeFeaturedImage =
    Boolean(
      input.removeFeaturedImage,
    );

  let uploadedFeaturedImage = null;

  if (featuredImageFile) {
    const uploaded =
      await uploadBlogImageToCloudinary({
        env,
        file: featuredImageFile,
        folder:
          BLOG_FEATURED_IMAGE_FOLDER,
      });

    uploadedFeaturedImage = {
      ...uploaded,
      alt:
        input.featuredImageAlt ?? "",
    };
  }

  const previousFeaturedImage =
    blog.featuredImage?.publicId
      ? {
          publicId:
            blog.featuredImage
              .publicId,
        }
      : null;

  const shouldRemovePreviousFeatured =
    Boolean(
      previousFeaturedImage &&
        (uploadedFeaturedImage ||
          removeFeaturedImage),
    );

  const hasEditableUpdate =
    [
      "title",
      "excerpt",
      "content",
      "category",
      "tags",
      "metaTitle",
      "metaDescription",
    ].some((field) =>
      hasOwn(input, field),
    );

  const hasImageChange =
    Boolean(
      uploadedFeaturedImage ||
        removeFeaturedImage ||
        hasAltUpdate,
    );

  if (
    !hasEditableUpdate &&
    !hasImageChange
  ) {
    await safelyDeleteImage({
      env,
      publicId:
        uploadedFeaturedImage
          ?.publicId,
    });

    throw blogUpdateRequired();
  }

  if (hasOwn(input, "title")) {
    blog.title = input.title;
  }

  if (hasOwn(input, "excerpt")) {
    blog.excerpt = input.excerpt;
  }

  if (
    hasContentUpdate ||
    hasTitleUpdate
  ) {
    blog.content = nextContent;
  }

  if (hasOwn(input, "category")) {
    blog.category = input.category;
  }

  if (hasOwn(input, "tags")) {
    blog.tags = input.tags;
  }

  if (hasOwn(input, "metaTitle")) {
    blog.metaTitle =
      input.metaTitle ?? "";
  }

  if (
    hasOwn(
      input,
      "metaDescription",
    )
  ) {
    blog.metaDescription =
      input.metaDescription ?? "";
  }

  if (uploadedFeaturedImage) {
    blog.featuredImage =
      uploadedFeaturedImage;
  } else if (
    removeFeaturedImage
  ) {
    blog.featuredImage = null;
  } else if (
    hasAltUpdate &&
    blog.featuredImage
  ) {
    blog.featuredImage.alt =
      input.featuredImageAlt ?? "";
  }

  blog.updatedBy = actorUserId;

  try {
    await blog.save();

    if (
      shouldRemovePreviousFeatured
    ) {
      await safelyDeleteImage({
        env,
        publicId:
          previousFeaturedImage
            .publicId,
      });
    }

    await safelyDeleteImages({
      env,
      publicIds:
        removedContentImageIds,
    });

    await recordBlogAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.BLOG_UPDATED,
      blog,
    });

    await populateAdminBlog(blog);

    return serializeBlog(blog);
  } catch (error) {
    await safelyDeleteImage({
      env,
      publicId:
        uploadedFeaturedImage
          ?.publicId,
    });

    handleDuplicateSlugError(error);
  }
};

export const publishBlog = async ({
  actorUserId,
  blogId,
  now = new Date(),
}) => {
  const blog = await Blog.findOne({
    _id: blogId,
    deletedAt: null,
  });

  if (!blog) {
    throw blogNotFound();
  }

  if (
    blog.status !==
    BLOG_STATUSES.PUBLISHED
  ) {
    blog.status =
      BLOG_STATUSES.PUBLISHED;

    blog.publishDate =
      new Date(now);

    blog.updatedBy =
      actorUserId;

    await blog.save();

    await recordBlogAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.BLOG_PUBLISHED,
      blog,
    });
  }

  await populateAdminBlog(blog);

  return serializeBlog(blog);
};

export const unpublishBlog = async ({
  actorUserId,
  blogId,
}) => {
  const blog = await Blog.findOne({
    _id: blogId,
    deletedAt: null,
  });

  if (!blog) {
    throw blogNotFound();
  }

  if (
    blog.status !==
    BLOG_STATUSES.DRAFT
  ) {
    blog.status =
      BLOG_STATUSES.DRAFT;

    blog.publishDate = null;

    blog.updatedBy =
      actorUserId;

    await blog.save();

    await recordBlogAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.BLOG_UNPUBLISHED,
      blog,
    });
  }

  await populateAdminBlog(blog);

  return serializeBlog(blog);
};

export const updateBlogFeatured =
  async ({
    actorUserId,
    blogId,
    featured,
  }) => {
    const blog = await Blog.findOne({
      _id: blogId,
      deletedAt: null,
    });

    if (!blog) {
      throw blogNotFound();
    }

    if (blog.featured !== featured) {
      blog.featured = featured;
      blog.updatedBy = actorUserId;

      await blog.save();

      await recordBlogAuditLog({
        actorUserId,
        action: AUDIT_ACTIONS.BLOG_FEATURED_CHANGED,
        blog,
      });
    }

    await populateAdminBlog(blog);

    return serializeBlog(blog);
  };

export const deleteBlog = async ({
  actorUserId,
  blogId,
  now = new Date(),
}) => {
  const blog = await Blog.findOne({
    _id: blogId,
    deletedAt: null,
  });

  if (!blog) {
    throw blogNotFound();
  }

  blog.deletedAt = new Date(now);
  blog.updatedBy = actorUserId;

  await blog.save({
    validateBeforeSave: false,
  });

  await recordBlogAuditLog({
    actorUserId,
    action: AUDIT_ACTIONS.BLOG_TRASHED,
    blog,
  });

  return {
    id: blog._id.toString(),
    deletedAt:
      blog.deletedAt.toISOString(),
  };
};

export const listPublicBlogs = async (
  query,
) => {
  const page = query.page;
  const limit = query.limit;

  const filter =
    buildPublicBlogFilter(query);

  const sort =
    BLOG_SORT_OPTIONS[query.sort] ??
    BLOG_SORT_OPTIONS[
      BLOG_SORTS.PUBLISH_DATE
    ];

  const skip = (page - 1) * limit;

  const featuredFilter = {
    ...buildPublicBlogFilter({
      ...query,
      featured: true,
    }),
  };

  const [
    blogs,
    total,
    categories,
    featuredBlog,
  ] = await Promise.all([
    Blog.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate(
        PUBLIC_AUTHOR_POPULATE,
      ),

    Blog.countDocuments(filter),

    Blog.distinct("category", {
      deletedAt: null,
      status:
        BLOG_STATUSES.PUBLISHED,
    }),

    Blog.findOne(featuredFilter)
      .sort(
        BLOG_SORT_OPTIONS[
          BLOG_SORTS.PUBLISH_DATE
        ],
      )
      .populate(
        PUBLIC_AUTHOR_POPULATE,
      ),
  ]);

  return {
    data: blogs.map(
      serializePublicBlogListItem,
    ),

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(
        total / limit,
      ),
    },

    categories: categories
      .filter(Boolean)
      .sort((left, right) =>
        left.localeCompare(right),
      ),

    featuredBlog: featuredBlog
      ? serializePublicBlogListItem(
          featuredBlog,
        )
      : null,
  };
};

export const getPublicBlogBySlug =
  async (slug) => {
    const blog = await Blog.findOne({
      slug,
      deletedAt: null,
      status:
        BLOG_STATUSES.PUBLISHED,
    });

    if (!blog) {
      throw publishedBlogNotFound();
    }

    await populatePublicBlog(blog);

    return serializePublicBlog(blog);
  };

export const incrementBlogViews =
  async (blogId) => {
    const blog =
      await Blog.findOneAndUpdate(
        {
          _id: blogId,
          deletedAt: null,
          status:
            BLOG_STATUSES.PUBLISHED,
        },
        {
          $inc: {
            views: 1,
          },
        },
        {
          new: true,
          runValidators: false,
        },
      ).select("views");

    if (!blog) {
      throw publishedBlogNotFound();
    }

    return {
      views: blog.views,
    };
  };

export const uploadBlogEditorImage =
  async ({
    env,
    file,
  }) => {
    if (!file) {
      throw new AppError(
        400,
        "Blog editor image is required",
        "BLOG_IMAGE_REQUIRED",
      );
    }

    const image =
      await uploadBlogImageToCloudinary({
        env,
        file,
        folder:
          BLOG_CONTENT_IMAGE_FOLDER,
      });

    return {
      publicId: image.publicId,
      secureUrl: image.secureUrl,
      width: image.width,
      height: image.height,
      format: image.format,
      bytes: image.bytes,
    };
  };