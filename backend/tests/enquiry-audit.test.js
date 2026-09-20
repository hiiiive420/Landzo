import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../src/modules/audit/audit.constants.js";
import { AuditLog } from "../src/modules/audit/auditLog.model.js";
import { STAFF_ROLES, STAFF_STATUSES } from "../src/modules/auth/auth.constants.js";
import { hashPassword } from "../src/modules/auth/auth.service.js";
import { ENQUIRY_STATUSES } from "../src/modules/enquiries/enquiry.constants.js";
import { Enquiry } from "../src/modules/enquiries/enquiry.model.js";
import { assignEnquiry, closeEnquiry, updateEnquiry } from "../src/modules/enquiries/enquiry.service.js";
import { Notification } from "../src/modules/notifications/notification.model.js";
import { Role } from "../src/modules/roles-permissions/role.model.js";
import { User } from "../src/modules/users/user.model.js";
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
  resetTestDatabase,
} from "./helpers/testDatabase.js";

const password = "Password12345!";

const createStaffUser = async ({
  email = "staff@example.com",
  role = STAFF_ROLES.ADMIN,
  status = STAFF_STATUSES.ACTIVE,
} = {}) =>
  User.create({
    fullName: "Audit Staff",
    email,
    role,
    status,
    passwordHash: await hashPassword(password),
  });

const createEnquiry = (overrides = {}) =>
  Enquiry.create({
    fullName: "Nimal Perera",
    email: "nimal@example.com",
    phone: "+94770000000",
    message: "Interested in the property",
    source: "admin",
    status: ENQUIRY_STATUSES.NEW,
    ...overrides,
  });

const expectSafeAudit = (auditLog) => {
  expect(auditLog.entityType).toBe(AUDIT_ENTITY_TYPES.ENQUIRY);
  expect(auditLog.entityLabel).toBe("Enquiry");

  const serialized = JSON.stringify(auditLog).toLowerCase();
  expect(serialized).not.toContain("nimal");
  expect(serialized).not.toContain("nimal@example.com");
  expect(serialized).not.toContain("+94770000000");
  expect(serialized).not.toContain("interested in the property");
};

describe("enquiry audit integration", () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await resetTestDatabase();
    await User.init();
    await Role.init();
    await Enquiry.init();
    await AuditLog.init();
    await Notification.init();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await disconnectTestDatabase();
  });

  it("records safe audit logs for meaningful enquiry updates only", async () => {
    const actor = await createStaffUser({ email: "actor@example.com" });
    const enquiry = await createEnquiry();

    await updateEnquiry({
      enquiryId: enquiry._id,
      actorUserId: actor._id,
      payload: { message: "Updated internal-safe message" },
    });

    const auditLog = await AuditLog.findOne({
      action: AUDIT_ACTIONS.ENQUIRY_UPDATED,
    }).lean();

    expect(auditLog).toMatchObject({
      actor: actor._id,
      entityId: enquiry._id,
    });
    expectSafeAudit(auditLog);

    await updateEnquiry({
      enquiryId: enquiry._id,
      actorUserId: actor._id,
      payload: { message: "Updated internal-safe message" },
    });

    expect(await AuditLog.countDocuments({ action: AUDIT_ACTIONS.ENQUIRY_UPDATED })).toBe(1);
  });

  it("records safe assignment audit logs only when assignee changes", async () => {
    const actor = await createStaffUser({ email: "actor@example.com" });
    const assignee = await createStaffUser({ email: "assignee@example.com" });
    const enquiry = await createEnquiry();

    await assignEnquiry({
      enquiryId: enquiry._id,
      actorUserId: actor._id,
      assignedTo: assignee._id,
    });

    const auditLog = await AuditLog.findOne({
      action: AUDIT_ACTIONS.ENQUIRY_ASSIGNED,
    }).lean();

    expect(auditLog).toMatchObject({
      actor: actor._id,
      entityId: enquiry._id,
    });
    expectSafeAudit(auditLog);

    await assignEnquiry({
      enquiryId: enquiry._id,
      actorUserId: actor._id,
      assignedTo: assignee._id,
    });

    expect(await AuditLog.countDocuments({ action: AUDIT_ACTIONS.ENQUIRY_ASSIGNED })).toBe(1);
  });

  it("records safe close audit logs and skips already-closed no-ops", async () => {
    const actor = await createStaffUser({ email: "actor@example.com" });
    const enquiry = await createEnquiry({ status: ENQUIRY_STATUSES.IN_PROGRESS });

    await closeEnquiry({
      enquiryId: enquiry._id,
      actorUserId: actor._id,
    });

    const auditLog = await AuditLog.findOne({
      action: AUDIT_ACTIONS.ENQUIRY_CLOSED,
    }).lean();

    expect(auditLog).toMatchObject({
      actor: actor._id,
      entityId: enquiry._id,
    });
    expectSafeAudit(auditLog);

    await closeEnquiry({
      enquiryId: enquiry._id,
      actorUserId: actor._id,
    });

    expect(await AuditLog.countDocuments({ action: AUDIT_ACTIONS.ENQUIRY_CLOSED })).toBe(1);
  });
});