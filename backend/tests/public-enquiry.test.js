import request from "supertest";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { createApp } from "../src/app.js";
import {
  ANALYTICS_CONTEXT_SURFACES,
  ANALYTICS_EVENT_TYPES,
} from "../src/modules/analytics/analytics.constants.js";
import { AnalyticsEvent } from "../src/modules/analytics/analyticsEvent.model.js";
import {
  ENQUIRY_SOURCES,
  ENQUIRY_STATUSES,
} from "../src/modules/enquiries/enquiry.constants.js";
import { Enquiry } from "../src/modules/enquiries/enquiry.model.js";
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
} from "../src/modules/properties/property.constants.js";
import { Property } from "../src/modules/properties/property.model.js";
import { SETTINGS_SINGLETON_KEY } from "../src/modules/settings/settings.constants.js";
import { Settings } from "../src/modules/settings/settings.model.js";
import { authTestEnv } from "./helpers/authTestEnv.js";
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
  resetTestDatabase,
} from "./helpers/testDatabase.js";

const app = () => createApp({ env: authTestEnv });

const createProperty = async ({
  code = "LND-95001",
  isPublic = true,
  deletedAt = null,
} = {}) =>
  Property.create({
    code,
    type: PROPERTY_TYPES.LAND,
    transactionTypes: [TRANSACTION_TYPES.SALE],
    status: PROPERTY_STATUSES.AVAILABLE,
    title: "Public Enquiry Property",
    isPublic,
    deletedAt,
  });

const publicPayload = (overrides = {}) => ({
  fullName: "Public Visitor",
  email: "visitor@example.com",
  message: "I would like to know more about this property.",
  ...overrides,
});

const expectNoVisitorPii = (payload) => {
  const serialized = JSON.stringify(payload).toLowerCase();

  expect(serialized).not.toContain("visitor@example.com");
  expect(serialized).not.toContain("+94770000001");
  expect(serialized).not.toContain("public visitor");
  expect(serialized).not.toContain("i would like to know more");
  expect(serialized).not.toContain("internalnote");
  expect(serialized).not.toContain("assignedto");
  expect(serialized).not.toContain("createdby");
  expect(serialized).not.toContain("updatedby");
  expect(serialized).not.toContain("closedby");
};

describe("public enquiry API", () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await resetTestDatabase();
    await Property.init();
    await Enquiry.init();
    await AnalyticsEvent.init();
    await Settings.init();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await disconnectTestDatabase();
  });

  it("accepts unauthenticated general enquiries and returns a safe response", async () => {
    const response = await request(app())
      .post("/api/v1/enquiries")
      .send(publicPayload({ phone: "+94770000001" }))
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      message: "Enquiry submitted",
      data: {
        submitted: true,
        enquiry: {
          property: null,
        },
      },
    });
    expect(response.body.data.enquiry.id).toEqual(expect.any(String));
    expectNoVisitorPii(response.body);

    const enquiry = await Enquiry.findOne();
    expect(enquiry).toMatchObject({
      fullName: "Public Visitor",
      email: "visitor@example.com",
      phone: "+94770000001",
      source: ENQUIRY_SOURCES.WEBSITE,
      status: ENQUIRY_STATUSES.NEW,
      property: null,
      assignedTo: null,
      internalNote: null,
      createdBy: null,
      updatedBy: null,
      closedBy: null,
    });

    const event = await AnalyticsEvent.findOne();
    expect(event).toMatchObject({
      eventType: ANALYTICS_EVENT_TYPES.ENQUIRY_SUBMITTED,
      property: null,
      context: {
        surface: ANALYTICS_CONTEXT_SURFACES.ENQUIRY,
      },
    });
    expectNoVisitorPii(event);
  });

  it("links property enquiries using the authoritative public property code", async () => {
    const property = await createProperty({ code: "LND-95002" });

    const response = await request(app())
      .post("/api/v1/enquiries")
      .send(publicPayload({ propertyCode: "lnd-95002" }))
      .expect(201);

    expect(response.body.data.enquiry.property).toMatchObject({
      id: property._id.toString(),
      code: "LND-95002",
      title: "Public Enquiry Property",
    });

    const enquiry = await Enquiry.findOne();
    expect(enquiry.property.toString()).toBe(property._id.toString());
    expect(enquiry.source).toBe(ENQUIRY_SOURCES.PROPERTY);

    const event = await AnalyticsEvent.findOne();
    expect(event.property.toString()).toBe(property._id.toString());
    expectNoVisitorPii(event);
  });

  it("rejects invalid, private, and trashed property codes without creating analytics", async () => {
    await createProperty({ code: "LND-95003", isPublic: false });
    await createProperty({ code: "LND-95004", deletedAt: new Date() });

    await request(app())
      .post("/api/v1/enquiries")
      .send(publicPayload({ propertyCode: "LND-95003" }))
      .expect(404)
      .expect((response) => {
        expect(response.body.code).toBe("PUBLIC_ENQUIRY_PROPERTY_NOT_FOUND");
      });

    await request(app())
      .post("/api/v1/enquiries")
      .send(publicPayload({ propertyCode: "LND-95004" }))
      .expect(404)
      .expect((response) => {
        expect(response.body.code).toBe("PUBLIC_ENQUIRY_PROPERTY_NOT_FOUND");
      });

    await request(app())
      .post("/api/v1/enquiries")
      .send(publicPayload({ propertyCode: "not-a-code" }))
      .expect(400);

    expect(await Enquiry.countDocuments()).toBe(0);
    expect(await AnalyticsEvent.countDocuments()).toBe(0);
  });

  it("rejects unknown and internal fields from public submissions", async () => {
    const forbiddenPayloads = [
      { status: ENQUIRY_STATUSES.CLOSED },
      { assignedTo: "64b64c12f5684c8e3bb59c21" },
      { internalNote: "assign this lead" },
      { createdBy: "64b64c12f5684c8e3bb59c21" },
      { updatedBy: "64b64c12f5684c8e3bb59c21" },
      { closedBy: "64b64c12f5684c8e3bb59c21" },
      { closedAt: new Date().toISOString() },
      { customerId: "64b64c12f5684c8e3bb59c21" },
      { analytics: { source: "visitor" } },
    ];

    for (const forbiddenFields of forbiddenPayloads) {
      await request(app())
        .post("/api/v1/enquiries")
        .send(publicPayload(forbiddenFields))
        .expect(400);
    }

    expect(await Enquiry.countDocuments()).toBe(0);
    expect(await AnalyticsEvent.countDocuments()).toBe(0);
  });

  it("requires a valid contact method and records no analytics on validation failure", async () => {
    await request(app())
      .post("/api/v1/enquiries")
      .send(publicPayload({ email: undefined, phone: undefined }))
      .expect(400);

    await request(app())
      .post("/api/v1/enquiries")
      .send(publicPayload({ email: "bad-email" }))
      .expect(400);

    await request(app())
      .post("/api/v1/enquiries")
      .send(publicPayload({ email: undefined, phone: "1234" }))
      .expect(400);

    expect(await Enquiry.countDocuments()).toBe(0);
    expect(await AnalyticsEvent.countDocuments()).toBe(0);
  });

  it("keeps the public enquiry route POST-only", async () => {
    await request(app()).get("/api/v1/enquiries").expect(404);
    await request(app()).patch("/api/v1/enquiries").send(publicPayload()).expect(404);
    await request(app()).delete("/api/v1/enquiries").expect(404);
  });

  it("does not fail persisted enquiries when analytics recording fails", async () => {
    vi.spyOn(AnalyticsEvent, "create").mockRejectedValueOnce(
      new Error("analytics offline"),
    );

    await request(app())
      .post("/api/v1/enquiries")
      .send(publicPayload())
      .expect(201);

    expect(await Enquiry.countDocuments()).toBe(1);
  });

  it("leaves existing admin enquiry behavior protected", async () => {
    await request(app())
      .post("/api/v1/admin/enquiries")
      .send(publicPayload())
      .expect(401);
  });
});

describe("public contact settings API", () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await resetTestDatabase();
    await Settings.init();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("returns only safe public business and social fields", async () => {
    await Settings.create({
      key: SETTINGS_SINGLETON_KEY,
      business: {
        name: "LANDZO",
        email: "hello@landzo.test",
        phone: "+94770000000",
        whatsapp: "+94770000000",
        address: "Colombo, Sri Lanka",
      },
      social: {
        facebook: "https://facebook.example/landzo",
        instagram: "https://instagram.example/landzo",
        linkedin: "https://linkedin.example/company/landzo",
        youtube: "https://youtube.example/landzo",
      },
      website: {
        defaultMetaTitle: "Private admin meta",
        defaultMetaDescription: "Private admin description",
      },
    });

    const response = await request(app())
      .get("/api/v1/settings/contact")
      .expect(200);

    expect(response.body.data).toEqual({
      business: {
        name: "LANDZO",
        email: "hello@landzo.test",
        phone: "+94770000000",
        whatsapp: "+94770000000",
        address: "Colombo, Sri Lanka",
      },
      social: {
        facebook: "https://facebook.example/landzo",
        instagram: "https://instagram.example/landzo",
        linkedin: "https://linkedin.example/company/landzo",
        youtube: "https://youtube.example/landzo",
      },
    });

    const serialized = JSON.stringify(response.body.data).toLowerCase();
    expect(serialized).not.toContain("website");
    expect(serialized).not.toContain("updatedby");
    expect(serialized).not.toContain("updatedat");
    expect(serialized).not.toContain("global");
  });

  it("keeps public contact settings read-only", async () => {
    await request(app()).post("/api/v1/settings/contact").send({}).expect(404);
    await request(app()).patch("/api/v1/settings/contact").send({}).expect(404);
    await request(app()).delete("/api/v1/settings/contact").expect(404);
  });
});