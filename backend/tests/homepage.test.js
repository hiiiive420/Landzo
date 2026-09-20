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
import { HOMEPAGE_SINGLETON_KEY } from "../src/modules/homepage/homepage.constants.js";
import { Homepage } from "../src/modules/homepage/homepage.model.js";
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

beforeAll(connectTestDatabase);

beforeEach(async () => {
  await resetTestDatabase();
  await bootstrapSystemRoles();
});

afterAll(async () => {
  await clearTestDatabase();
  await disconnectTestDatabase();
});

describe("homepage admin API", () => {
  it("protects Homepage APIs and respects granular Homepage permissions", async () => {
    await request(app())
      .get("/api/v1/admin/homepage")
      .expect(401);

    await request(app())
      .patch("/api/v1/admin/homepage")
      .send({
        hero: {
          heading: "Forbidden update",
        },
      })
      .expect(401);

    await grantRolePermissions(
      STAFF_ROLES.CONTENT_MANAGER,
      [],
    );

    const staff = await createStaffUser({
      email: "homepage-content@example.com",
      role: STAFF_ROLES.CONTENT_MANAGER,
    });

    const token = await loginAs(staff);

    await request(app())
      .get("/api/v1/admin/homepage")
      .set(authHeader(token))
      .expect(403);

    await request(app())
      .patch("/api/v1/admin/homepage")
      .set(authHeader(token))
      .send({
        hero: {
          heading: "Forbidden update",
        },
      })
      .expect(403);

    await grantRolePermissions(
      STAFF_ROLES.CONTENT_MANAGER,
      [PERMISSIONS.HOMEPAGE_VIEW],
    );

    await request(app())
      .get("/api/v1/admin/homepage")
      .set(authHeader(token))
      .expect(200);

    await request(app())
      .patch("/api/v1/admin/homepage")
      .set(authHeader(token))
      .send({
        hero: {
          heading: "Still forbidden",
        },
      })
      .expect(403);

    await grantRolePermissions(
      STAFF_ROLES.CONTENT_MANAGER,
      [PERMISSIONS.HOMEPAGE_EDIT],
    );

    const updated = await request(app())
      .patch("/api/v1/admin/homepage")
      .set(authHeader(token))
      .send({
        hero: {
          heading: "LANDZO Homepage",
        },
      })
      .expect(200);

    expect(
      updated.body.data.hero.heading,
    ).toBe("LANDZO Homepage");
  });

  it("creates the Homepage singleton with safe default content", async () => {
    const owner = await createStaffUser({
      email: "owner@example.com",
      role: STAFF_ROLES.OWNER,
      fullName: "LANDZO Owner",
    });

    const token = await loginAs(owner);

    const response = await request(app())
      .get("/api/v1/admin/homepage")
      .set(authHeader(token))
      .expect(200);

    expect(response.body.data).toMatchObject({
      hero: {
        eyebrow: "Find your place",
        heading:
          "Discover property across Sri Lanka",
        primaryCta: {
          label: "Explore Properties",
          link: "/properties",
        },
        secondaryCta: {
          label: "Explore Map",
          link: "/explore",
        },
        image: null,
      },

      featuredProperties: {
        heading: "Featured Properties",
      },

      exploreMap: {
        heading:
          "Explore Properties by Location",
      },

      whyLandzo: {
        heading: "Why LANDZO",
        benefits: [],
      },

      stats: {
        items: [],
      },

      cta: {
        heading:
          "Looking for the right property?",
        button: {
          label: "Contact Us",
          link: "/contact",
        },
        image: null,
      },

      seo: {
        metaTitle:
          "LANDZO | Property in Sri Lanka",
      },
    });

    expect(response.body.data.id).toBeTruthy();

    expect(
      response.body.data.createdBy,
    ).toBe(owner._id.toString());

    expect(
      response.body.data.updatedBy,
    ).toBe(owner._id.toString());

    const storedHomepages =
      await Homepage.find({});

    expect(storedHomepages).toHaveLength(1);

    expect(
      storedHomepages[0].singletonKey,
    ).toBe(HOMEPAGE_SINGLETON_KEY);
  });

  it("keeps exactly one Homepage document across repeated requests", async () => {
    const owner = await createStaffUser({
      email: "owner@example.com",
      role: STAFF_ROLES.OWNER,
    });

    const token = await loginAs(owner);

    const first = await request(app())
      .get("/api/v1/admin/homepage")
      .set(authHeader(token))
      .expect(200);

    const second = await request(app())
      .get("/api/v1/admin/homepage")
      .set(authHeader(token))
      .expect(200);

    expect(second.body.data.id).toBe(
      first.body.data.id,
    );

    expect(
      await Homepage.countDocuments(),
    ).toBe(1);
  });

  it("partially updates Homepage content without overwriting unrelated fields", async () => {
    const owner = await createStaffUser({
      email: "owner@example.com",
      role: STAFF_ROLES.OWNER,
    });

    const token = await loginAs(owner);

    const initial = await request(app())
      .get("/api/v1/admin/homepage")
      .set(authHeader(token))
      .expect(200);

    const originalDescription =
      initial.body.data.hero.description;

    const originalPrimaryCta =
      initial.body.data.hero.primaryCta;

    const originalExploreHeading =
      initial.body.data.exploreMap.heading;

    const response = await request(app())
      .patch("/api/v1/admin/homepage")
      .set(authHeader(token))
      .send({
        hero: {
          heading:
            "Find your next property with LANDZO",
        },

        featuredProperties: {
          heading:
            "Properties selected for you",
        },

        seo: {
          metaTitle:
            "LANDZO | Discover Property",
        },
      })
      .expect(200);

    expect(
      response.body.data.hero.heading,
    ).toBe(
      "Find your next property with LANDZO",
    );

    expect(
      response.body.data.hero.description,
    ).toBe(originalDescription);

    expect(
      response.body.data.hero.primaryCta,
    ).toEqual(originalPrimaryCta);

    expect(
      response.body.data.featuredProperties
        .heading,
    ).toBe(
      "Properties selected for you",
    );

    expect(
      response.body.data.exploreMap.heading,
    ).toBe(originalExploreHeading);

    expect(
      response.body.data.seo.metaTitle,
    ).toBe(
      "LANDZO | Discover Property",
    );

    expect(
      response.body.data.updatedBy,
    ).toBe(owner._id.toString());
  });

  it("replaces benefits and stats arrays through controlled CMS updates", async () => {
    const owner = await createStaffUser({
      email: "owner@example.com",
      role: STAFF_ROLES.OWNER,
    });

    const token = await loginAs(owner);

    const response = await request(app())
      .patch("/api/v1/admin/homepage")
      .set(authHeader(token))
      .send({
        whyLandzo: {
          heading: "Why choose LANDZO",
          benefits: [
            {
              title: "Verified information",
              description:
                "Clear property information for confident decisions.",
              iconKey: "verified",
            },
            {
              title: "Location discovery",
              description:
                "Explore property opportunities across Sri Lanka.",
              iconKey: "map",
            },
          ],
        },

        stats: {
          heading: "LANDZO at a glance",
          items: [
            {
              value: "100+",
              label: "Properties",
            },
            {
              value: "25+",
              label: "Locations",
            },
          ],
        },
      })
      .expect(200);

    expect(
      response.body.data.whyLandzo.benefits,
    ).toHaveLength(2);

    expect(
      response.body.data.whyLandzo
        .benefits[0],
    ).toMatchObject({
      title: "Verified information",
      description:
        "Clear property information for confident decisions.",
      iconKey: "verified",
    });

    expect(
      response.body.data.whyLandzo
        .benefits[0].id,
    ).toBeTruthy();

    expect(
      response.body.data.stats.items,
    ).toHaveLength(2);

    expect(
      response.body.data.stats.items[0],
    ).toMatchObject({
      value: "100+",
      label: "Properties",
    });

    expect(
      response.body.data.stats.items[0].id,
    ).toBeTruthy();
  });

  it("rejects server-controlled and image-management fields from normal Homepage updates", async () => {
    const owner = await createStaffUser({
      email: "owner@example.com",
      role: STAFF_ROLES.OWNER,
    });

    const token = await loginAs(owner);

    await request(app())
      .patch("/api/v1/admin/homepage")
      .set(authHeader(token))
      .send({
        singletonKey: "attacker-homepage",
      })
      .expect(400);

    await request(app())
      .patch("/api/v1/admin/homepage")
      .set(authHeader(token))
      .send({
        createdBy:
          "507f1f77bcf86cd799439011",
      })
      .expect(400);

    await request(app())
      .patch("/api/v1/admin/homepage")
      .set(authHeader(token))
      .send({
        updatedBy:
          "507f1f77bcf86cd799439011",
      })
      .expect(400);

    await request(app())
      .patch("/api/v1/admin/homepage")
      .set(authHeader(token))
      .send({
        hero: {
          image: {
            publicId: "fake/public-id",
            secureUrl:
              "https://example.com/fake.webp",
          },
        },
      })
      .expect(400);

    await request(app())
      .patch("/api/v1/admin/homepage")
      .set(authHeader(token))
      .send({
        cta: {
          image: {
            publicId: "fake/cta-id",
            secureUrl:
              "https://example.com/cta.webp",
          },
        },
      })
      .expect(400);
  });

  it("validates Homepage links and collection limits", async () => {
    const owner = await createStaffUser({
      email: "owner@example.com",
      role: STAFF_ROLES.OWNER,
    });

    const token = await loginAs(owner);

    await request(app())
      .patch("/api/v1/admin/homepage")
      .set(authHeader(token))
      .send({
        hero: {
          primaryCta: {
            label: "Unsafe",
            link: "javascript:alert(1)",
          },
        },
      })
      .expect(400);

    await request(app())
      .patch("/api/v1/admin/homepage")
      .set(authHeader(token))
      .send({
        whyLandzo: {
          benefits: [
            {
              title: "One",
              description: "One",
            },
            {
              title: "Two",
              description: "Two",
            },
            {
              title: "Three",
              description: "Three",
            },
            {
              title: "Four",
              description: "Four",
            },
            {
              title: "Five",
              description: "Five",
            },
          ],
        },
      })
      .expect(400);

    await request(app())
      .patch("/api/v1/admin/homepage")
      .set(authHeader(token))
      .send({
        stats: {
          items: [
            {
              value: "1",
              label: "One",
            },
            {
              value: "2",
              label: "Two",
            },
            {
              value: "3",
              label: "Three",
            },
            {
              value: "4",
              label: "Four",
            },
            {
              value: "5",
              label: "Five",
            },
          ],
        },
      })
      .expect(400);
  });

  it("does not allow Enquiry Support to access Homepage CMS by default", async () => {
    const support = await createStaffUser({
      email: "support@example.com",
      role: STAFF_ROLES.ENQUIRY_SUPPORT,
    });

    const token = await loginAs(support);

    await request(app())
      .get("/api/v1/admin/homepage")
      .set(authHeader(token))
      .expect(403);

    await request(app())
      .patch("/api/v1/admin/homepage")
      .set(authHeader(token))
      .send({
        hero: {
          heading: "Not allowed",
        },
      })
      .expect(403);
  });

  it("exposes Homepage permissions to Admin and Content Manager by default", async () => {
    const adminRole = await Role.findOne({
      key: STAFF_ROLES.ADMIN,
    });

    expect(adminRole.permissions).toEqual(
      expect.arrayContaining([
        PERMISSIONS.HOMEPAGE_VIEW,
        PERMISSIONS.HOMEPAGE_EDIT,
      ]),
    );

    const contentManagerRole =
      await Role.findOne({
        key: STAFF_ROLES.CONTENT_MANAGER,
      });

    expect(
      contentManagerRole.permissions,
    ).toEqual(
      expect.arrayContaining([
        PERMISSIONS.HOMEPAGE_VIEW,
        PERMISSIONS.HOMEPAGE_EDIT,
      ]),
    );

    const enquirySupportRole =
      await Role.findOne({
        key: STAFF_ROLES.ENQUIRY_SUPPORT,
      });

    expect(
      enquirySupportRole.permissions,
    ).not.toEqual(
      expect.arrayContaining([
        PERMISSIONS.HOMEPAGE_VIEW,
        PERMISSIONS.HOMEPAGE_EDIT,
      ]),
    );
  });
});

describe("public Homepage API", () => {
  it("returns Homepage content publicly without admin-only fields", async () => {
    const owner = await createStaffUser({
      email: "owner@example.com",
      role: STAFF_ROLES.OWNER,
    });

    const token = await loginAs(owner);

    await request(app())
      .patch("/api/v1/admin/homepage")
      .set(authHeader(token))
      .send({
        hero: {
          eyebrow: "Property. Simplified.",
          heading:
            "Discover your place with LANDZO",
          description:
            "Explore property opportunities across Sri Lanka.",

          primaryCta: {
            label: "Explore Properties",
            link: "/properties",
          },
        },

        whyLandzo: {
          benefits: [
            {
              title: "Location first",
              description:
                "Explore opportunities through location.",
              iconKey: "map",
            },
          ],
        },

        seo: {
          metaTitle:
            "LANDZO | Discover Property",
          metaDescription:
            "Explore property opportunities across Sri Lanka.",
        },
      })
      .expect(200);

    const response = await request(app())
      .get("/api/v1/homepage")
      .expect(200);

    expect(response.body.data).toMatchObject({
      hero: {
        eyebrow: "Property. Simplified.",
        heading:
          "Discover your place with LANDZO",
        description:
          "Explore property opportunities across Sri Lanka.",

        primaryCta: {
          label: "Explore Properties",
          link: "/properties",
        },
      },

      seo: {
        metaTitle:
          "LANDZO | Discover Property",
        metaDescription:
          "Explore property opportunities across Sri Lanka.",
      },
    });

    expect(
      response.body.data.whyLandzo.benefits,
    ).toHaveLength(1);

    const responseJson = JSON.stringify(
      response.body.data,
    );

    expect(responseJson).not.toContain(
      "singletonKey",
    );

    expect(responseJson).not.toContain(
      "createdBy",
    );

    expect(responseJson).not.toContain(
      "updatedBy",
    );

    expect(responseJson).not.toContain(
      "__v",
    );

    expect(responseJson).not.toContain(
      "publicId",
    );
  });

  it("creates only one default Homepage even when the public endpoint is requested repeatedly", async () => {
    const first = await request(app())
      .get("/api/v1/homepage")
      .expect(200);

    const second = await request(app())
      .get("/api/v1/homepage")
      .expect(200);

    expect(
      first.body.data.hero.heading,
    ).toBe(
      "Discover property across Sri Lanka",
    );

    expect(
      second.body.data.hero.heading,
    ).toBe(
      "Discover property across Sri Lanka",
    );

    expect(
      await Homepage.countDocuments(),
    ).toBe(1);
  });
});