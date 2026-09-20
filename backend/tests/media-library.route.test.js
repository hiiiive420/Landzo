import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { STAFF_ROLES, STAFF_STATUSES } from "../src/modules/auth/auth.constants.js";
import { hashPassword } from "../src/modules/auth/auth.service.js";
import { RefreshSession } from "../src/modules/auth/refreshSession.model.js";
import { Blog } from "../src/modules/blogs/blog.model.js";
import { Homepage } from "../src/modules/homepage/homepage.model.js";
import { Property } from "../src/modules/properties/property.model.js";
import {
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
} from "../src/modules/properties/property.constants.js";
import { PERMISSIONS } from "../src/modules/roles-permissions/permission.constants.js";
import { Role } from "../src/modules/roles-permissions/role.model.js";
import { bootstrapSystemRoles } from "../src/modules/roles-permissions/role.service.js";
import { User } from "../src/modules/users/user.model.js";
import { authTestEnv } from "./helpers/authTestEnv.js";
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
  resetTestDatabase,
} from "./helpers/testDatabase.js";

const password = "CorrectHorse123";
const app = () => createApp({ env: authTestEnv });

const createStaffUser = async ({ email, role = STAFF_ROLES.ADMIN } = {}) =>
  User.create({
    fullName: "Media Staff",
    email,
    phone: "+94770000000",
    passwordHash: await hashPassword(password),
    role,
    status: STAFF_STATUSES.ACTIVE,
  });

const loginAs = async (user) => {
  const response = await request(app())
    .post("/api/v1/admin/auth/login")
    .send({ email: user.email, password })
    .expect(200);

  return response.body.data.accessToken;
};

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

const grantRolePermissions = (role, permissions) =>
  Role.updateOne({ key: role }, { $set: { permissions } });

const image = ({
  publicId,
  secureUrl,
  format = "webp",
  bytes = 12345,
  order = 0,
  isCover = false,
  uploadedAt = "2026-01-02T00:00:00.000Z",
  originalFilename = "media.webp",
} = {}) => ({
  publicId,
  secureUrl,
  width: 1200 + order,
  height: 800 + order,
  format,
  bytes,
  order,
  isCover,
  uploadedAt: new Date(uploadedAt),
  originalFilename,
});

const createPropertyWithMedia = async ({
  code = "LND-91001",
  title = "Route Media Property",
  images = [],
  deletedAt = null,
} = {}) =>
  Property.create({
    code,
    type: PROPERTY_TYPES.LAND,
    transactionTypes: [TRANSACTION_TYPES.SALE],
    title,
    deletedAt,
    media: { images },
  });

const createBlogWithMedia = async ({
  user,
  title = "Market Guide",
  slugText = "Market Guide",
  content = "<p>Body</p>",
  featuredImage = null,
  deletedAt = null,
} = {}) =>
  Blog.create({
    title,
    excerpt: "Guide excerpt",
    content,
    category: "Guides",
    author: user._id,
    createdBy: user._id,
    updatedBy: user._id,
    deletedAt,
    featuredImage,
  }).then(async (blog) => {
    if (slugText !== title) {
      blog.slug = slugText;
      await blog.save();
    }
    return blog;
  });

const createHomepageWithMedia = (input = {}) => Homepage.create(input);

const seedAllMedia = async () => {
  const user = await createStaffUser({ email: "author@example.com" });
  const property = await createPropertyWithMedia({
    code: "LND-91001",
    title: "Lake View Land",
    images: [
      image({
        publicId: "landzo/properties/LND-91001/cover",
        secureUrl: "https://res.cloudinary.com/landzo/image/upload/v1/property-cover.webp",
        isCover: true,
        order: 0,
        uploadedAt: "2026-01-05T00:00:00.000Z",
        originalFilename: "property-cover.webp",
      }),
      image({
        publicId: "landzo/properties/LND-91001/gallery",
        secureUrl: "https://res.cloudinary.com/landzo/image/upload/v1/property-gallery.jpg",
        format: "jpg",
        bytes: 22345,
        order: 1,
        uploadedAt: "2026-01-04T00:00:00.000Z",
        originalFilename: "property-gallery.jpg",
      }),
    ],
  });

  const blog = await createBlogWithMedia({
    user,
    title: "Market Guide",
    content:
      '<p>Intro</p><img src="https://res.cloudinary.com/landzo/image/upload/v1/content-image.png" data-public-id="landzo/blogs/content/content-image" alt="Market chart"><img src="https://example.com/external.jpg" alt="External">',
    featuredImage: {
      publicId: "landzo/blogs/featured/market-guide",
      secureUrl: "https://res.cloudinary.com/landzo/image/upload/v1/blog-featured.jpeg",
      alt: "Market guide",
      width: 900,
      height: 600,
      format: "jpeg",
      bytes: 33456,
    },
  });
  await Blog.updateOne({ _id: blog._id }, { $set: { updatedAt: new Date("2026-01-03T00:00:00.000Z") } });

  const homepage = await createHomepageWithMedia({
    hero: {
      image: {
        publicId: "landzo/homepage/hero/main",
        secureUrl: "https://res.cloudinary.com/landzo/image/upload/v1/home-hero.webp",
        alt: "Hero",
        width: 1600,
        height: 900,
        format: "webp",
        bytes: 44567,
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
        bytes: 55678,
      },
    },
  });
  await Homepage.updateOne(
    { _id: homepage._id },
    { $set: { updatedAt: new Date("2026-01-01T00:00:00.000Z") } },
  );

  return { user, property, blog, homepage };
};

const getMediaLibrary = (token, query = {}) =>
  request(app()).get("/api/v1/admin/media-library").query(query).set(authHeader(token));

const responseText = (payload) => JSON.stringify(payload).toLowerCase();

const expectNoPrivateMediaFields = (payload) => {
  const serialized = responseText(payload);
  expect(serialized).not.toContain("publicid");
  expect(serialized).not.toContain("secureurl");
  expect(serialized).not.toContain("originalfilename");
  expect(serialized).not.toContain("createdby");
  expect(serialized).not.toContain("updatedby");
  expect(serialized).not.toContain("__v");
  expect(serialized).not.toContain("rawhtml");
  expect(serialized).not.toContain("private");
  expect(serialized).not.toContain("cloudinary_url");
  expect(serialized).not.toContain("api_key");
  expect(serialized).not.toContain("c:\\");
  expect(serialized).not.toContain("landzo/properties/");
  expect(serialized).not.toContain("landzo/blogs/");
  expect(serialized).not.toContain("landzo/homepage/");
};

describe("admin media library API", () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await resetTestDatabase();
    await User.init();
    await RefreshSession.init();
    await Role.init();
    await Property.init();
    await Blog.init();
    await Homepage.init();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await bootstrapSystemRoles();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("requires authentication", async () => {
    const response = await request(app()).get("/api/v1/admin/media-library").expect(401);

    expect(response.body).toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
  });

  it("requires media.view and allows capability-based access", async () => {
    const support = await createStaffUser({
      email: "support@example.com",
      role: STAFF_ROLES.ENQUIRY_SUPPORT,
    });
    const supportToken = await loginAs(support);

    await getMediaLibrary(supportToken).expect(403);

    await grantRolePermissions(STAFF_ROLES.ENQUIRY_SUPPORT, [PERMISSIONS.MEDIA_VIEW]);

    const allowed = await getMediaLibrary(supportToken).expect(200);
    expect(allowed.body).toMatchObject({ success: true, message: "Media library retrieved" });
  });

  it("allows default Admin and Content Manager access", async () => {
    const admin = await createStaffUser({ email: "admin@example.com" });
    const contentManager = await createStaffUser({
      email: "content@example.com",
      role: STAFF_ROLES.CONTENT_MANAGER,
    });

    await getMediaLibrary(await loginAs(admin)).expect(200);
    await getMediaLibrary(await loginAs(contentManager)).expect(200);
  });

  it("returns normalized Property cover and gallery media", async () => {
    const admin = await createStaffUser({ email: "admin@example.com" });
    const token = await loginAs(admin);
    const { property } = await seedAllMedia();

    const response = await getMediaLibrary(token, { source: "property", limit: 10 }).expect(200);
    const items = response.body.data.items;

    expect(response.body.data).toMatchObject({ page: 1, limit: 10, total: 2, totalPages: 1 });
    expect(items.map((item) => item.role)).toEqual(["cover", "gallery"]);
    expect(items[0]).toMatchObject({
      source: "property",
      role: "cover",
      url: "https://res.cloudinary.com/landzo/image/upload/v1/property-cover.webp",
      width: 1200,
      height: 800,
      format: "webp",
      bytes: 12345,
      owner: {
        id: property._id.toString(),
        label: "Lake View Land",
        secondaryLabel: "LND-91001",
        adminPath: `/admin/properties/${property._id}/edit`,
      },
      timestamp: "2026-01-05T00:00:00.000Z",
    });
    expect(items[1]).toMatchObject({ role: "gallery", format: "jpg", bytes: 22345 });
    expectNoPrivateMediaFields(response.body);
  });

  it("returns Blog featured and LANDZO-managed content images only", async () => {
    const admin = await createStaffUser({ email: "admin@example.com" });
    const token = await loginAs(admin);
    const { blog } = await seedAllMedia();

    const response = await getMediaLibrary(token, { source: "blog", limit: 10 }).expect(200);
    const items = response.body.data.items;

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.role)).toEqual(expect.arrayContaining(["featured", "content"]));
    expect(items.find((item) => item.role === "featured")).toMatchObject({
      source: "blog",
      url: "https://res.cloudinary.com/landzo/image/upload/v1/blog-featured.jpeg",
      alt: "Market guide",
      width: 900,
      height: 600,
      format: "jpeg",
      bytes: 33456,
      owner: {
        id: blog._id.toString(),
        label: "Market Guide",
        secondaryLabel: blog.slug,
        adminPath: `/admin/blogs/${blog._id}/edit`,
      },
    });
    expect(items.find((item) => item.role === "content")).toMatchObject({
      url: "https://res.cloudinary.com/landzo/image/upload/v1/content-image.png",
      alt: "Market chart",
      width: null,
      height: null,
      format: "png",
      bytes: null,
    });
    expect(items.some((item) => item.url === "https://example.com/external.jpg")).toBe(false);
    expectNoPrivateMediaFields(response.body);
    expect(responseText(response.body)).not.toContain("intro");
  });

  it("returns Homepage hero and CTA media and omits missing Homepage media", async () => {
    const admin = await createStaffUser({ email: "admin@example.com" });
    const token = await loginAs(admin);

    let response = await getMediaLibrary(token, { source: "homepage", limit: 10 }).expect(200);
    expect(response.body.data).toMatchObject({ total: 0, totalPages: 0 });
    expect(response.body.data.items).toEqual([]);

    await createHomepageWithMedia({});
    response = await getMediaLibrary(token, { source: "homepage", limit: 10 }).expect(200);
    expect(response.body.data.items).toEqual([]);

    await Homepage.deleteMany({});
    const homepage = await createHomepageWithMedia({
      hero: {
        image: {
          publicId: "landzo/homepage/hero/main",
          secureUrl: "https://res.cloudinary.com/landzo/image/upload/v1/home-hero.webp",
          alt: "Hero",
          width: 1600,
          height: 900,
          format: "webp",
          bytes: 44567,
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
          bytes: 55678,
        },
      },
    });

    response = await getMediaLibrary(token, { source: "homepage", limit: 10 }).expect(200);
    expect(response.body.data.items.map((item) => item.role)).toEqual(expect.arrayContaining(["hero", "cta"]));
    expect(response.body.data.items[0].owner).toMatchObject({
      id: homepage._id.toString(),
      label: "Homepage",
      adminPath: "/admin/homepage",
    });
    expectNoPrivateMediaFields(response.body);
  });

  it("filters by source across all supported owners", async () => {
    const admin = await createStaffUser({ email: "admin@example.com" });
    const token = await loginAs(admin);
    await seedAllMedia();

    const all = await getMediaLibrary(token, { limit: 10 }).expect(200);
    expect(all.body.data.total).toBe(6);

    for (const source of ["property", "blog", "homepage"]) {
      const response = await getMediaLibrary(token, { source, limit: 10 }).expect(200);
      expect(response.body.data.items.every((item) => item.source === source)).toBe(true);
    }
  });

  it("searches owner fields and escapes regex special characters safely", async () => {
    const admin = await createStaffUser({ email: "admin@example.com" });
    const token = await loginAs(admin);
    await seedAllMedia();
    await createPropertyWithMedia({
      code: "LND-92002",
      title: "Regex .+*()[ Land",
      images: [
        image({
          publicId: "landzo/properties/LND-92002/cover",
          secureUrl: "https://res.cloudinary.com/landzo/image/upload/v1/regex-cover.webp",
          isCover: true,
          uploadedAt: "2026-01-06T00:00:00.000Z",
        }),
      ],
    });

    const byCode = await getMediaLibrary(token, { search: "LND-91001", limit: 10 }).expect(200);
    expect(byCode.body.data.items).toHaveLength(2);
    expect(byCode.body.data.items.every((item) => item.owner.secondaryLabel === "LND-91001")).toBe(true);

    const byBlog = await getMediaLibrary(token, { search: "Market Guide", limit: 10 }).expect(200);
    expect(byBlog.body.data.items.map((item) => item.source)).toEqual(["blog", "blog"]);

    const byHomepageSlot = await getMediaLibrary(token, { source: "homepage", search: "hero" }).expect(200);
    expect(byHomepageSlot.body.data.items).toHaveLength(1);
    expect(byHomepageSlot.body.data.items[0]).toMatchObject({ role: "hero" });

    const escaped = await getMediaLibrary(token, { search: ".+*()[", limit: 10 }).expect(200);
    expect(escaped.body.data.items).toHaveLength(1);
    expect(escaped.body.data.items[0].owner.label).toBe("Regex .+*()[ Land");
  });

  it("filters by valid image formats and rejects invalid formats", async () => {
    const admin = await createStaffUser({ email: "admin@example.com" });
    const token = await loginAs(admin);
    await seedAllMedia();

    const webp = await getMediaLibrary(token, { format: "webp", limit: 10 }).expect(200);
    expect(webp.body.data.items).toHaveLength(2);
    expect(webp.body.data.items.every((item) => item.format === "webp")).toBe(true);

    const png = await getMediaLibrary(token, { format: "png", limit: 10 }).expect(200);
    expect(png.body.data.items).toHaveLength(2);
    expect(png.body.data.items.every((item) => item.format === "png")).toBe(true);

    const invalid = await getMediaLibrary(token, { format: "gif" }).expect(400);
    expect(invalid.body).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("paginates with stable items and supports pages beyond available data", async () => {
    const admin = await createStaffUser({ email: "admin@example.com" });
    const token = await loginAs(admin);
    await seedAllMedia();

    const firstPage = await getMediaLibrary(token, { page: 1, limit: 2 }).expect(200);
    const secondPage = await getMediaLibrary(token, { page: 2, limit: 2 }).expect(200);
    const beyond = await getMediaLibrary(token, { page: 10, limit: 2 }).expect(200);

    expect(firstPage.body.data).toMatchObject({ page: 1, limit: 2, total: 6, totalPages: 3 });
    expect(firstPage.body.data.items).toHaveLength(2);
    expect(secondPage.body.data).toMatchObject({ page: 2, limit: 2, total: 6, totalPages: 3 });
    expect(secondPage.body.data.items).toHaveLength(2);
    expect(new Set(firstPage.body.data.items.map((item) => item.id))).not.toEqual(
      new Set(secondPage.body.data.items.map((item) => item.id)),
    );
    expect(beyond.body.data).toMatchObject({ page: 10, limit: 2, total: 6, totalPages: 3 });
    expect(beyond.body.data.items).toEqual([]);
  });

  it("sorts newest media first by deterministic timestamps", async () => {
    const admin = await createStaffUser({ email: "admin@example.com" });
    const token = await loginAs(admin);
    await createPropertyWithMedia({
      code: "LND-93001",
      title: "Older Property",
      images: [
        image({
          publicId: "landzo/properties/LND-93001/cover",
          secureUrl: "https://res.cloudinary.com/landzo/image/upload/v1/older.webp",
          isCover: true,
          uploadedAt: "2026-01-01T00:00:00.000Z",
        }),
      ],
    });
    await createPropertyWithMedia({
      code: "LND-93002",
      title: "Newer Property",
      images: [
        image({
          publicId: "landzo/properties/LND-93002/cover",
          secureUrl: "https://res.cloudinary.com/landzo/image/upload/v1/newer.webp",
          isCover: true,
          uploadedAt: "2026-01-03T00:00:00.000Z",
        }),
      ],
    });

    const response = await getMediaLibrary(token, { source: "property", limit: 10 }).expect(200);
    expect(response.body.data.items.map((item) => item.owner.label)).toEqual([
      "Newer Property",
      "Older Property",
    ]);
  });

  it("rejects invalid query values through HTTP validation", async () => {
    const admin = await createStaffUser({ email: "admin@example.com" });
    const token = await loginAs(admin);
    const invalidQueries = [
      { page: "0" },
      { page: "-1" },
      { page: "abc" },
      { limit: "0" },
      { limit: "101" },
      { source: "random" },
      { format: "gif" },
      { unknown: "value" },
    ];

    for (const query of invalidQueries) {
      const response = await getMediaLibrary(token, query).expect(400);
      expect(response.body).toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });

  it("does not expose unrelated private module data or raw owner documents", async () => {
    const admin = await createStaffUser({ email: "admin@example.com" });
    const token = await loginAs(admin);
    await seedAllMedia();

    const response = await getMediaLibrary(token, { limit: 10 }).expect(200);
    expectNoPrivateMediaFields(response.body);
    expect(responseText(response.body)).not.toContain("customer");
    expect(responseText(response.body)).not.toContain("enquiry");
    expect(responseText(response.body)).not.toContain("sitevisit");
    expect(responseText(response.body)).not.toContain("passwordhash");

    for (const item of response.body.data.items) {
      expect(Object.keys(item).sort()).toEqual([
        "alt",
        "bytes",
        "format",
        "height",
        "id",
        "owner",
        "role",
        "source",
        "timestamp",
        "url",
        "width",
      ]);
      expect(Object.keys(item.owner).sort()).toEqual([
        "adminPath",
        "id",
        "label",
        "secondaryLabel",
      ]);
    }
  });

  it("does not expose Media Library mutation routes", async () => {
    const admin = await createStaffUser({ email: "admin@example.com" });
    const token = await loginAs(admin);

    await request(app())
      .post("/api/v1/admin/media-library")
      .set(authHeader(token))
      .send({})
      .expect(404);
    await request(app())
      .patch("/api/v1/admin/media-library")
      .set(authHeader(token))
      .send({})
      .expect(404);
    await request(app())
      .delete("/api/v1/admin/media-library")
      .set(authHeader(token))
      .expect(404);
  });
});
