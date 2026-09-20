import { describe, expect, it } from "vitest";

import { MEDIA_LIBRARY_PAGINATION } from "../src/modules/media-library/mediaLibrary.constants.js";
import {
  serializeMediaLibraryItem,
  serializeMediaLibraryResult,
} from "../src/modules/media-library/mediaLibrary.serializer.js";
import { listMediaLibrarySchema } from "../src/modules/media-library/mediaLibrary.validator.js";

const parseQuery = (query) => listMediaLibrarySchema.safeParse({ query });

const expectInvalidQuery = (query) => {
  expect(parseQuery(query).success).toBe(false);
};

describe("media library validator", () => {
  it("applies valid query defaults", () => {
    const result = parseQuery({});

    expect(result.success).toBe(true);
    expect(result.data.query).toEqual({
      page: MEDIA_LIBRARY_PAGINATION.DEFAULT_PAGE,
      limit: MEDIA_LIBRARY_PAGINATION.DEFAULT_LIMIT,
    });
  });

  it("accepts valid source, format, page, limit, and trimmed search", () => {
    const result = parseQuery({
      page: "2",
      limit: "48",
      source: "property",
      format: "webp",
      search: "  Lake View  ",
    });

    expect(result.success).toBe(true);
    expect(result.data.query).toEqual({
      page: 2,
      limit: 48,
      source: "property",
      format: "webp",
      search: "Lake View",
    });
  });

  it("rejects invalid page, limit, source, format, unknown keys, and long search", () => {
    expectInvalidQuery({ page: "0" });
    expectInvalidQuery({ page: "-1" });
    expectInvalidQuery({ page: "abc" });
    expectInvalidQuery({ limit: "0" });
    expectInvalidQuery({ limit: "101" });
    expectInvalidQuery({ source: "random" });
    expectInvalidQuery({ format: "gif" });
    expectInvalidQuery({ unknown: "value" });
    expectInvalidQuery({ search: "a".repeat(121) });
  });
});

describe("media library serializer", () => {
  it("retains only normalized media fields and preserves nullable metadata", () => {
    const item = serializeMediaLibraryItem({
      id: "blog-content:1:0",
      source: "blog",
      role: "content",
      url: "https://res.cloudinary.com/landzo/image/upload/v1/content.png",
      secureUrl: "https://res.cloudinary.com/landzo/image/upload/v1/content.png",
      publicId: "landzo/blogs/content/content",
      originalFilename: "content.png",
      alt: "",
      width: null,
      height: null,
      format: "png",
      bytes: null,
      owner: {
        id: "blog-1",
        label: "Market Guide",
        secondaryLabel: "market-guide",
        adminPath: "/admin/blogs/blog-1/edit",
        createdBy: "user-1",
        nested: { private: true },
      },
      timestamp: new Date("2026-01-02T03:04:05.000Z"),
      createdBy: "user-1",
      updatedBy: "user-2",
      __v: 0,
      rawHtml: "<p>private</p>",
    });

    expect(item).toEqual({
      id: "blog-content:1:0",
      source: "blog",
      role: "content",
      url: "https://res.cloudinary.com/landzo/image/upload/v1/content.png",
      alt: "",
      width: null,
      height: null,
      format: "png",
      bytes: null,
      owner: {
        id: "blog-1",
        label: "Market Guide",
        secondaryLabel: "market-guide",
        adminPath: "/admin/blogs/blog-1/edit",
      },
      timestamp: "2026-01-02T03:04:05.000Z",
    });
    expect(JSON.stringify(item).toLowerCase()).not.toContain("publicid");
    expect(JSON.stringify(item).toLowerCase()).not.toContain("originalfilename");
    expect(JSON.stringify(item).toLowerCase()).not.toContain("createdby");
    expect(JSON.stringify(item).toLowerCase()).not.toContain("updatedby");
    expect(JSON.stringify(item).toLowerCase()).not.toContain("rawhtml");
  });

  it("serializes paginated service results through the item whitelist", () => {
    const result = serializeMediaLibraryResult({
      data: [
        {
          id: "property:1:image-1",
          source: "property",
          role: "cover",
          url: "https://res.cloudinary.com/landzo/image/upload/v1/property.webp",
          alt: "cover.webp",
          width: 1200,
          height: 800,
          format: "webp",
          bytes: 12345,
          publicId: "landzo/properties/LND-1/cover",
          owner: {
            id: "property-1",
            label: "Lake View Land",
            adminPath: "/admin/properties/property-1/edit",
          },
          timestamp: "2026-01-02T00:00:00.000Z",
        },
      ],
      meta: {
        page: 2,
        limit: 24,
        total: 49,
        totalPages: 3,
      },
    });

    expect(result).toEqual({
      items: [
        {
          id: "property:1:image-1",
          source: "property",
          role: "cover",
          url: "https://res.cloudinary.com/landzo/image/upload/v1/property.webp",
          alt: "cover.webp",
          width: 1200,
          height: 800,
          format: "webp",
          bytes: 12345,
          owner: {
            id: "property-1",
            label: "Lake View Land",
            secondaryLabel: null,
            adminPath: "/admin/properties/property-1/edit",
          },
          timestamp: "2026-01-02T00:00:00.000Z",
        },
      ],
      page: 2,
      limit: 24,
      total: 49,
      totalPages: 3,
    });
    expect(JSON.stringify(result).toLowerCase()).not.toContain("publicid");
  });
});
