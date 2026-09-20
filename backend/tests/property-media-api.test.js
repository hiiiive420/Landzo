import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const cloudinaryMocks = vi.hoisted(() => ({
  uploadPropertyImageToCloudinary: vi.fn(),
  deletePropertyImageFromCloudinary: vi.fn(),
}));

vi.mock("../src/modules/properties/propertyMedia.cloudinary.js", () => cloudinaryMocks);

import { createApp } from "../src/app.js";
import { STAFF_ROLES, STAFF_STATUSES } from "../src/modules/auth/auth.constants.js";
import { hashPassword } from "../src/modules/auth/auth.service.js";
import { RefreshSession } from "../src/modules/auth/refreshSession.model.js";
import {
  PROPERTY_IMAGE_MAX_IMAGES,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
} from "../src/modules/properties/property.constants.js";
import { Property } from "../src/modules/properties/property.model.js";
import { PropertyCodeCounter } from "../src/modules/properties/propertyCode.model.js";
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
const missingPropertyId = "000000000000000000000000";
const appEnv = {
  ...authTestEnv,
  CLOUDINARY_CLOUD_NAME: "landzo-test-cloud",
  CLOUDINARY_API_KEY: "landzo-test-key",
  CLOUDINARY_API_SECRET: "landzo-test-secret",
};
const app = () => createApp({ env: appEnv });
const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

const createStaffUser = async ({
  fullName = "Landzo Staff",
  email = "staff@example.com",
  role = STAFF_ROLES.OWNER,
  status = STAFF_STATUSES.ACTIVE,
} = {}) =>
  User.create({
    fullName,
    email,
    phone: "+94770000000",
    passwordHash: await hashPassword(password),
    role,
    status,
  });

const loginAs = async (user) => {
  const response = await request(app())
    .post("/api/v1/admin/auth/login")
    .send({ email: user.email, password })
    .expect(200);

  return response.body.data.accessToken;
};

const createProperty = async (overrides = {}) =>
  Property.create({
    code: overrides.code ?? "LND-00001",
    type: overrides.type ?? PROPERTY_TYPES.LAND,
    transactionTypes: overrides.transactionTypes ?? [TRANSACTION_TYPES.SALE],
    title: overrides.title ?? "Media Test Property",
    description: overrides.description ?? null,
    media: overrides.media ?? { images: [] },
  });

const imageBuffer = (size = 12) => Buffer.alloc(size, 1);

const uploadResponse = (index = 1, overrides = {}) => ({
  publicId: `landzo/properties/LND-00001/image-${index}`,
  secureUrl: `https://res.cloudinary.com/landzo/image/upload/v1/image-${index}.webp`,
  width: 1200 + index,
  height: 800 + index,
  format: overrides.format ?? "webp",
  bytes: 12345 + index,
  originalFilename: overrides.originalFilename ?? `image-${index}.jpg`,
  ...overrides,
});

const seedImages = (count, overrides = {}) =>
  Array.from({ length: count }, (_, index) => ({
    publicId: `landzo/properties/LND-00001/existing-${index}`,
    secureUrl: `https://res.cloudinary.com/landzo/image/upload/v1/existing-${index}.jpg`,
    width: 1000,
    height: 700,
    format: "jpg",
    bytes: 1000 + index,
    order: index,
    isCover:
      overrides.coverIndex === index || (!Object.hasOwn(overrides, "coverIndex") && index === 0),
    uploadedAt: new Date(),
    originalFilename: `existing-${index}.jpg`,
  }));

const attachImage = (agent, name, buffer = imageBuffer(), mime = "image/jpeg") =>
  agent.attach("images", buffer, { filename: name, contentType: mime });

const expectSafeMediaPayload = (payload) => {
  const serialized = JSON.stringify(payload).toLowerCase();
  expect(serialized).not.toContain("api_secret");
  expect(serialized).not.toContain("cloudinary_api_secret");
  expect(serialized).not.toContain("private");
  expect(serialized).not.toContain("publicid");
  expect(serialized).not.toContain("public_id");
};

describe("admin property media API", () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await resetTestDatabase();
    await User.init();
    await RefreshSession.init();
    await Role.init();
    await PropertyCodeCounter.init();
    await Property.init();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await bootstrapSystemRoles();
    cloudinaryMocks.uploadPropertyImageToCloudinary.mockReset();
    cloudinaryMocks.deletePropertyImageFromCloudinary.mockReset();
    cloudinaryMocks.deletePropertyImageFromCloudinary.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("enforces authentication and property.edit for upload", async () => {
    const content = await createStaffUser({
      email: "content@example.com",
      role: STAFF_ROLES.CONTENT_MANAGER,
    });
    const token = await loginAs(content);
    const property = await createProperty();

    await attachImage(
      request(app()).post(`/api/v1/admin/properties/${property._id}/media`),
      "photo.jpg",
    ).expect(401);
    await attachImage(
      request(app()).post(`/api/v1/admin/properties/${property._id}/media`).set(authHeader(token)),
      "photo.jpg",
    ).expect(403);
  });

  it("uploads a valid first image as cover with safe metadata", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createProperty();
    cloudinaryMocks.uploadPropertyImageToCloudinary.mockResolvedValueOnce(uploadResponse(1));

    const response = await attachImage(
      request(app()).post(`/api/v1/admin/properties/${property._id}/media`).set(authHeader(token)),
      "photo.jpg",
      imageBuffer(),
      "image/jpeg",
    ).expect(201);

    expect(cloudinaryMocks.uploadPropertyImageToCloudinary).toHaveBeenCalledWith(
      expect.objectContaining({
        env: appEnv,
        folder: "landzo/properties/LND-00001",
        file: expect.objectContaining({ mimetype: "image/jpeg" }),
      }),
    );
    expect(response.body.data.images).toHaveLength(1);
    expect(response.body.data.images[0]).toMatchObject({
      order: 0,
      isCover: true,
      url: uploadResponse(1).secureUrl,
      format: "webp",
      width: uploadResponse(1).width,
      height: uploadResponse(1).height,
      bytes: uploadResponse(1).bytes,
    });
    expect(response.body.data.coverImage.id).toBe(response.body.data.images[0].id);
    expectSafeMediaPayload(response.body);
  });

  it("uploads JPEG, PNG, and WebP sources as persisted WebP images with deterministic order", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createProperty({ media: { images: seedImages(1) } });
    cloudinaryMocks.uploadPropertyImageToCloudinary
      .mockResolvedValueOnce(uploadResponse(2, { originalFilename: "front.jpg" }))
      .mockResolvedValueOnce(uploadResponse(3, { originalFilename: "floor.png" }))
      .mockResolvedValueOnce(uploadResponse(4, { originalFilename: "garden.webp" }));

    const agent = request(app())
      .post(`/api/v1/admin/properties/${property._id}/media`)
      .set(authHeader(token));
    attachImage(agent, "front.jpg", imageBuffer(), "image/jpeg");
    attachImage(agent, "floor.png", imageBuffer(), "image/png");
    const response = await attachImage(agent, "garden.webp", imageBuffer(), "image/webp").expect(
      201,
    );

    expect(cloudinaryMocks.uploadPropertyImageToCloudinary).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ file: expect.objectContaining({ mimetype: "image/jpeg" }) }),
    );
    expect(cloudinaryMocks.uploadPropertyImageToCloudinary).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ file: expect.objectContaining({ mimetype: "image/png" }) }),
    );
    expect(cloudinaryMocks.uploadPropertyImageToCloudinary).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ file: expect.objectContaining({ mimetype: "image/webp" }) }),
    );
    expect(response.body.data.images.map((image) => image.order)).toEqual([0, 1, 2, 3]);
    expect(response.body.data.images.filter((image) => image.isCover)).toHaveLength(1);
    expect(response.body.data.images[0].isCover).toBe(true);
    expect(response.body.data.images.slice(1).map((image) => image.format)).toEqual([
      "webp",
      "webp",
      "webp",
    ]);
    expect(response.body.data.images.slice(1).map((image) => image.bytes)).toEqual([
      uploadResponse(2).bytes,
      uploadResponse(3).bytes,
      uploadResponse(4).bytes,
    ]);
  });

  it("rejects unsupported MIME, oversized files, request count, property max, and missing property", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createProperty();

    const unsupported = await attachImage(
      request(app()).post(`/api/v1/admin/properties/${property._id}/media`).set(authHeader(token)),
      "vector.svg",
      imageBuffer(),
      "image/svg+xml",
    ).expect(415);
    expect(unsupported.body).toMatchObject({ code: "PROPERTY_IMAGE_UNSUPPORTED_TYPE" });

    const oversized = await attachImage(
      request(app()).post(`/api/v1/admin/properties/${property._id}/media`).set(authHeader(token)),
      "large.jpg",
      imageBuffer(10 * 1024 * 1024 + 1),
      "image/jpeg",
    ).expect(413);
    expect(oversized.body).toMatchObject({ code: "PROPERTY_IMAGE_TOO_LARGE" });

    const tooManyRequest = request(app())
      .post(`/api/v1/admin/properties/${property._id}/media`)
      .set(authHeader(token));
    for (let index = 0; index < 11; index += 1) {
      attachImage(tooManyRequest, `photo-${index}.jpg`);
    }
    const tooManyResponse = await tooManyRequest.expect(400);
    expect(tooManyResponse.body).toMatchObject({ code: "PROPERTY_IMAGE_REQUEST_LIMIT_EXCEEDED" });

    await Property.updateOne(
      { _id: property._id },
      { $set: { media: { images: seedImages(PROPERTY_IMAGE_MAX_IMAGES) } } },
    );
    const maxResponse = await attachImage(
      request(app()).post(`/api/v1/admin/properties/${property._id}/media`).set(authHeader(token)),
      "overflow.jpg",
    ).expect(400);
    expect(maxResponse.body).toMatchObject({ code: "PROPERTY_IMAGE_LIMIT_EXCEEDED" });
    expect(cloudinaryMocks.uploadPropertyImageToCloudinary).not.toHaveBeenCalled();

    await attachImage(
      request(app())
        .post(`/api/v1/admin/properties/${missingPropertyId}/media`)
        .set(authHeader(token)),
      "orphan.jpg",
    ).expect(404);
  });

  it("sets cover while clearing the previous cover", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createProperty({ media: { images: seedImages(3) } });
    const stored = await Property.findById(property._id);
    const selectedId = stored.media.images[1]._id.toString();

    const response = await request(app())
      .patch(`/api/v1/admin/properties/${property._id}/media/${selectedId}/cover`)
      .set(authHeader(token))
      .expect(200);

    expect(response.body.data.coverImage.id).toBe(selectedId);
    expect(response.body.data.images.filter((image) => image.isCover)).toHaveLength(1);
    expect(response.body.data.images[0].isCover).toBe(false);
    expect(response.body.data.images[1].isCover).toBe(true);

    await request(app())
      .patch(`/api/v1/admin/properties/${property._id}/media/${missingPropertyId}/cover`)
      .set(authHeader(token))
      .expect(404);
  });

  it("deletes non-cover, cover, and final images using server-resolved public IDs", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createProperty({ media: { images: seedImages(3) } });
    const stored = await Property.findById(property._id);
    const nonCover = stored.media.images[2];

    const deleteNonCover = await request(app())
      .delete(`/api/v1/admin/properties/${property._id}/media/${nonCover._id}`)
      .set(authHeader(token))
      .expect(200);

    expect(cloudinaryMocks.deletePropertyImageFromCloudinary).toHaveBeenCalledWith(
      expect.objectContaining({ publicId: nonCover.publicId }),
    );
    expect(deleteNonCover.body.data.images.map((image) => image.order)).toEqual([0, 1]);
    expect(deleteNonCover.body.data.images.map((image) => image.id)).not.toContain(
      nonCover._id.toString(),
    );

    const afterFirstDelete = await Property.findById(property._id);
    const cover = afterFirstDelete.media.images.find((image) => image.isCover);
    const deleteCover = await request(app())
      .delete(`/api/v1/admin/properties/${property._id}/media/${cover._id}`)
      .set(authHeader(token))
      .expect(200);

    expect(deleteCover.body.data.images).toHaveLength(1);
    expect(deleteCover.body.data.images[0]).toMatchObject({ order: 0, isCover: true });

    const finalImage = deleteCover.body.data.images[0];
    const deleteFinal = await request(app())
      .delete(`/api/v1/admin/properties/${property._id}/media/${finalImage.id}`)
      .set(authHeader(token))
      .expect(200);

    expect(deleteFinal.body.data.images).toEqual([]);
    expect(deleteFinal.body.data.coverImage).toBeNull();
  });

  it("returns a sanitized error when Cloudinary destroy fails", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createProperty({ media: { images: seedImages(1) } });
    const stored = await Property.findById(property._id);
    cloudinaryMocks.deletePropertyImageFromCloudinary.mockRejectedValueOnce(
      new Error("provider secret details"),
    );

    const response = await request(app())
      .delete(`/api/v1/admin/properties/${property._id}/media/${stored.media.images[0]._id}`)
      .set(authHeader(token))
      .expect(500);

    expect(JSON.stringify(response.body)).not.toContain("provider secret details");
    expect((await Property.findById(property._id)).media.images).toHaveLength(1);
  });

  it("reorders images strictly while preserving cover identity", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createProperty({ media: { images: seedImages(3, { coverIndex: 1 }) } });
    const stored = await Property.findById(property._id);
    const ids = stored.media.images.map((image) => image._id.toString());
    const coverId = ids[1];

    const response = await request(app())
      .patch(`/api/v1/admin/properties/${property._id}/media/reorder`)
      .set(authHeader(token))
      .send({ imageIds: [ids[2], ids[1], ids[0]] })
      .expect(200);

    expect(response.body.data.images.map((image) => image.id)).toEqual([ids[2], ids[1], ids[0]]);
    expect(response.body.data.coverImage.id).toBe(coverId);

    await request(app())
      .patch(`/api/v1/admin/properties/${property._id}/media/reorder`)
      .set(authHeader(token))
      .send({ imageIds: [ids[2], ids[1]] })
      .expect(400);
    await request(app())
      .patch(`/api/v1/admin/properties/${property._id}/media/reorder`)
      .set(authHeader(token))
      .send({ imageIds: [ids[2], ids[2], ids[0]] })
      .expect(400);
    await request(app())
      .patch(`/api/v1/admin/properties/${property._id}/media/reorder`)
      .set(authHeader(token))
      .send({ imageIds: [ids[2], ids[1], missingPropertyId] })
      .expect(400);
  });

  it("serializes media gallery in detail, cover only in list, and duplicate media remains empty", async () => {
    const owner = await createStaffUser({ email: "owner@example.com" });
    const token = await loginAs(owner);
    const property = await createProperty({ media: { images: seedImages(2) } });
    await PropertyCodeCounter.create({ key: "property-code:land", sequence: 1 });

    const detail = await request(app())
      .get(`/api/v1/admin/properties/${property._id}`)
      .set(authHeader(token))
      .expect(200);
    expect(detail.body.data.media.images).toHaveLength(2);
    expect(detail.body.data.media.coverImage).toMatchObject({
      id: detail.body.data.media.images[0].id,
    });
    expectSafeMediaPayload(detail.body);

    const list = await request(app())
      .get("/api/v1/admin/properties")
      .set(authHeader(token))
      .expect(200);
    expect(list.body.data[0].coverImage).toMatchObject({ id: detail.body.data.media.images[0].id });
    expect(list.body.data[0].media).toBeUndefined();
    expectSafeMediaPayload(list.body);

    const duplicate = await request(app())
      .post(`/api/v1/admin/properties/${property._id}/duplicate`)
      .set(authHeader(token))
      .expect(201);
    expect(duplicate.body.data.media.images).toEqual([]);
    expect(duplicate.body.data.media.coverImage).toBeNull();
  });
});
