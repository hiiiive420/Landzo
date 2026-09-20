import request from "supertest";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { createApp } from "../src/app.js";
import {
  STAFF_ROLES,
  STAFF_STATUSES,
} from "../src/modules/auth/auth.constants.js";
import { hashPassword } from "../src/modules/auth/auth.service.js";
import {
  BLOG_STATUSES,
} from "../src/modules/blogs/blog.constants.js";
import { Blog } from "../src/modules/blogs/blog.model.js";
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

const password = "Password12345!";

const app = () =>
  createApp({
    env: authTestEnv,
  });

const authHeader = (token) => ({
  Authorization: `Bearer ${token}`,
});

const createStaffUser = async ({
  email = "staff@example.com",
  role = STAFF_ROLES.ADMIN,
  status = STAFF_STATUSES.ACTIVE,
  fullName = "LANDZO Staff",
} = {}) =>
  User.create({
    fullName,
    email,
    role,
    status,
    passwordHash: await hashPassword(password),
  });

const loginAs = async (user) => {
  const response = await request(app())
    .post("/api/v1/admin/auth/login")
    .send({
      email: user.email,
      password,
    })
    .expect(200);

  return response.body.data.accessToken;
};

const grantRolePermissions = (
  role,
  permissions,
) =>
  Role.updateOne(
    {
      key: role,
    },
    {
      $set: {
        permissions,
      },
    },
  );

const createBlogPayload = (
  overrides = {},
) => ({
  title: "LANDZO Property Market Guide",
  excerpt:
    "A practical guide to the Sri Lankan property market.",
  content:
    "<p>Useful guidance for property buyers and sellers in Sri Lanka.</p>",
  category: "Property Guide",
  tags: [
    "property",
    "sri lanka",
  ],
  metaTitle:
    "LANDZO Property Market Guide",
  metaDescription:
    "Read LANDZO property market guidance.",
  ...overrides,
});

const createBlogDocument = async ({
  actor,
  overrides = {},
}) =>
  Blog.create({
    title:
      "Direct LANDZO Blog",
    excerpt:
      "Directly created Blog for API tests.",
    content:
      "<p>Direct Blog content.</p>",
    category: "News",
    tags: ["landzo"],
    author: actor._id,
    createdBy: actor._id,
    updatedBy: actor._id,
    ...overrides,
  });

beforeAll(connectTestDatabase);

beforeEach(async () => {
  await resetTestDatabase();
  await bootstrapSystemRoles();
});

afterAll(async () => {
  await clearTestDatabase();
  await disconnectTestDatabase();
});

describe("blog admin API", () => {
  it("protects Blog APIs and respects granular Blog permissions", async () => {
    await request(app())
      .get("/api/v1/admin/blogs")
      .expect(401);

    await grantRolePermissions(
      STAFF_ROLES.CONTENT_MANAGER,
      [],
    );

    const staff = await createStaffUser({
      email: "content@example.com",
      role: STAFF_ROLES.CONTENT_MANAGER,
    });

    const token = await loginAs(staff);

    await request(app())
      .get("/api/v1/admin/blogs")
      .set(authHeader(token))
      .expect(403);

    await grantRolePermissions(
      STAFF_ROLES.CONTENT_MANAGER,
      [PERMISSIONS.BLOG_CREATE],
    );

    await request(app())
      .get("/api/v1/admin/blogs")
      .set(authHeader(token))
      .expect(200);

    const created = await request(app())
      .post("/api/v1/admin/blogs")
      .set(authHeader(token))
      .send(createBlogPayload())
      .expect(201);

    await request(app())
      .patch(
        `/api/v1/admin/blogs/${created.body.data.id}`,
      )
      .set(authHeader(token))
      .send({
        title: "Forbidden edit",
      })
      .expect(403);

    await request(app())
      .post(
        `/api/v1/admin/blogs/${created.body.data.id}/publish`,
      )
      .set(authHeader(token))
      .expect(403);

    await request(app())
      .delete(
        `/api/v1/admin/blogs/${created.body.data.id}`,
      )
      .set(authHeader(token))
      .expect(403);
  });

  it("creates a safe draft and sanitizes rich Blog HTML", async () => {
    const owner = await createStaffUser({
      email: "owner@example.com",
      role: STAFF_ROLES.OWNER,
      fullName: "LANDZO Owner",
    });

    const token = await loginAs(owner);

    const response = await request(app())
      .post("/api/v1/admin/blogs")
      .set(authHeader(token))
      .send(
        createBlogPayload({
          title: "Security Update",
          content: `
            <h1>Security Update</h1>
            <p>Hello <strong>LANDZO</strong>.</p>
            <script>alert("bad")</script>
            <img
              src="https://example.com/blog.webp"
              onerror="alert('bad')"
            />
          `,
        }),
      )
      .expect(201);

    expect(response.body.data).toMatchObject({
      title: "Security Update",
      slug: "security-update",
      status: BLOG_STATUSES.DRAFT,
      featured: false,
      views: 0,
    });

    expect(
      response.body.data.readingTime,
    ).toBeGreaterThanOrEqual(1);

    expect(
      response.body.data.author,
    ).toMatchObject({
      fullName: "LANDZO Owner",
      email: "owner@example.com",
    });

    expect(
      response.body.data.content,
    ).not.toContain("<script");

    expect(
      response.body.data.content,
    ).not.toContain("onerror");

    expect(
      response.body.data.content,
    ).not.toContain("javascript:");

    expect(
      response.body.data.content,
    ).not.toContain(
      "<h1>Security Update</h1>",
    );

    expect(
      JSON.stringify(response.body.data),
    ).not.toContain("__v");
  });

  it("blocks server-controlled publication fields from normal create and update", async () => {
    const owner = await createStaffUser({
      email: "owner@example.com",
      role: STAFF_ROLES.OWNER,
    });

    const token = await loginAs(owner);

    await request(app())
      .post("/api/v1/admin/blogs")
      .set(authHeader(token))
      .send(
        createBlogPayload({
          status:
            BLOG_STATUSES.PUBLISHED,
        }),
      )
      .expect(400);

    const created = await request(app())
      .post("/api/v1/admin/blogs")
      .set(authHeader(token))
      .send(createBlogPayload())
      .expect(201);

    await request(app())
      .patch(
        `/api/v1/admin/blogs/${created.body.data.id}`,
      )
      .set(authHeader(token))
      .send({
        status:
          BLOG_STATUSES.PUBLISHED,
      })
      .expect(400);

    await request(app())
      .patch(
        `/api/v1/admin/blogs/${created.body.data.id}`,
      )
      .set(authHeader(token))
      .send({
        featured: true,
      })
      .expect(400);

    await request(app())
      .patch(
        `/api/v1/admin/blogs/${created.body.data.id}`,
      )
      .set(authHeader(token))
      .send({
        views: 999,
      })
      .expect(400);
  });

  it("rejects Blog content containing more than two content images", async () => {
    const owner = await createStaffUser({
      email: "owner@example.com",
      role: STAFF_ROLES.OWNER,
    });

    const token = await loginAs(owner);

    const response = await request(app())
      .post("/api/v1/admin/blogs")
      .set(authHeader(token))
      .send(
        createBlogPayload({
          content: `
            <p>Gallery</p>
            <img src="https://example.com/one.webp" />
            <img src="https://example.com/two.webp" />
            <img src="https://example.com/three.webp" />
          `,
        }),
      )
      .expect(400);

    expect(response.body.code).toBe(
      "BLOG_CONTENT_IMAGE_LIMIT_EXCEEDED",
    );
  });

  it("lists and filters Blogs with safe admin DTOs", async () => {
    const owner = await createStaffUser({
      email: "owner@example.com",
      role: STAFF_ROLES.OWNER,
      fullName: "Owner User",
    });

    const token = await loginAs(owner);

    await createBlogDocument({
      actor: owner,
      overrides: {
        title: "Draft Market Report",
        category: "Market",
        tags: ["market"],
        status: BLOG_STATUSES.DRAFT,
      },
    });

    await createBlogDocument({
      actor: owner,
      overrides: {
        title:
          "Featured Investment Guide",
        category: "Investment",
        tags: [
          "investment",
          "featured",
        ],
        status:
          BLOG_STATUSES.PUBLISHED,
        featured: true,
      },
    });

    await createBlogDocument({
      actor: owner,
      overrides: {
        title: "Published Market News",
        category: "Market",
        tags: ["market", "news"],
        status:
          BLOG_STATUSES.PUBLISHED,
        featured: false,
      },
    });

    const response = await request(app())
      .get("/api/v1/admin/blogs")
      .query({
        status: "published",
        featured: "true",
        category: "Investment",
        search: "featured",
      })
      .set(authHeader(token))
      .expect(200);

    expect(response.body.data).toHaveLength(
      1,
    );

    expect(response.body.meta.total).toBe(
      1,
    );

    expect(response.body.data[0]).toMatchObject(
      {
        title:
          "Featured Investment Guide",
        status:
          BLOG_STATUSES.PUBLISHED,
        featured: true,
        category: "Investment",
      },
    );

    expect(
      response.body.data[0].author.email,
    ).toBe("owner@example.com");

    expect(
      JSON.stringify(response.body.data[0]),
    ).not.toContain("__v");
  });

  it("updates editable Blog content and regenerates the slug safely", async () => {
    const owner = await createStaffUser({
      email: "owner@example.com",
      role: STAFF_ROLES.OWNER,
    });

    const token = await loginAs(owner);

    const created = await request(app())
      .post("/api/v1/admin/blogs")
      .set(authHeader(token))
      .send(
        createBlogPayload({
          title: "Original Blog Title",
          tags: ["property"],
        }),
      )
      .expect(201);

    const updated = await request(app())
      .patch(
        `/api/v1/admin/blogs/${created.body.data.id}`,
      )
      .set(authHeader(token))
      .send({
        title: "Updated Blog Title",
        content: `
          <h1>Updated Blog Title</h1>
          <p>Updated content.</p>
        `,
        tags: [
          "property",
          "property",
          "market",
        ],
      })
      .expect(200);

    expect(updated.body.data.title).toBe(
      "Updated Blog Title",
    );

    expect(updated.body.data.slug).toBe(
      "updated-blog-title",
    );

    expect(updated.body.data.tags).toEqual([
      "property",
      "market",
    ]);

    expect(
      updated.body.data.content,
    ).not.toContain(
      "<h1>Updated Blog Title</h1>",
    );
  });

  it("generates unique slugs for Blogs with the same title", async () => {
    const owner = await createStaffUser({
      email: "owner@example.com",
      role: STAFF_ROLES.OWNER,
    });

    const token = await loginAs(owner);

    const first = await request(app())
      .post("/api/v1/admin/blogs")
      .set(authHeader(token))
      .send(
        createBlogPayload({
          title: "Sri Lanka Property",
        }),
      )
      .expect(201);

    const second = await request(app())
      .post("/api/v1/admin/blogs")
      .set(authHeader(token))
      .send(
        createBlogPayload({
          title: "Sri Lanka Property",
        }),
      )
      .expect(201);

    expect(first.body.data.slug).toBe(
      "sri-lanka-property",
    );

    expect(second.body.data.slug).toBe(
      "sri-lanka-property-2",
    );
  });

  it("uses dedicated publish, unpublish, and featured actions", async () => {
    const owner = await createStaffUser({
      email: "owner@example.com",
      role: STAFF_ROLES.OWNER,
    });

    const token = await loginAs(owner);

    const created = await request(app())
      .post("/api/v1/admin/blogs")
      .set(authHeader(token))
      .send(createBlogPayload())
      .expect(201);

    const published = await request(app())
      .post(
        `/api/v1/admin/blogs/${created.body.data.id}/publish`,
      )
      .set(authHeader(token))
      .expect(200);

    expect(
      published.body.data.status,
    ).toBe(BLOG_STATUSES.PUBLISHED);

    expect(
      published.body.data.publishDate,
    ).toBeTruthy();

    const featured = await request(app())
      .patch(
        `/api/v1/admin/blogs/${created.body.data.id}/featured`,
      )
      .set(authHeader(token))
      .send({
        featured: true,
      })
      .expect(200);

    expect(
      featured.body.data.featured,
    ).toBe(true);

    const unpublished = await request(app())
      .post(
        `/api/v1/admin/blogs/${created.body.data.id}/unpublish`,
      )
      .set(authHeader(token))
      .expect(200);

    expect(
      unpublished.body.data.status,
    ).toBe(BLOG_STATUSES.DRAFT);

    expect(
      unpublished.body.data.publishDate,
    ).toBeNull();

    expect(
      unpublished.body.data.featured,
    ).toBe(true);
  });

  it("allows editor-image access with blog.create OR blog.edit", async () => {
    await grantRolePermissions(
      STAFF_ROLES.CONTENT_MANAGER,
      [PERMISSIONS.BLOG_PUBLISH],
    );

    const staff = await createStaffUser({
      email: "editor-access@example.com",
      role: STAFF_ROLES.CONTENT_MANAGER,
    });

    const token = await loginAs(staff);

    await request(app())
      .post(
        "/api/v1/admin/blogs/editor-image",
      )
      .set(authHeader(token))
      .expect(403);

    await grantRolePermissions(
      STAFF_ROLES.CONTENT_MANAGER,
      [PERMISSIONS.BLOG_CREATE],
    );

    const createPermissionResponse =
      await request(app())
        .post(
          "/api/v1/admin/blogs/editor-image",
        )
        .set(authHeader(token))
        .expect(400);

    expect(
      createPermissionResponse.body.code,
    ).toBe("BLOG_IMAGE_REQUIRED");

    await grantRolePermissions(
      STAFF_ROLES.CONTENT_MANAGER,
      [PERMISSIONS.BLOG_EDIT],
    );

    const editPermissionResponse =
      await request(app())
        .post(
          "/api/v1/admin/blogs/editor-image",
        )
        .set(authHeader(token))
        .expect(400);

    expect(
      editPermissionResponse.body.code,
    ).toBe("BLOG_IMAGE_REQUIRED");
  });

  it("soft deletes Blogs without physically removing their database record", async () => {
    const owner = await createStaffUser({
      email: "owner@example.com",
      role: STAFF_ROLES.OWNER,
    });

    const token = await loginAs(owner);

    const created = await request(app())
      .post("/api/v1/admin/blogs")
      .set(authHeader(token))
      .send(createBlogPayload())
      .expect(201);

    await request(app())
      .delete(
        `/api/v1/admin/blogs/${created.body.data.id}`,
      )
      .set(authHeader(token))
      .expect(200);

    const storedBlog = await Blog.findById(
      created.body.data.id,
    );

    expect(storedBlog).not.toBeNull();
    expect(storedBlog.deletedAt).toBeTruthy();

    await request(app())
      .get(
        `/api/v1/admin/blogs/${created.body.data.id}`,
      )
      .set(authHeader(token))
      .expect(404);

    const list = await request(app())
      .get("/api/v1/admin/blogs")
      .set(authHeader(token))
      .expect(200);

    expect(list.body.data).toHaveLength(0);
  });

  it("exposes Blog permissions to Content Manager by default", async () => {
    const role = await Role.findOne({
      key: STAFF_ROLES.CONTENT_MANAGER,
    });

    expect(role.permissions).toEqual(
      expect.arrayContaining([
        PERMISSIONS.BLOG_CREATE,
        PERMISSIONS.BLOG_EDIT,
        PERMISSIONS.BLOG_PUBLISH,
        PERMISSIONS.BLOG_DELETE,
      ]),
    );
  });
});

describe("public Blog API", () => {
  it("returns only published Blogs and keeps admin-only data private", async () => {
    const owner = await createStaffUser({
      email: "owner@example.com",
      role: STAFF_ROLES.OWNER,
      fullName: "LANDZO Author",
    });

    const token = await loginAs(owner);

    await request(app())
      .post("/api/v1/admin/blogs")
      .set(authHeader(token))
      .send(
        createBlogPayload({
          title: "Private Draft",
          category: "Drafts",
        }),
      )
      .expect(201);

    const created = await request(app())
      .post("/api/v1/admin/blogs")
      .set(authHeader(token))
      .send(
        createBlogPayload({
          title:
            "Public Investment Guide",
          category: "Investment",
          tags: ["investment"],
        }),
      )
      .expect(201);

    await request(app())
      .post(
        `/api/v1/admin/blogs/${created.body.data.id}/publish`,
      )
      .set(authHeader(token))
      .expect(200);

    await request(app())
      .patch(
        `/api/v1/admin/blogs/${created.body.data.id}/featured`,
      )
      .set(authHeader(token))
      .send({
        featured: true,
      })
      .expect(200);

    const list = await request(app())
      .get("/api/v1/blogs")
      .expect(200);

    expect(list.body.data).toHaveLength(1);

    expect(list.body.data[0]).toMatchObject({
      title:
        "Public Investment Guide",
      category: "Investment",
      featured: true,
    });

    expect(
      list.body.data[0].content,
    ).toBeUndefined();

    expect(
      list.body.meta.categories,
    ).toContain("Investment");

    expect(
      list.body.meta.featuredBlog,
    ).toMatchObject({
      title:
        "Public Investment Guide",
      featured: true,
    });

    const listJson = JSON.stringify(
      list.body.data[0],
    );

    expect(listJson).not.toContain(
      "email",
    );

    expect(listJson).not.toContain(
      "createdBy",
    );

    expect(listJson).not.toContain(
      "updatedBy",
    );

    expect(listJson).not.toContain(
      "deletedAt",
    );

    expect(listJson).not.toContain(
      "publicId",
    );

    const detail = await request(app())
      .get(
        `/api/v1/blogs/${created.body.data.slug}`,
      )
      .expect(200);

    expect(detail.body.data.content).toBeTruthy();

    expect(
      detail.body.data.author,
    ).toMatchObject({
      fullName: "LANDZO Author",
    });

    expect(
      detail.body.data.author.email,
    ).toBeUndefined();

    const detailJson = JSON.stringify(
      detail.body.data,
    );

    expect(detailJson).not.toContain(
      "createdBy",
    );

    expect(detailJson).not.toContain(
      "updatedBy",
    );

    expect(detailJson).not.toContain(
      "deletedAt",
    );

    expect(detailJson).not.toContain(
      "publicId",
    );
  });

  it("does not expose draft or deleted Blogs publicly", async () => {
    const owner = await createStaffUser({
      email: "owner@example.com",
      role: STAFF_ROLES.OWNER,
    });

    const token = await loginAs(owner);

    const draft = await request(app())
      .post("/api/v1/admin/blogs")
      .set(authHeader(token))
      .send(
        createBlogPayload({
          title: "Draft Article",
        }),
      )
      .expect(201);

    await request(app())
      .get(
        `/api/v1/blogs/${draft.body.data.slug}`,
      )
      .expect(404);

    const published = await request(app())
      .post("/api/v1/admin/blogs")
      .set(authHeader(token))
      .send(
        createBlogPayload({
          title: "Deleted Article",
        }),
      )
      .expect(201);

    await request(app())
      .post(
        `/api/v1/admin/blogs/${published.body.data.id}/publish`,
      )
      .set(authHeader(token))
      .expect(200);

    await request(app())
      .delete(
        `/api/v1/admin/blogs/${published.body.data.id}`,
      )
      .set(authHeader(token))
      .expect(200);

    await request(app())
      .get(
        `/api/v1/blogs/${published.body.data.slug}`,
      )
      .expect(404);

    const list = await request(app())
      .get("/api/v1/blogs")
      .expect(200);

    expect(list.body.data).toHaveLength(0);
  });

  it("increments views only for published Blogs", async () => {
    const owner = await createStaffUser({
      email: "owner@example.com",
      role: STAFF_ROLES.OWNER,
    });

    const token = await loginAs(owner);

    const created = await request(app())
      .post("/api/v1/admin/blogs")
      .set(authHeader(token))
      .send(
        createBlogPayload({
          title: "View Counter Blog",
        }),
      )
      .expect(201);

    const draftView = await request(app())
      .patch(
        `/api/v1/blogs/${created.body.data.id}/view`,
      )
      .expect(404);

    expect(draftView.body.code).toBe(
      "PUBLISHED_BLOG_NOT_FOUND",
    );

    await request(app())
      .post(
        `/api/v1/admin/blogs/${created.body.data.id}/publish`,
      )
      .set(authHeader(token))
      .expect(200);

    const firstView = await request(app())
      .patch(
        `/api/v1/blogs/${created.body.data.id}/view`,
      )
      .expect(200);

    expect(firstView.body.data.views).toBe(
      1,
    );

    const secondView = await request(app())
      .patch(
        `/api/v1/blogs/${created.body.data.id}/view`,
      )
      .expect(200);

    expect(secondView.body.data.views).toBe(
      2,
    );

    const detail = await request(app())
      .get(
        `/api/v1/admin/blogs/${created.body.data.id}`,
      )
      .set(authHeader(token))
      .expect(200);

    expect(detail.body.data.views).toBe(2);
  });
});