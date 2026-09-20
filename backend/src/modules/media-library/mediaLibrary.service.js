import { escapeRegex } from "../locations/location.utils.js";
import { Blog } from "../blogs/blog.model.js";
import { Homepage } from "../homepage/homepage.model.js";
import { Property } from "../properties/property.model.js";
import {
  MEDIA_LIBRARY_FORMATS,
  MEDIA_LIBRARY_ITEM_ROLES,
  MEDIA_LIBRARY_PAGINATION,
  MEDIA_LIBRARY_SEARCH_MAX_LENGTH,
  MEDIA_LIBRARY_SOURCES,
  MEDIA_LIBRARY_SOURCE_VALUES,
} from "./mediaLibrary.constants.js";

const BLOG_CONTENT_IMAGE_TAG_REGEX = /<img\b[^>]*>/i;
const BLOG_CONTENT_PUBLIC_ID_REGEX = /data-public-id=["'](landzo\/blogs\/content\/[^"']+)["']/i;
const IMAGE_SRC_REGEX = /src=["']([^"']+)["']/i;
const IMAGE_ALT_REGEX = /alt=["']([^"']*)["']/i;
const IMAGE_FORMAT_REGEX = /\.(webp|jpe?g|png)(?:[?#]|$)/i;

const toPositiveInteger = ({ value, fallback, max }) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max ?? parsed);
};

const normalizeQuery = (query = {}) => {
  const page = toPositiveInteger({
    value: query.page,
    fallback: MEDIA_LIBRARY_PAGINATION.DEFAULT_PAGE,
  });
  const limit = toPositiveInteger({
    value: query.limit,
    fallback: MEDIA_LIBRARY_PAGINATION.DEFAULT_LIMIT,
    max: MEDIA_LIBRARY_PAGINATION.MAX_LIMIT,
  });
  const source = MEDIA_LIBRARY_SOURCE_VALUES.includes(query.source) ? query.source : null;
  const format = MEDIA_LIBRARY_FORMATS.includes(query.format) ? query.format : null;
  const search = String(query.search ?? "")
    .trim()
    .slice(0, MEDIA_LIBRARY_SEARCH_MAX_LENGTH);

  return {
    page,
    limit,
    source,
    format,
    search,
    skip: (page - 1) * limit,
    searchRegex: search ? new RegExp(escapeRegex(search), "i") : null,
  };
};

const existingUrlMatch = (path) => ({
  [path]: {
    $type: "string",
    $ne: "",
  },
});

const addOptionalMatch = (pipeline, match) => {
  if (match) {
    pipeline.push({ $match: match });
  }
};

const ownerSearchMatch = (fields, searchRegex) =>
  searchRegex
    ? {
        $or: fields.map((field) => ({
          [field]: searchRegex,
        })),
      }
    : null;

const mediaFormatExpression = (path) => ({
  $toLower: {
    $ifNull: [path, ""],
  },
});

const buildPropertyImagePipeline = ({ searchRegex, format }) => {
  const pipeline = [
    {
      $match: {
        deletedAt: null,
        "media.images.0": { $exists: true },
      },
    },
  ];

  addOptionalMatch(pipeline, ownerSearchMatch(["code", "title"], searchRegex));

  pipeline.push(
    { $unwind: "$media.images" },
    { $match: existingUrlMatch("media.images.secureUrl") },
    {
      $addFields: {
        mediaFormat: mediaFormatExpression("$media.images.format"),
      },
    },
  );

  if (format) {
    pipeline.push({ $match: { mediaFormat: format } });
  }

  pipeline.push({
    $project: {
      _id: 0,
      id: {
        $concat: ["property:", { $toString: "$_id" }, ":", { $toString: "$media.images._id" }],
      },
      source: MEDIA_LIBRARY_SOURCES.PROPERTY,
      role: {
        $cond: [
          { $eq: ["$media.images.isCover", true] },
          MEDIA_LIBRARY_ITEM_ROLES.PROPERTY_COVER,
          MEDIA_LIBRARY_ITEM_ROLES.PROPERTY_GALLERY,
        ],
      },
      url: "$media.images.secureUrl",
      alt: { $ifNull: ["$media.images.originalFilename", ""] },
      width: { $ifNull: ["$media.images.width", null] },
      height: { $ifNull: ["$media.images.height", null] },
      format: { $ifNull: ["$mediaFormat", null] },
      bytes: { $ifNull: ["$media.images.bytes", null] },
      owner: {
        id: { $toString: "$_id" },
        label: "$title",
        secondaryLabel: "$code",
        adminPath: {
          $concat: ["/admin/properties/", { $toString: "$_id" }, "/edit"],
        },
      },
      timestamp: { $ifNull: ["$media.images.uploadedAt", "$updatedAt"] },
    },
  });

  return pipeline;
};

const buildBlogFeaturedImagePipeline = ({ searchRegex, format }) => {
  const pipeline = [
    {
      $match: {
        deletedAt: null,
        ...existingUrlMatch("featuredImage.secureUrl"),
      },
    },
  ];

  addOptionalMatch(pipeline, ownerSearchMatch(["title", "slug"], searchRegex));

  pipeline.push({
    $addFields: {
      mediaFormat: mediaFormatExpression("$featuredImage.format"),
    },
  });

  if (format) {
    pipeline.push({ $match: { mediaFormat: format } });
  }

  pipeline.push({
    $project: {
      _id: 0,
      id: { $concat: ["blog-featured:", { $toString: "$_id" }] },
      source: MEDIA_LIBRARY_SOURCES.BLOG,
      role: MEDIA_LIBRARY_ITEM_ROLES.BLOG_FEATURED,
      url: "$featuredImage.secureUrl",
      alt: { $ifNull: ["$featuredImage.alt", ""] },
      width: { $ifNull: ["$featuredImage.width", null] },
      height: { $ifNull: ["$featuredImage.height", null] },
      format: { $ifNull: ["$mediaFormat", null] },
      bytes: { $ifNull: ["$featuredImage.bytes", null] },
      owner: {
        id: { $toString: "$_id" },
        label: "$title",
        secondaryLabel: "$slug",
        adminPath: {
          $concat: ["/admin/blogs/", { $toString: "$_id" }, "/edit"],
        },
      },
      timestamp: "$updatedAt",
    },
  });

  return pipeline;
};

const buildBlogContentImagePipeline = ({ searchRegex, format }) => {
  const pipeline = [
    {
      $match: {
        deletedAt: null,
        content: { $type: "string", $ne: "" },
      },
    },
  ];

  addOptionalMatch(pipeline, ownerSearchMatch(["title", "slug"], searchRegex));

  pipeline.push(
    {
      $project: {
        title: 1,
        slug: 1,
        updatedAt: 1,
        imageTags: {
          $regexFindAll: {
            input: "$content",
            regex: BLOG_CONTENT_IMAGE_TAG_REGEX,
          },
        },
      },
    },
    { $unwind: "$imageTags" },
    {
      $addFields: {
        imageTag: "$imageTags.match",
        imageIndex: "$imageTags.idx",
      },
    },
    {
      $addFields: {
        publicIdMatch: {
          $regexFind: {
            input: "$imageTag",
            regex: BLOG_CONTENT_PUBLIC_ID_REGEX,
          },
        },
        srcMatch: {
          $regexFind: {
            input: "$imageTag",
            regex: IMAGE_SRC_REGEX,
          },
        },
        altMatch: {
          $regexFind: {
            input: "$imageTag",
            regex: IMAGE_ALT_REGEX,
          },
        },
      },
    },
    {
      $addFields: {
        url: { $arrayElemAt: ["$srcMatch.captures", 0] },
        alt: { $arrayElemAt: ["$altMatch.captures", 0] },
      },
    },
    {
      $match: {
        publicIdMatch: { $ne: null },
        url: { $type: "string", $ne: "" },
      },
    },
    {
      $addFields: {
        formatMatch: {
          $regexFind: {
            input: { $toLower: "$url" },
            regex: IMAGE_FORMAT_REGEX,
          },
        },
      },
    },
    {
      $addFields: {
        mediaFormat: { $arrayElemAt: ["$formatMatch.captures", 0] },
      },
    },
  );

  if (format) {
    pipeline.push({ $match: { mediaFormat: format } });
  }

  pipeline.push({
    $project: {
      _id: 0,
      id: {
        $concat: ["blog-content:", { $toString: "$_id" }, ":", { $toString: "$imageIndex" }],
      },
      source: MEDIA_LIBRARY_SOURCES.BLOG,
      role: MEDIA_LIBRARY_ITEM_ROLES.BLOG_CONTENT,
      url: "$url",
      alt: { $ifNull: ["$alt", ""] },
      width: null,
      height: null,
      format: { $ifNull: ["$mediaFormat", null] },
      bytes: null,
      owner: {
        id: { $toString: "$_id" },
        label: "$title",
        secondaryLabel: "$slug",
        adminPath: {
          $concat: ["/admin/blogs/", { $toString: "$_id" }, "/edit"],
        },
      },
      timestamp: "$updatedAt",
    },
  });

  return pipeline;
};

const homepageSlotProjection = Object.freeze([
  {
    role: MEDIA_LIBRARY_ITEM_ROLES.HOMEPAGE_HERO,
    label: "Homepage hero",
    image: "$hero.image",
  },
  {
    role: MEDIA_LIBRARY_ITEM_ROLES.HOMEPAGE_CTA,
    label: "Homepage CTA",
    image: "$cta.image",
  },
]);

const buildHomepageImagePipeline = ({ searchRegex, format }) => {
  const pipeline = [
    {
      $project: {
        updatedAt: 1,
        images: homepageSlotProjection,
      },
    },
    { $unwind: "$images" },
    { $match: existingUrlMatch("images.image.secureUrl") },
    {
      $addFields: {
        mediaFormat: mediaFormatExpression("$images.image.format"),
      },
    },
  ];

  if (format) {
    pipeline.push({ $match: { mediaFormat: format } });
  }

  pipeline.push({
    $project: {
      _id: 0,
      id: { $concat: ["homepage:", "$images.role"] },
      source: MEDIA_LIBRARY_SOURCES.HOMEPAGE,
      role: "$images.role",
      url: "$images.image.secureUrl",
      alt: { $ifNull: ["$images.image.alt", ""] },
      width: { $ifNull: ["$images.image.width", null] },
      height: { $ifNull: ["$images.image.height", null] },
      format: { $ifNull: ["$mediaFormat", null] },
      bytes: { $ifNull: ["$images.image.bytes", null] },
      owner: {
        id: { $toString: "$_id" },
        label: "Homepage",
        secondaryLabel: "$images.label",
        adminPath: "/admin/homepage",
      },
      timestamp: "$updatedAt",
    },
  });

  addOptionalMatch(pipeline, ownerSearchMatch(["role", "owner.label", "owner.secondaryLabel"], searchRegex));

  return pipeline;
};

const sourcePipelineBuilders = Object.freeze({
  [MEDIA_LIBRARY_SOURCES.PROPERTY]: Object.freeze([
    {
      model: Property,
      buildPipeline: buildPropertyImagePipeline,
    },
  ]),
  [MEDIA_LIBRARY_SOURCES.BLOG]: Object.freeze([
    {
      model: Blog,
      buildPipeline: buildBlogFeaturedImagePipeline,
    },
    {
      model: Blog,
      buildPipeline: buildBlogContentImagePipeline,
    },
  ]),
  [MEDIA_LIBRARY_SOURCES.HOMEPAGE]: Object.freeze([
    {
      model: Homepage,
      buildPipeline: buildHomepageImagePipeline,
    },
  ]),
});

const buildAggregationParts = (query) => {
  const selectedSources = query.source ? [query.source] : MEDIA_LIBRARY_SOURCE_VALUES;

  return selectedSources.flatMap((source) =>
    (sourcePipelineBuilders[source] ?? []).map(({ model, buildPipeline }) => ({
      model,
      collection: model.collection.name,
      pipeline: buildPipeline(query),
    })),
  );
};

const emptyResult = ({ page, limit }) => ({
  data: [],
  meta: {
    page,
    limit,
    total: 0,
    totalPages: 0,
  },
});

export const listMediaLibraryItems = async (rawQuery = {}) => {
  const query = normalizeQuery(rawQuery);
  const aggregationParts = buildAggregationParts(query);

  if (!aggregationParts.length) {
    return emptyResult(query);
  }

  const [basePart, ...unionParts] = aggregationParts;
  const pipeline = [
    ...basePart.pipeline,
    ...unionParts.map((part) => ({
      $unionWith: {
        coll: part.collection,
        pipeline: part.pipeline,
      },
    })),
    {
      $sort: {
        timestamp: -1,
        id: 1,
      },
    },
    {
      $facet: {
        items: [{ $skip: query.skip }, { $limit: query.limit }],
        meta: [{ $count: "total" }],
      },
    },
    {
      $project: {
        items: 1,
        total: {
          $ifNull: [{ $arrayElemAt: ["$meta.total", 0] }, 0],
        },
      },
    },
  ];

  const [result = { items: [], total: 0 }] = await basePart.model.aggregate(pipeline).exec();
  const total = result.total ?? 0;

  return {
    data: result.items ?? [],
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};
