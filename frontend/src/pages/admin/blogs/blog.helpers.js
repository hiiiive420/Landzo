const WORDS_PER_MINUTE = 200;

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "mark",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "hr",
  "a",
  "figure",
  "img",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]);

const REMOVE_WITH_CONTENT_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "option",
  "meta",
  "link",
]);

const GLOBAL_ALLOWED_ATTRIBUTES = new Set([]);

const TAG_ALLOWED_ATTRIBUTES = Object.freeze({
  a: new Set([
    "href",
    "target",
    "rel",
    "class",
  ]),

  figure: new Set([
    "class",
    "data-type",
    "data-align",
    "data-width",
    "data-public-id",
    "data-caption",
  ]),

  img: new Set([
    "src",
    "alt",
    "title",
    "loading",
    "decoding",
    "data-public-id",
  ]),

  ul: new Set([
    "class",
    "data-type",
  ]),

  li: new Set([
    "data-type",
    "data-checked",
  ]),

  th: new Set([
    "colspan",
    "rowspan",
  ]),

  td: new Set([
    "colspan",
    "rowspan",
  ]),
});

const SAFE_LINK_PROTOCOLS = new Set([
  "http:",
  "https:",
  "mailto:",
  "tel:",
]);

const SAFE_IMAGE_PROTOCOLS = new Set([
  "http:",
  "https:",
]);

const normalizeWhitespace = (value = "") =>
  String(value)
    .replace(/\s+/g, " ")
    .trim();

const getAllowedAttributesForTag = (
  tagName,
) =>
  TAG_ALLOWED_ATTRIBUTES[tagName] ||
  GLOBAL_ALLOWED_ATTRIBUTES;

const isRelativeUrl = (value) =>
  value.startsWith("/") ||
  value.startsWith("./") ||
  value.startsWith("../") ||
  value.startsWith("#");

const isSafeUrl = (
  value,
  allowedProtocols,
  {
    allowRelative = true,
  } = {},
) => {
  const url = String(value || "").trim();

  if (!url) {
    return false;
  }

  if (
    allowRelative &&
    isRelativeUrl(url)
  ) {
    return true;
  }

  try {
    const parsed = new URL(
      url,
      "https://landzo.invalid",
    );

    return allowedProtocols.has(
      parsed.protocol,
    );
  } catch {
    return false;
  }
};

const sanitizeAttributes = (
  element,
  tagName,
) => {
  const allowedAttributes =
    getAllowedAttributesForTag(tagName);

  Array.from(element.attributes).forEach(
    (attribute) => {
      const name =
        attribute.name.toLowerCase();

      if (
        name.startsWith("on") ||
        !allowedAttributes.has(name)
      ) {
        element.removeAttribute(
          attribute.name,
        );
      }
    },
  );

  if (tagName === "a") {
    const href =
      element.getAttribute("href");

    if (
      href &&
      !isSafeUrl(
        href,
        SAFE_LINK_PROTOCOLS,
      )
    ) {
      element.removeAttribute("href");
    }

    const safeHref =
      element.getAttribute("href");

    if (
      safeHref &&
      /^https?:\/\//i.test(safeHref)
    ) {
      element.setAttribute(
        "target",
        "_blank",
      );

      element.setAttribute(
        "rel",
        "noopener noreferrer",
      );
    } else {
      element.removeAttribute("target");
      element.removeAttribute("rel");
    }
  }

  if (tagName === "img") {
    const src =
      element.getAttribute("src");

    if (
      !src ||
      !isSafeUrl(
        src,
        SAFE_IMAGE_PROTOCOLS,
        {
          allowRelative: true,
        },
      )
    ) {
      element.remove();
      return false;
    }

    element.setAttribute(
      "loading",
      "lazy",
    );

    element.setAttribute(
      "decoding",
      "async",
    );
  }

  if (tagName === "figure") {
    const alignment =
      element.getAttribute(
        "data-align",
      );

    if (
      alignment &&
      ![
        "left",
        "center",
        "right",
      ].includes(alignment)
    ) {
      element.removeAttribute(
        "data-align",
      );
    }

    const width =
      element.getAttribute(
        "data-width",
      );

    if (
      width &&
      ![
        "50%",
        "75%",
        "100%",
      ].includes(width)
    ) {
      element.removeAttribute(
        "data-width",
      );
    }
  }

  return true;
};

const sanitizeNode = (node) => {
  Array.from(node.children).forEach(
    (child) => {
      const tagName =
        child.tagName.toLowerCase();

      if (
        REMOVE_WITH_CONTENT_TAGS.has(
          tagName,
        )
      ) {
        child.remove();
        return;
      }

      if (!ALLOWED_TAGS.has(tagName)) {
        sanitizeNode(child);

        child.replaceWith(
          ...Array.from(
            child.childNodes,
          ),
        );

        return;
      }

      const shouldKeep =
        sanitizeAttributes(
          child,
          tagName,
        );

      if (!shouldKeep) {
        return;
      }

      sanitizeNode(child);
    },
  );
};

const fallbackSanitizeHtml = (
  html = "",
) =>
  String(html)
    .replace(
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      "",
    )
    .replace(
      /<style\b[^>]*>[\s\S]*?<\/style>/gi,
      "",
    )
    .replace(
      /\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
      "",
    )
    .replace(
      /javascript\s*:/gi,
      "",
    );

export const sanitizeBlogHtml = (
  html = "",
) => {
  const source = String(html || "");

  if (!source.trim()) {
    return "";
  }

  if (
    typeof DOMParser === "undefined"
  ) {
    return fallbackSanitizeHtml(
      source,
    );
  }

  const parser = new DOMParser();

  const document = parser.parseFromString(
    source,
    "text/html",
  );

  sanitizeNode(document.body);

  return document.body.innerHTML.trim();
};

const normalizeHeadingText = (
  value = "",
) =>
  normalizeWhitespace(value).toLowerCase();

export const normalizeBlogHeadings = (
  html = "",
  title = "",
) => {
  if (
    !html ||
    typeof DOMParser === "undefined"
  ) {
    return html;
  }

  const parser = new DOMParser();

  const document = parser.parseFromString(
    html,
    "text/html",
  );

  const normalizedTitle =
    normalizeHeadingText(title);

  Array.from(
    document.body.querySelectorAll("h1"),
  ).forEach((heading) => {
    const headingText =
      normalizeHeadingText(
        heading.textContent,
      );

    if (
      normalizedTitle &&
      headingText === normalizedTitle
    ) {
      heading.remove();
      return;
    }

    const replacement =
      document.createElement("h2");

    Array.from(heading.attributes).forEach(
      (attribute) => {
        replacement.setAttribute(
          attribute.name,
          attribute.value,
        );
      },
    );

    while (heading.firstChild) {
      replacement.appendChild(
        heading.firstChild,
      );
    }

    heading.replaceWith(replacement);
  });

  return document.body.innerHTML.trim();
};

export const prepareBlogHtmlForSave = (
  html = "",
  title = "",
) =>
  normalizeBlogHeadings(
    sanitizeBlogHtml(html),
    title,
  );

export const getBlogPlainText = (
  html = "",
) => {
  const source = String(html || "");

  if (!source) {
    return "";
  }

  if (
    typeof DOMParser === "undefined"
  ) {
    return normalizeWhitespace(
      source.replace(/<[^>]*>/g, " "),
    );
  }

  const parser = new DOMParser();

  const document = parser.parseFromString(
    source,
    "text/html",
  );

  return normalizeWhitespace(
    document.body.textContent || "",
  );
};

export const getWordCount = (
  html = "",
) => {
  const text = getBlogPlainText(html);

  if (!text) {
    return 0;
  }

  return text
    .split(/\s+/)
    .filter(Boolean).length;
};

export const getReadingTime = (
  html = "",
) => {
  const wordCount = getWordCount(html);

  if (!wordCount) {
    return 1;
  }

  return Math.max(
    1,
    Math.ceil(
      wordCount / WORDS_PER_MINUTE,
    ),
  );
};

export const getBlogContentImageCount = (
  html = "",
) => {
  const source = String(html || "");

  if (!source) {
    return 0;
  }

  if (
    typeof DOMParser === "undefined"
  ) {
    return (
      source.match(/<img\b/gi) || []
    ).length;
  }

  const parser = new DOMParser();

  const document = parser.parseFromString(
    source,
    "text/html",
  );

  return document.body.querySelectorAll(
    "img",
  ).length;
};

export const formatBlogDate = (
  value,
) => {
  if (!value) {
    return "Not published";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Not published";
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  ).format(date);
};