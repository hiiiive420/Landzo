import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { hashPassword } from "../src/modules/auth/auth.service.js";
import { STAFF_ROLES, STAFF_STATUSES } from "../src/modules/auth/auth.constants.js";
import { Blog } from "../src/modules/blogs/blog.model.js";
import { Homepage } from "../src/modules/homepage/homepage.model.js";
import { serializeMediaLibraryResult } from "../src/modules/media-library/mediaLibrary.serializer.js";
import { listMediaLibraryItems } from "../src/modules/media-library/mediaLibrary.service.js";
import { Property } from "../src/modules/properties/property.model.js";
import {
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
} from "../src/modules/properties/property.constants.js";
import { User } from "../src/modules/users/user.model.js";
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
  resetTestDatabase,
} from "./helpers/testDatabase.js";

const createUser = async () =>
  User.create({
    fullName: "Media Tester",
    email: "media@example.com",
    phone: "+94770000000",
    passwordHash: await hashPassword("CorrectHorse123"),
    role: STAFF_ROLES.ADMIN,
    status: STAFF_STATUSES.ACTIVE,
  });

const seedMedia = async () => {
  const user = await createUser();

  await Property.create({
    code: "LND-90001",
    type: PROPERTY_TYPES.LAND,
    transactionTypes: [TRANSACTION_TYPES.SALE],
    title: "Lake View Land",
    media: {
      images: [
        {
          publicId: "landzo/properties/LND-90001/cover",
          secureUrl: "https://res.cloudinary.com/landzo/image/upload/v1/property-cover.webp",
          width: 1200,
          height: 800,
          format: "webp",
          bytes: 12345,
          order: 0,
          isCover: true,
          uploadedAt: new Date("2026-01-02T00:00:00.000Z"),
          originalFilename: "lake-cover.webp",
        },
      ],
    },
  });

  await Blog.create({
    title: "Market Guide",
    excerpt: "Guide excerpt",
    content:
      '<p>Intro</p><img src="https://res.cloudinary.com/landzo/image/upload/v1/content-image.png" data-public-id="landzo/blogs/content/content-image" alt="Market chart"><img src="https://example.com/external.jpg" alt="External">',
    category: "Guides",
    author: user._id,
    createdBy: user._id,
    updatedBy: user._id,
    featuredImage: {
      publicId: "landzo/blogs/featured/market-guide",
      secureUrl: "https://res.cloudinary.com/landzo/image/upload/v1/blog-featured.jpg",
      alt: "Market guide",
      width: 900,
      height: 600,
      format: "jpg",
      bytes: 23456,
    },
  });

  await Homepage.create({
    hero: {
      image: {
        publicId: "landzo/homepage/hero/main",
        secureUrl: "https://res.cloudinary.com/landzo/image/upload/v1/home-hero.webp",
        alt: "Hero",
        width: 1600,
        height: 900,
        format: "webp",
        bytes: 34567,
      },
    },
    cta: {
      image: {
        publicId: "landzo/homepage/cta/main",
        secureUrl: "https://res.cloudinary.com/landzo/image/upload/v1/home-cta.png",
        alt: "CTA",
        width: 1000,
        height: 700,
        format: "png",
        bytes: 45678,
      },
    },
  });
};

describe("media library query service", () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await resetTestDatabase();
    await User.init();
    await Property.init();
    await Blog.init();
    await Homepage.init();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("aggregates normalized public media without exposing Cloudinary public IDs", async () => {
    await seedMedia();

    const result = await listMediaLibraryItems({ page: 1, limit: 10 });

    expect(result.meta).toMatchObject({ page: 1, limit: 10, total: 5, totalPages: 1 });
    expect(result.data.map((item) => item.source)).toEqual(
      expect.arrayContaining(["property", "blog", "homepage"]),
    );
    expect(result.data.map((item) => item.role)).toEqual(
      expect.arrayContaining(["cover", "featured", "content", "hero", "cta"]),
    );
    expect(JSON.stringify(result.data).toLowerCase()).not.toContain("publicid");
    expect(JSON.stringify(result.data)).not.toContain("landzo/blogs/content/content-image");
    expect(result.data.some((item) => item.url === "https://example.com/external.jpg")).toBe(false);

    const serialized = serializeMediaLibraryResult(result);
    expect(serialized.items).toHaveLength(5);
    expect(serialized).toMatchObject({ page: 1, limit: 10, total: 5, totalPages: 1 });
    expect(JSON.stringify(serialized).toLowerCase()).not.toContain("publicid");
  });

  it("supports source, search, format, and pagination at the query layer", async () => {
    await seedMedia();

    const propertyOnly = await listMediaLibraryItems({ source: "property", limit: 10 });
    expect(propertyOnly.meta.total).toBe(1);
    expect(propertyOnly.data[0]).toMatchObject({ source: "property", role: "cover" });

    const searched = await listMediaLibraryItems({ search: "Market", limit: 10 });
    expect(searched.data.map((item) => item.source)).toEqual(["blog", "blog"]);

    const pngOnly = await listMediaLibraryItems({ format: "png", limit: 10 });
    expect(pngOnly.data.map((item) => item.role)).toEqual(
      expect.arrayContaining(["content", "cta"]),
    );

    const paged = await listMediaLibraryItems({ page: 2, limit: 2 });
    expect(paged.meta).toMatchObject({ page: 2, limit: 2, total: 5, totalPages: 3 });
    expect(paged.data).toHaveLength(2);
  });
});


