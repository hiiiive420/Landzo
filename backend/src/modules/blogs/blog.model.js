import mongoose from "mongoose";

import {
  BLOG_STATUSES,
  BLOG_STATUS_VALUES,
} from "./blog.constants.js";

const featuredImageSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      required: true,
      trim: true,
    },

    secureUrl: {
      type: String,
      required: true,
      trim: true,
    },

    alt: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },

    width: {
      type: Number,
      min: 1,
      default: null,
    },

    height: {
      type: Number,
      min: 1,
      default: null,
    },

    format: {
      type: String,
      trim: true,
      default: null,
    },

    bytes: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const calculateReadingTime = (content = "") => {
  const plainText = String(content)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

  const wordCount = plainText
    ? plainText.split(/\s+/).length
    : 0;

  return Math.max(1, Math.ceil(wordCount / 200));
};

const slugify = (value = "") =>
  String(value)
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const generateUniqueSlug = async (
  Model,
  title,
  documentId = null,
) => {
  const baseSlug = slugify(title) || "blog";

  let candidateSlug = baseSlug;
  let suffix = 2;

  const query = {
    slug: candidateSlug,
  };

  if (documentId) {
    query._id = {
      $ne: documentId,
    };
  }

  while (await Model.exists(query)) {
    candidateSlug = `${baseSlug}-${suffix}`;
    query.slug = candidateSlug;
    suffix += 1;
  }

  return candidateSlug;
};

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 180,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 220,
    },

    excerpt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50000,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    tags: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 60,
        },
      ],
      default: [],
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    featuredImage: {
      type: featuredImageSchema,
      default: null,
    },

    metaTitle: {
      type: String,
      trim: true,
      maxlength: 60,
      default: "",
    },

    metaDescription: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },

    status: {
      type: String,
      enum: BLOG_STATUS_VALUES,
      default: BLOG_STATUSES.DRAFT,
      required: true,
    },

    publishDate: {
      type: Date,
      default: null,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    readingTime: {
      type: Number,
      min: 1,
      default: 1,
    },

    views: {
      type: Number,
      min: 0,
      default: 0,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

blogSchema.index({
  deletedAt: 1,
  status: 1,
});

blogSchema.index({
  category: 1,
  featured: 1,
});

blogSchema.index({
  publishDate: -1,
});

blogSchema.index({
  views: -1,
});

blogSchema.index({
  title: "text",
  excerpt: "text",
  tags: "text",
  category: "text",
});

blogSchema.pre("validate", async function prepareBlogDocument() {
  if (!this.slug || this.isModified("title")) {
    this.slug = await generateUniqueSlug(
      this.constructor,
      this.title,
      this._id,
    );
  }

  if (!this.readingTime || this.isModified("content")) {
    this.readingTime = calculateReadingTime(
      this.content,
    );
  }

  if (Array.isArray(this.tags)) {
    this.tags = [
      ...new Set(
        this.tags
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ];
  }

  if (
    this.status === BLOG_STATUSES.PUBLISHED &&
    !this.publishDate
  ) {
    this.publishDate = new Date();
  }
});

export const Blog =
  mongoose.models.Blog ||
  mongoose.model("Blog", blogSchema);