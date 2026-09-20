const toIdString = (value) => {
  if (!value) {
    return null;
  }

  if (
    typeof value === "object" &&
    ("_id" in value || "id" in value)
  ) {
    const nestedId =
      value._id ?? value.id;

    return (
      nestedId?.toString?.() ??
      null
    );
  }

  return value.toString?.() ?? null;
};

const serializeAuditActor = (actor) => {
  if (!actor) {
    return null;
  }

  return {
    id: toIdString(actor),

    fullName:
      typeof actor === "object" &&
      typeof actor.fullName === "string"
        ? actor.fullName
        : "",
  };
};

export const serializeAuditLog = (
  auditLog,
) => ({
  id: toIdString(auditLog),

  actor:
    serializeAuditActor(
      auditLog.actor,
    ),

  action:
    auditLog.action,

  entityType:
    auditLog.entityType,

  entityId:
    toIdString(
      auditLog.entityId,
    ),

  entityLabel:
    auditLog.entityLabel ?? "",

  createdAt:
    auditLog.createdAt
      ?.toISOString?.() ??
    auditLog.createdAt ??
    null,
});

export const serializeAuditLogList = (
  result,
) => ({
  data: (
    result.items ?? []
  ).map(serializeAuditLog),

  meta: {
    page:
      result.page ?? 1,

    limit:
      result.limit ?? 30,

    total:
      result.total ?? 0,

    totalPages:
      result.totalPages ?? 0,
  },
});