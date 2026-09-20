import { AppError } from "../../common/errors/AppError.js";

import {
  AUDIT_ACTION_VALUES,
  AUDIT_ENTITY_TYPE_VALUES,
  AUDIT_LIMITS,
} from "./audit.constants.js";

import { AuditLog } from "./auditLog.model.js";

const allowedActions = new Set(
  AUDIT_ACTION_VALUES,
);

const allowedEntityTypes = new Set(
  AUDIT_ENTITY_TYPE_VALUES,
);

const normalizeEntityLabel = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(
      0,
      AUDIT_LIMITS.entityLabelMaxLength,
    );
};

export const recordAuditLog = async ({
  actorUserId,
  action,
  entityType,
  entityId = null,
  entityLabel = "",
}) => {
  if (!actorUserId) {
    throw new AppError(
      500,
      "Audit actor is required",
      "AUDIT_ACTOR_REQUIRED",
    );
  }

  if (!allowedActions.has(action)) {
    throw new AppError(
      500,
      "Invalid audit action",
      "AUDIT_ACTION_INVALID",
    );
  }

  if (
    !allowedEntityTypes.has(entityType)
  ) {
    throw new AppError(
      500,
      "Invalid audit entity type",
      "AUDIT_ENTITY_TYPE_INVALID",
    );
  }

  const auditLog = await AuditLog.create({
    actor: actorUserId,
    action,
    entityType,
    entityId: entityId ?? null,
    entityLabel:
      normalizeEntityLabel(
        entityLabel,
      ),
  });

  return auditLog;
};