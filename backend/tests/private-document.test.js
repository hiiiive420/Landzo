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

const cloudinaryMocks = vi.hoisted(() => ({
  uploadPrivateDocumentToCloudinary: vi.fn(),
  deletePrivateDocumentFromCloudinary: vi.fn(),
  createPrivateDocumentAccessUrl: vi.fn(),
}));

vi.mock(
  "../src/modules/private-documents/privateDocumentStorage.cloudinary.js",
  () => cloudinaryMocks,
);

import { createApp } from "../src/app.js";
import {
  STAFF_ROLES,
  STAFF_STATUSES,
} from "../src/modules/auth/auth.constants.js";
import { hashPassword } from "../src/modules/auth/auth.service.js";
import { RefreshSession } from "../src/modules/auth/refreshSession.model.js";
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "../src/modules/audit/audit.constants.js";
import { AuditLog } from "../src/modules/audit/auditLog.model.js";
import {
  PRIVATE_DOCUMENT_CATEGORIES,
  PRIVATE_DOCUMENT_LIMITS,
  PRIVATE_DOCUMENT_STATUSES,
} from "../src/modules/private-documents/privateDocument.constants.js";
import { PrivateDocument } from "../src/modules/private-documents/privateDocument.model.js";
import {
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

const appEnv = {
  ...authTestEnv,
  CLOUDINARY_CLOUD_NAME: "landzo-test-cloud",
  CLOUDINARY_API_KEY: "landzo-test-key",
  CLOUDINARY_API_SECRET: "landzo-test-secret",
};

const app = () =>
  createApp({
    env: appEnv,
  });

const authHeader = (token) => ({
  Authorization: `Bearer ${token}`,
});

const createStaffUser = async ({
  fullName = "LANDZO Staff",
  email = "staff@example.com",
  role = STAFF_ROLES.OWNER,
  status = STAFF_STATUSES.ACTIVE,
} = {}) =>
  User.create({
    fullName,
    email,
    phone: "+94770000000",
    passwordHash:
      await hashPassword(password),
    role,
    status,
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

const createProperty = async (
  overrides = {},
) =>
  Property.create({
    code:
      overrides.code ??
      "LND-00001",

    type:
      overrides.type ??
      PROPERTY_TYPES.LAND,

    transactionTypes:
      overrides.transactionTypes ??
      [TRANSACTION_TYPES.SALE],

    title:
      overrides.title ??
      "Private Document Property",

    description:
      overrides.description ??
      null,

    deletedAt:
      overrides.deletedAt ??
      null,
  });

const documentBuffer = (
  size = 32,
) => Buffer.alloc(size, 1);

const privateUploadResponse = (
  overrides = {},
) => ({
  publicId:
    "landzo/private-documents/test/document-1",

  resourceType: "raw",

  format: "pdf",

  bytes: 12345,

  originalFilename:
    "land-deed.pdf",

  mimeType:
    "application/pdf",

  ...overrides,
});

const attachPrivateDocument = ({
  agent,
  filename = "land-deed.pdf",
  mimeType = "application/pdf",
  buffer = documentBuffer(),
  title = "Land Deed",
  description = "Internal document",
  category =
    PRIVATE_DOCUMENT_CATEGORIES.GENERAL,
  entityId,
}) => {
  agent
    .field("title", title)
    .field(
      "description",
      description,
    )
    .field(
      "category",
      category,
    );

  if (entityId) {
    agent.field(
      "entityId",
      entityId,
    );
  }

  return agent.attach(
    "file",
    buffer,
    {
      filename,
      contentType:
        mimeType,
    },
  );
};

const expectSafePrivateDocumentPayload = (
  payload,
) => {
  const serialized =
    JSON.stringify(
      payload,
    ).toLowerCase();

  expect(serialized).not.toContain(
    "publicid",
  );

  expect(serialized).not.toContain(
    "public_id",
  );

  expect(serialized).not.toContain(
    "resourcetype",
  );

  expect(serialized).not.toContain(
    "secureurl",
  );

  expect(serialized).not.toContain(
    "secure_url",
  );

  expect(serialized).not.toContain(
    "cloudinary.com",
  );

  expect(serialized).not.toContain(
    "api_secret",
  );

  expect(serialized).not.toContain(
    "passwordhash",
  );

  expect(serialized).not.toContain(
    "authversion",
  );
};

const seedPrivateDocument =
  async ({
    actor,
    title =
      "Existing Private Document",
    category =
      PRIVATE_DOCUMENT_CATEGORIES.GENERAL,
    entityId = null,
    status =
      PRIVATE_DOCUMENT_STATUSES.ACTIVE,
    filename =
      "existing.pdf",
  }) =>
    PrivateDocument.create({
      title,
      description: "",
      category,
      entityId,

      storage: {
        publicId:
          `landzo/private-documents/test/${filename}`,

        resourceType:
          "raw",

        format:
          "pdf",

        bytes: 1000,

        mimeType:
          "application/pdf",

        originalFilename:
          filename,
      },

      status,
      createdBy:
        actor._id,
    });

describe(
  "admin private document API",
  () => {
    beforeAll(async () => {
      await connectTestDatabase();
      await resetTestDatabase();

      await User.init();
      await RefreshSession.init();
      await Role.init();
      await PropertyCodeCounter.init();
      await Property.init();
      await PrivateDocument.init();
      await AuditLog.init();
    });

    beforeEach(async () => {
      await clearTestDatabase();
      await bootstrapSystemRoles();

      cloudinaryMocks.uploadPrivateDocumentToCloudinary.mockReset();
      cloudinaryMocks.deletePrivateDocumentFromCloudinary.mockReset();
      cloudinaryMocks.createPrivateDocumentAccessUrl.mockReset();

      cloudinaryMocks.deletePrivateDocumentFromCloudinary.mockResolvedValue(
        undefined,
      );
      cloudinaryMocks.createPrivateDocumentAccessUrl.mockReturnValue(
        "https://signed.example.test/private-document",
      );
    });

    afterAll(async () => {
      await disconnectTestDatabase();
    });

    it(
      "protects private documents with authentication and capability RBAC",
      async () => {
        const content =
          await createStaffUser({
            email:
              "content@example.com",

            role:
              STAFF_ROLES.CONTENT_MANAGER,
          });

        const support =
          await createStaffUser({
            email:
              "support@example.com",

            role:
              STAFF_ROLES.ENQUIRY_SUPPORT,
          });

        const admin =
          await createStaffUser({
            email:
              "admin@example.com",

            role:
              STAFF_ROLES.ADMIN,
          });

        const contentToken =
          await loginAs(
            content,
          );

        const supportToken =
          await loginAs(
            support,
          );

        const adminToken =
          await loginAs(
            admin,
          );

        await request(app())
          .get(
            "/api/v1/admin/private-documents",
          )
          .expect(401);

        await request(app())
          .get(
            "/api/v1/admin/private-documents",
          )
          .set(
            authHeader(
              contentToken,
            ),
          )
          .expect(403);

        await request(app())
          .get(
            "/api/v1/admin/private-documents",
          )
          .set(
            authHeader(
              supportToken,
            ),
          )
          .expect(403);

        await request(app())
          .get(
            "/api/v1/admin/private-documents",
          )
          .set(
            authHeader(
              adminToken,
            ),
          )
          .expect(200);
      },
    );

    it(
      "uploads a valid private PDF and returns only safe metadata",
      async () => {
        const owner =
          await createStaffUser({
            email:
              "owner@example.com",
          });

        const token =
          await loginAs(
            owner,
          );

        cloudinaryMocks.uploadPrivateDocumentToCloudinary.mockResolvedValueOnce(
          privateUploadResponse(),
        );

        const response =
          await attachPrivateDocument({
            agent:
              request(app())
                .post(
                  "/api/v1/admin/private-documents",
                )
                .set(
                  authHeader(
                    token,
                  ),
                ),

            title:
              "Land Deed",

            category:
              PRIVATE_DOCUMENT_CATEGORIES.GENERAL,
          }).expect(201);

        expect(
          cloudinaryMocks.uploadPrivateDocumentToCloudinary,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            env: appEnv,

            folder:
              expect.stringMatching(
                /^landzo\/private-documents\/[0-9a-f]{24}$/,
              ),

            file:
              expect.objectContaining({
                mimetype:
                  "application/pdf",

                originalname:
                  "land-deed.pdf",
              }),
          }),
        );

        expect(
          response.body.data,
        ).toMatchObject({
          title:
            "Land Deed",

          category:
            PRIVATE_DOCUMENT_CATEGORIES.GENERAL,

          entityId:
            null,

          status:
            PRIVATE_DOCUMENT_STATUSES.ACTIVE,

          file: {
            originalFilename:
              "land-deed.pdf",

            mimeType:
              "application/pdf",

            format:
              "pdf",

            bytes:
              privateUploadResponse()
                .bytes,
          },

          createdBy: {
            id:
              owner._id.toString(),

            fullName:
              owner.fullName,
          },
        });

        expectSafePrivateDocumentPayload(
          response.body,
        );

        const stored =
          await PrivateDocument.findOne(
            {},
          ).lean();

        expect(
          stored.storage.publicId,
        ).toBe(
          privateUploadResponse()
            .publicId,
        );

        expect(
          stored.storage.resourceType,
        ).toBe("raw");
      },
    );

    it(
      "creates an upload audit log without document title or filename",
      async () => {
        const owner =
          await createStaffUser({
            email:
              "owner@example.com",
          });

        const token =
          await loginAs(
            owner,
          );

        cloudinaryMocks.uploadPrivateDocumentToCloudinary.mockResolvedValueOnce(
          privateUploadResponse({
            originalFilename:
              "sensitive-contract.pdf",
          }),
        );

        const response =
          await attachPrivateDocument({
            agent:
              request(app())
                .post(
                  "/api/v1/admin/private-documents",
                )
                .set(
                  authHeader(
                    token,
                  ),
                ),

            filename:
              "sensitive-contract.pdf",

            title:
              "Confidential Agreement",

            category:
              PRIVATE_DOCUMENT_CATEGORIES.GENERAL,
          }).expect(201);

        const auditLog =
          await AuditLog.findOne({
            entityId:
              response.body.data.id,
          }).lean();

        expect(
          auditLog,
        ).toMatchObject({
          actor:
            owner._id,

          action:
            AUDIT_ACTIONS.PRIVATE_DOCUMENT_UPLOADED,

          entityType:
            AUDIT_ENTITY_TYPES.PRIVATE_DOCUMENT,

          entityLabel:
            "Private Document",
        });

        expect(
          JSON.stringify(
            auditLog,
          ),
        ).not.toContain(
          "Confidential Agreement",
        );

        expect(
          JSON.stringify(
            auditLog,
          ),
        ).not.toContain(
          "sensitive-contract.pdf",
        );
      },
    );

    it(
      "validates linked Property documents and rejects invalid links",
      async () => {
        const owner =
          await createStaffUser({
            email:
              "owner@example.com",
          });

        const token =
          await loginAs(
            owner,
          );

        const property =
          await createProperty();

        cloudinaryMocks.uploadPrivateDocumentToCloudinary.mockResolvedValueOnce(
          privateUploadResponse(),
        );

        const valid =
          await attachPrivateDocument({
            agent:
              request(app())
                .post(
                  "/api/v1/admin/private-documents",
                )
                .set(
                  authHeader(
                    token,
                  ),
                ),

            category:
              PRIVATE_DOCUMENT_CATEGORIES.PROPERTY,

            entityId:
              property._id.toString(),
          }).expect(201);

        expect(
          valid.body.data.entityId,
        ).toBe(
          property._id.toString(),
        );

        const missingId =
          await attachPrivateDocument({
            agent:
              request(app())
                .post(
                  "/api/v1/admin/private-documents",
                )
                .set(
                  authHeader(
                    token,
                  ),
                ),

            category:
              PRIVATE_DOCUMENT_CATEGORIES.PROPERTY,
          }).expect(400);

        expect(
          missingId.body.code,
        ).toBe(
          "VALIDATION_ERROR",
        );

        const missingPropertyId =
          "000000000000000000000000";

        const missingEntity =
          await attachPrivateDocument({
            agent:
              request(app())
                .post(
                  "/api/v1/admin/private-documents",
                )
                .set(
                  authHeader(
                    token,
                  ),
                ),

            category:
              PRIVATE_DOCUMENT_CATEGORIES.PROPERTY,

            entityId:
              missingPropertyId,
          }).expect(404);

        expect(
          missingEntity.body.code,
        ).toBe(
          "PRIVATE_DOCUMENT_LINKED_ENTITY_NOT_FOUND",
        );

        const deletedProperty =
          await createProperty({
            code:
              "LND-00002",

            deletedAt:
              new Date(),
          });

        const deletedLink =
          await attachPrivateDocument({
            agent:
              request(app())
                .post(
                  "/api/v1/admin/private-documents",
                )
                .set(
                  authHeader(
                    token,
                  ),
                ),

            category:
              PRIVATE_DOCUMENT_CATEGORIES.PROPERTY,

            entityId:
              deletedProperty._id.toString(),
          }).expect(404);

        expect(
          deletedLink.body.code,
        ).toBe(
          "PRIVATE_DOCUMENT_LINKED_ENTITY_NOT_FOUND",
        );
      },
    );

    it(
      "rejects entityId for general documents",
      async () => {
        const owner =
          await createStaffUser({
            email:
              "owner@example.com",
          });

        const token =
          await loginAs(
            owner,
          );

        const response =
          await attachPrivateDocument({
            agent:
              request(app())
                .post(
                  "/api/v1/admin/private-documents",
                )
                .set(
                  authHeader(
                    token,
                  ),
                ),

            category:
              PRIVATE_DOCUMENT_CATEGORIES.GENERAL,

            entityId:
              "000000000000000000000001",
          }).expect(400);

        expect(
          response.body.code,
        ).toBe(
          "VALIDATION_ERROR",
        );

        expect(
          cloudinaryMocks.uploadPrivateDocumentToCloudinary,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "rejects missing files and unsupported MIME types",
      async () => {
        const owner =
          await createStaffUser({
            email:
              "owner@example.com",
          });

        const token =
          await loginAs(
            owner,
          );

        const missingFile =
          await request(app())
            .post(
              "/api/v1/admin/private-documents",
            )
            .set(
              authHeader(
                token,
              ),
            )
            .field(
              "title",
              "Missing File",
            )
            .field(
              "category",
              PRIVATE_DOCUMENT_CATEGORIES.GENERAL,
            )
            .expect(400);

        expect(
          missingFile.body.code,
        ).toBe(
          "PRIVATE_DOCUMENT_FILE_REQUIRED",
        );

        const unsupported =
          await attachPrivateDocument({
            agent:
              request(app())
                .post(
                  "/api/v1/admin/private-documents",
                )
                .set(
                  authHeader(
                    token,
                  ),
                ),

            filename:
              "unsafe.svg",

            mimeType:
              "image/svg+xml",

            category:
              PRIVATE_DOCUMENT_CATEGORIES.GENERAL,
          }).expect(415);

        expect(
          unsupported.body.code,
        ).toBe(
          "PRIVATE_DOCUMENT_UNSUPPORTED_TYPE",
        );

        expect(
          cloudinaryMocks.uploadPrivateDocumentToCloudinary,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "rejects files larger than the approved 20 MB boundary",
      async () => {
        const owner =
          await createStaffUser({
            email:
              "owner@example.com",
          });

        const token =
          await loginAs(
            owner,
          );

        await attachPrivateDocument({
          agent:
            request(app())
              .post(
                "/api/v1/admin/private-documents",
              )
              .set(
                authHeader(
                  token,
                ),
              ),

          buffer:
            documentBuffer(
              PRIVATE_DOCUMENT_LIMITS.maxFileSizeBytes +
                1,
            ),

          category:
            PRIVATE_DOCUMENT_CATEGORIES.GENERAL,
        }).expect(413);

        expect(
          cloudinaryMocks.uploadPrivateDocumentToCloudinary,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "lists active documents with filters, search and pagination",
      async () => {
        const owner =
          await createStaffUser({
            email:
              "owner@example.com",
          });

        const token =
          await loginAs(
            owner,
          );

        const property =
          await createProperty();

        await seedPrivateDocument({
          actor:
            owner,

          title:
            "General Contract",

          filename:
            "general-contract.pdf",
        });

        await seedPrivateDocument({
          actor:
            owner,

          title:
            "Land Deed",

          category:
            PRIVATE_DOCUMENT_CATEGORIES.PROPERTY,

          entityId:
            property._id,

          filename:
            "deed-2026.pdf",
        });

        await seedPrivateDocument({
          actor:
            owner,

          title:
            "Deleted Record",

          status:
            PRIVATE_DOCUMENT_STATUSES.DELETED,

          filename:
            "deleted.pdf",
        });

        const defaultList =
          await request(app())
            .get(
              "/api/v1/admin/private-documents",
            )
            .set(
              authHeader(
                token,
              ),
            )
            .expect(200);

        expect(
          defaultList.body.meta.total,
        ).toBe(2);

        expect(
          defaultList.body.data,
        ).toHaveLength(2);

        expectSafePrivateDocumentPayload(
          defaultList.body,
        );

        const propertyList =
          await request(app())
            .get(
              "/api/v1/admin/private-documents",
            )
            .query({
              category:
                PRIVATE_DOCUMENT_CATEGORIES.PROPERTY,

              entityId:
                property._id.toString(),
            })
            .set(
              authHeader(
                token,
              ),
            )
            .expect(200);

        expect(
          propertyList.body.data,
        ).toHaveLength(1);

        expect(
          propertyList.body.data[0]
            .title,
        ).toBe(
          "Land Deed",
        );

        const search =
          await request(app())
            .get(
              "/api/v1/admin/private-documents",
            )
            .query({
              search:
                "deed-2026",
            })
            .set(
              authHeader(
                token,
              ),
            )
            .expect(200);

        expect(
          search.body.meta.total,
        ).toBe(1);

        const deleted =
          await request(app())
            .get(
              "/api/v1/admin/private-documents",
            )
            .query({
              status:
                PRIVATE_DOCUMENT_STATUSES.DELETED,
            })
            .set(
              authHeader(
                token,
              ),
            )
            .expect(200);

        expect(
          deleted.body.meta.total,
        ).toBe(1);

        const paginated =
          await request(app())
            .get(
              "/api/v1/admin/private-documents",
            )
            .query({
              page: 2,
              limit: 1,
            })
            .set(
              authHeader(
                token,
              ),
            )
            .expect(200);

        expect(
          paginated.body.meta,
        ).toMatchObject({
          page: 2,
          limit: 1,
          total: 2,
          totalPages: 2,
        });

        expect(
          paginated.body.data,
        ).toHaveLength(1);
      },
    );

    it(
      "returns safe detail and validates document IDs and unknown filters",
      async () => {
        const owner =
          await createStaffUser({
            email:
              "owner@example.com",
          });

        const token =
          await loginAs(
            owner,
          );

        const document =
          await seedPrivateDocument({
            actor:
              owner,
          });

        const detail =
          await request(app())
            .get(
              `/api/v1/admin/private-documents/${document._id}`,
            )
            .set(
              authHeader(
                token,
              ),
            )
            .expect(200);

        expect(
          detail.body.data.id,
        ).toBe(
          document._id.toString(),
        );

        expectSafePrivateDocumentPayload(
          detail.body,
        );

        await request(app())
          .get(
            "/api/v1/admin/private-documents/not-an-object-id",
          )
          .set(
            authHeader(
              token,
            ),
          )
          .expect(400);

        await request(app())
          .get(
            "/api/v1/admin/private-documents",
          )
          .query({
            unexpected:
              "value",
          })
          .set(
            authHeader(
              token,
            ),
          )
          .expect(400);
      },
    );

    it(
      "does not persist a document when Cloudinary upload fails",
      async () => {
        const owner =
          await createStaffUser({
            email:
              "owner@example.com",
          });

        const token =
          await loginAs(
            owner,
          );

        cloudinaryMocks.uploadPrivateDocumentToCloudinary.mockRejectedValueOnce(
          new Error(
            "provider secret failure",
          ),
        );

        const response =
          await attachPrivateDocument({
            agent:
              request(app())
                .post(
                  "/api/v1/admin/private-documents",
                )
                .set(
                  authHeader(
                    token,
                  ),
                ),

            category:
              PRIVATE_DOCUMENT_CATEGORIES.GENERAL,
          }).expect(500);

        expect(
          await PrivateDocument.countDocuments(),
        ).toBe(0);

        expect(
          JSON.stringify(
            response.body,
          ),
        ).not.toContain(
          "provider secret failure",
        );
      },
    );

    it(
      "attempts Cloudinary compensation when Mongo persistence fails",
      async () => {
        const owner =
          await createStaffUser({
            email:
              "owner@example.com",
          });

        const token =
          await loginAs(
            owner,
          );

        /*
         * Missing required bytes causes the Mongo
         * storage subdocument validation to fail
         * after Cloudinary has already succeeded.
         */
        cloudinaryMocks.uploadPrivateDocumentToCloudinary.mockResolvedValueOnce(
          privateUploadResponse({
            bytes:
              undefined,
          }),
        );

        await attachPrivateDocument({
          agent:
            request(app())
              .post(
                "/api/v1/admin/private-documents",
              )
              .set(
                authHeader(
                  token,
                ),
              ),

          category:
            PRIVATE_DOCUMENT_CATEGORIES.GENERAL,
        }).expect(500);

        expect(
          cloudinaryMocks.deletePrivateDocumentFromCloudinary,
        ).toHaveBeenCalledWith({
          env: appEnv,

          publicId:
            privateUploadResponse()
              .publicId,

          resourceType:
            privateUploadResponse()
              .resourceType,
        });

        expect(
          await PrivateDocument.countDocuments(),
        ).toBe(0);

        expect(
          await AuditLog.countDocuments({
            action:
              AUDIT_ACTIONS.PRIVATE_DOCUMENT_UPLOADED,
          }),
        ).toBe(0);
      },
    );

    it("generates secure access URLs only for authorized active documents", async () => {
      const content = await createStaffUser({
        email: "content@example.com",
        role: STAFF_ROLES.CONTENT_MANAGER,
      });
      const admin = await createStaffUser({
        email: "admin@example.com",
        role: STAFF_ROLES.ADMIN,
      });
      const owner = await createStaffUser({ email: "owner@example.com" });
      const contentToken = await loginAs(content);
      const adminToken = await loginAs(admin);
      const ownerToken = await loginAs(owner);
      const document = await seedPrivateDocument({
        actor: owner,
        title: "Sensitive Settlement",
        filename: "private-file.pdf",
      });

      await request(app())
        .get(`/api/v1/admin/private-documents/${document._id}/access`)
        .expect(401);

      await request(app())
        .get(`/api/v1/admin/private-documents/${document._id}/access`)
        .set(authHeader(contentToken))
        .expect(403);

      const viewResponse = await request(app())
        .get(`/api/v1/admin/private-documents/${document._id}/access`)
        .query({ attachment: "false" })
        .set(authHeader(adminToken))
        .expect(200);

      expect(viewResponse.body.data).toEqual({
        url: "https://signed.example.test/private-document",
        expiresInSeconds: 300,
      });
      expect(cloudinaryMocks.createPrivateDocumentAccessUrl).toHaveBeenCalledWith({
        env: appEnv,
        publicId: document.storage.publicId,
        resourceType: document.storage.resourceType,
        format: document.storage.format,
        attachment: false,
        expiresInSeconds: 300,
      });

      await request(app())
        .get(`/api/v1/admin/private-documents/${document._id}/access`)
        .query({ attachment: "true" })
        .set(authHeader(ownerToken))
        .expect(200);

      expect(cloudinaryMocks.createPrivateDocumentAccessUrl).toHaveBeenLastCalledWith(
        expect.objectContaining({ attachment: true }),
      );

      const stored = await PrivateDocument.findById(document._id).lean();
      expect(JSON.stringify(stored)).not.toContain("signed.example.test");

      const auditLog = await AuditLog.findOne({
        action: AUDIT_ACTIONS.PRIVATE_DOCUMENT_VIEWED,
      }).lean();
      expect(auditLog).toMatchObject({
        entityType: AUDIT_ENTITY_TYPES.PRIVATE_DOCUMENT,
        entityLabel: "Private Document",
      });
      expect(JSON.stringify(auditLog)).not.toContain("Sensitive Settlement");
      expect(JSON.stringify(auditLog)).not.toContain("private-file.pdf");
      expect(JSON.stringify(auditLog)).not.toContain("signed.example.test");
      expect(JSON.stringify(auditLog)).not.toContain(document.storage.publicId);
    });

    it("rejects invalid, missing, deleted, and failed access without false viewed audit", async () => {
      const owner = await createStaffUser({ email: "owner@example.com" });
      const token = await loginAs(owner);
      const deletedDocument = await seedPrivateDocument({
        actor: owner,
        status: PRIVATE_DOCUMENT_STATUSES.DELETED,
        filename: "deleted.pdf",
      });

      await request(app())
        .get("/api/v1/admin/private-documents/not-an-object-id/access")
        .set(authHeader(token))
        .expect(400);

      await request(app())
        .get("/api/v1/admin/private-documents/000000000000000000000000/access")
        .set(authHeader(token))
        .expect(404);

      await request(app())
        .get(`/api/v1/admin/private-documents/${deletedDocument._id}/access`)
        .set(authHeader(token))
        .expect(404);

      const activeDocument = await seedPrivateDocument({ actor: owner });
      cloudinaryMocks.createPrivateDocumentAccessUrl.mockImplementationOnce(() => {
        throw new Error("provider signed url failure");
      });

      const response = await request(app())
        .get(`/api/v1/admin/private-documents/${activeDocument._id}/access`)
        .set(authHeader(token))
        .expect(500);

      expect(JSON.stringify(response.body)).not.toContain("provider signed url failure");
      expect(
        await AuditLog.countDocuments({
          action: AUDIT_ACTIONS.PRIVATE_DOCUMENT_VIEWED,
        }),
      ).toBe(0);
    });

    it("replaces private document files without changing document identity or unsafe response data", async () => {
      const owner = await createStaffUser({ email: "owner@example.com" });
      const token = await loginAs(owner);
      const document = await seedPrivateDocument({
        actor: owner,
        title: "Document Title",
        category: PRIVATE_DOCUMENT_CATEGORIES.GENERAL,
        filename: "old.pdf",
      });
      const oldStorage = document.storage.toObject();

      cloudinaryMocks.uploadPrivateDocumentToCloudinary.mockResolvedValueOnce(
        privateUploadResponse({
          publicId: "landzo/private-documents/test/new-file",
          bytes: 2222,
          originalFilename: "replacement.pdf",
        }),
      );

      const response = await attachPrivateDocument({
        agent: request(app())
          .post(`/api/v1/admin/private-documents/${document._id}/file`)
          .set(authHeader(token)),
        filename: "replacement.pdf",
        title: "Ignored Title",
        category: PRIVATE_DOCUMENT_CATEGORIES.GENERAL,
      }).expect(200);

      expect(response.body.data).toMatchObject({
        id: document._id.toString(),
        title: "Document Title",
        category: PRIVATE_DOCUMENT_CATEGORIES.GENERAL,
        file: {
          originalFilename: "replacement.pdf",
          bytes: 2222,
        },
      });
      expectSafePrivateDocumentPayload(response.body);

      const stored = await PrivateDocument.findById(document._id).lean();
      expect(stored.storage.publicId).toBe("landzo/private-documents/test/new-file");
      expect(stored.storage.publicId).not.toBe(oldStorage.publicId);
      expect(stored.title).toBe("Document Title");
      expect(stored.category).toBe(PRIVATE_DOCUMENT_CATEGORIES.GENERAL);

      expect(cloudinaryMocks.deletePrivateDocumentFromCloudinary).toHaveBeenCalledWith({
        env: appEnv,
        publicId: oldStorage.publicId,
        resourceType: oldStorage.resourceType,
      });
      expect(
        await AuditLog.countDocuments({
          action: AUDIT_ACTIONS.PRIVATE_DOCUMENT_REPLACED,
        }),
      ).toBe(1);

      const deletedDocument = await seedPrivateDocument({
        actor: owner,
        status: PRIVATE_DOCUMENT_STATUSES.DELETED,
        filename: "deleted-replace.pdf",
      });
      await attachPrivateDocument({
        agent: request(app())
          .post(`/api/v1/admin/private-documents/${deletedDocument._id}/file`)
          .set(authHeader(token)),
      }).expect(404);

      await request(app())
        .post(`/api/v1/admin/private-documents/${document._id}/file`)
        .set(authHeader(token))
        .expect(400);

      await attachPrivateDocument({
        agent: request(app())
          .post(`/api/v1/admin/private-documents/${document._id}/file`)
          .set(authHeader(token)),
        filename: "unsafe.svg",
        mimeType: "image/svg+xml",
      }).expect(415);

      const stableDocument = await seedPrivateDocument({
        actor: owner,
        filename: "stable.pdf",
      });
      cloudinaryMocks.uploadPrivateDocumentToCloudinary.mockResolvedValueOnce(
        privateUploadResponse({
          publicId: "landzo/private-documents/test/broken-new",
          bytes: undefined,
          originalFilename: "broken.pdf",
        }),
      );

      await attachPrivateDocument({
        agent: request(app())
          .post(`/api/v1/admin/private-documents/${stableDocument._id}/file`)
          .set(authHeader(token)),
        filename: "broken.pdf",
      }).expect(500);

      const unchanged = await PrivateDocument.findById(stableDocument._id).lean();
      expect(unchanged.storage.publicId).toBe(stableDocument.storage.publicId);
      expect(cloudinaryMocks.deletePrivateDocumentFromCloudinary).toHaveBeenCalledWith({
        env: appEnv,
        publicId: "landzo/private-documents/test/broken-new",
        resourceType: "raw",
      });

      const cleanupDocument = await seedPrivateDocument({
        actor: owner,
        filename: "cleanup-old.pdf",
      });
      cloudinaryMocks.uploadPrivateDocumentToCloudinary.mockResolvedValueOnce(
        privateUploadResponse({
          publicId: "landzo/private-documents/test/cleanup-new",
          originalFilename: "cleanup-new.pdf",
        }),
      );
      cloudinaryMocks.deletePrivateDocumentFromCloudinary.mockRejectedValueOnce(
        new Error("old cleanup failed"),
      );

      await attachPrivateDocument({
        agent: request(app())
          .post(`/api/v1/admin/private-documents/${cleanupDocument._id}/file`)
          .set(authHeader(token)),
        filename: "cleanup-new.pdf",
      }).expect(200);

      const cleanupStored = await PrivateDocument.findById(cleanupDocument._id).lean();
      expect(cleanupStored.storage.publicId).toBe("landzo/private-documents/test/cleanup-new");
    });

    it("deletes private documents as tombstones only after Cloudinary deletion succeeds", async () => {
      const content = await createStaffUser({
        email: "content@example.com",
        role: STAFF_ROLES.CONTENT_MANAGER,
      });
      const owner = await createStaffUser({ email: "owner@example.com" });
      const contentToken = await loginAs(content);
      const token = await loginAs(owner);
      const document = await seedPrivateDocument({
        actor: owner,
        title: "Delete Me",
        filename: "delete-me.pdf",
      });
      const publicId = document.storage.publicId;
      const resourceType = document.storage.resourceType;

      await request(app())
        .delete(`/api/v1/admin/private-documents/${document._id}`)
        .expect(401);

      await request(app())
        .delete(`/api/v1/admin/private-documents/${document._id}`)
        .set(authHeader(contentToken))
        .expect(403);

      await request(app())
        .delete("/api/v1/admin/private-documents/not-an-object-id")
        .set(authHeader(token))
        .expect(400);

      await request(app())
        .delete("/api/v1/admin/private-documents/000000000000000000000000")
        .set(authHeader(token))
        .expect(404);

      const response = await request(app())
        .delete(`/api/v1/admin/private-documents/${document._id}`)
        .set(authHeader(token))
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: document._id.toString(),
        status: PRIVATE_DOCUMENT_STATUSES.DELETED,
        deletedBy: {
          id: owner._id.toString(),
        },
      });
      expect(response.body.data.deletedAt).toBeTruthy();
      expectSafePrivateDocumentPayload(response.body);
      expect(cloudinaryMocks.deletePrivateDocumentFromCloudinary).toHaveBeenCalledWith({
        env: appEnv,
        publicId,
        resourceType,
      });

      const tombstone = await PrivateDocument.findById(document._id).lean();
      expect(tombstone.status).toBe(PRIVATE_DOCUMENT_STATUSES.DELETED);
      expect(tombstone.deletedAt).toBeInstanceOf(Date);
      expect(tombstone.deletedBy.toString()).toBe(owner._id.toString());
      expect(tombstone.storage.publicId).toBeNull();
      expect(tombstone.storage.resourceType).toBeNull();

      await request(app())
        .get("/api/v1/admin/private-documents")
        .set(authHeader(token))
        .expect(200)
        .expect((listResponse) => {
          expect(listResponse.body.meta.total).toBe(0);
        });

      await request(app())
        .get("/api/v1/admin/private-documents")
        .query({ status: PRIVATE_DOCUMENT_STATUSES.DELETED })
        .set(authHeader(token))
        .expect(200)
        .expect((listResponse) => {
          expect(listResponse.body.meta.total).toBe(1);
        });

      await request(app())
        .get(`/api/v1/admin/private-documents/${document._id}`)
        .set(authHeader(token))
        .expect(404);

      await request(app())
        .get(`/api/v1/admin/private-documents/${document._id}/access`)
        .set(authHeader(token))
        .expect(404);

      await request(app())
        .delete(`/api/v1/admin/private-documents/${document._id}`)
        .set(authHeader(token))
        .expect(404);

      expect(
        await AuditLog.countDocuments({
          action: AUDIT_ACTIONS.PRIVATE_DOCUMENT_DELETED,
        }),
      ).toBe(1);

      const failureDocument = await seedPrivateDocument({
        actor: owner,
        filename: "delete-failure.pdf",
      });
      cloudinaryMocks.deletePrivateDocumentFromCloudinary.mockRejectedValueOnce(
        new Error("provider deletion failed"),
      );

      const failureResponse = await request(app())
        .delete(`/api/v1/admin/private-documents/${failureDocument._id}`)
        .set(authHeader(token))
        .expect(500);

      expect(JSON.stringify(failureResponse.body)).not.toContain("provider deletion failed");
      const stillActive = await PrivateDocument.findById(failureDocument._id).lean();
      expect(stillActive.status).toBe(PRIVATE_DOCUMENT_STATUSES.ACTIVE);
      expect(stillActive.deletedAt).toBeNull();
      expect(
        await AuditLog.countDocuments({
          action: AUDIT_ACTIONS.PRIVATE_DOCUMENT_DELETED,
          entityId: failureDocument._id,
        }),
      ).toBe(0);
    });
  },
);