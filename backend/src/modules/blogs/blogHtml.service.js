import sanitizeHtml from "sanitize-html";

import { MAX_BLOG_CONTENT_IMAGES } from "./blog.constants.js";

const SAFE_CLASSES = Object.freeze([
  "blog-table-wrapper",
  "cms-image",
  "cms-image--align-center",
  "cms-image--align-left",
  "cms-image--align-right",
  "cms-image--width-100",
  "cms-image--width-50",
  "cms-image--width-75",
  "task-list",
]);

const normalizeComparableText = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export const normalizeBlogBodyHeadings = (
  content = "",
  title = "",
) => {
  const normalizedTitle =
    normalizeComparableText(title);

  return String(content).replace(
    /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi,
    (_match, innerHtml) => {
      if (
        normalizedTitle &&
        normalizeComparableText(innerHtml) ===
          normalizedTitle
      ) {
        return "";
      }

      return `<h2>${innerHtml}</h2>`;
    },
  );
};

export const sanitizeBlogHtml = (html = "") => {
  if (!html) {
    return "";
  }

  return sanitizeHtml(String(html), {
    allowedTags: [
      "a",
      "blockquote",
      "br",
      "code",
      "div",
      "em",
      "figcaption",
      "figure",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "img",
      "li",
      "mark",
      "ol",
      "p",
      "pre",
      "s",
      "strong",
      "table",
      "tbody",
      "td",
      "th",
      "thead",
      "tr",
      "u",
      "ul",
    ],

    allowedAttributes: {
      a: [
        "href",
        "rel",
        "target",
        "title",
      ],

      div: ["class"],

      figure: [
        "class",
        "data-align",
        "data-caption",
        "data-public-id",
        "data-type",
        "data-width",
      ],

      img: [
        "alt",
        "data-public-id",
        "decoding",
        "loading",
        "src",
        "title",
      ],

      li: [
        "data-checked",
        "data-type",
      ],

      ol: ["start"],

      td: [
        "colspan",
        "rowspan",
      ],

      th: [
        "colspan",
        "rowspan",
        "scope",
      ],

      ul: [
        "class",
        "data-type",
      ],
    },

    allowedClasses: {
      div: SAFE_CLASSES,
      figure: SAFE_CLASSES,
      img: SAFE_CLASSES,
      ul: SAFE_CLASSES,
    },

    allowedSchemes: [
      "http",
      "https",
      "mailto",
      "tel",
    ],

    allowedSchemesByTag: {
      img: [
        "http",
        "https",
      ],

      a: [
        "http",
        "https",
        "mailto",
        "tel",
      ],
    },

    allowProtocolRelative: false,

    transformTags: {
      a: (_tagName, attribs) => {
        const href =
          attribs.href?.trim() ?? "";

        const isExternal =
          /^https?:\/\//i.test(href);

        if (!isExternal) {
          return {
            tagName: "a",
            attribs,
          };
        }

        return {
          tagName: "a",

          attribs: {
            ...attribs,
            target: "_blank",
            rel: "noopener noreferrer",
          },
        };
      },

      img: (_tagName, attribs) => ({
        tagName: "img",

        attribs: {
          ...attribs,
          alt: attribs.alt ?? "",
          loading: "lazy",
          decoding: "async",
        },
      }),
    },

    exclusiveFilter: (frame) => {
      if (frame.tag === "figure") {
        const align =
          frame.attribs?.["data-align"];

        const width =
          frame.attribs?.["data-width"];

        if (
          align &&
          !["left", "center", "right"].includes(
            align,
          )
        ) {
          delete frame.attribs["data-align"];
        }

        if (
          width &&
          !["50%", "75%", "100%"].includes(
            width,
          )
        ) {
          delete frame.attribs["data-width"];
        }
      }

      return false;
    },
  }).trim();
};

export const countBlogContentImages = (
  content = "",
) => {
  const matches = String(content).match(
    /<img\b/gi,
  );

  return matches?.length ?? 0;
};

export const hasTooManyBlogContentImages = (
  content = "",
) =>
  countBlogContentImages(content) >
  MAX_BLOG_CONTENT_IMAGES;

export const extractBlogContentImagePublicIds = (
  content = "",
) => {
  const publicIds = new Set();

  String(content).replace(
    /data-public-id=["']([^"']+)["']/gi,
    (match, publicId) => {
      const normalizedPublicId =
        String(publicId).trim();

      if (normalizedPublicId) {
        publicIds.add(normalizedPublicId);
      }

      return match;
    },
  );

  return publicIds;
};

export const prepareBlogContent = ({
  content,
  title,
}) => {
  const sanitized =
    sanitizeBlogHtml(content);

  return normalizeBlogBodyHeadings(
    sanitized,
    title,
  );
};