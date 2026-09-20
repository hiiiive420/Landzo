import {
  AUDIT_LIMITS,
} from "./audit.constants.js";

import { AuditLog } from "./auditLog.model.js";

const escapeRegex = (value) =>
  value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

const getNextUtcDay = (dateValue) => {
  const date = new Date(
    `${dateValue}T00:00:00.000Z`,
  );

  date.setUTCDate(
    date.getUTCDate() + 1,
  );

  return date;
};

const buildCreatedAtFilter = ({
  startDate,
  endDate,
}) => {
  if (!startDate && !endDate) {
    return null;
  }

  const createdAt = {};

  if (startDate) {
    createdAt.$gte = new Date(
      `${startDate}T00:00:00.000Z`,
    );
  }

  if (endDate) {
    createdAt.$lt =
      getNextUtcDay(endDate);
  }

  return createdAt;
};

const buildAuditLogFilter = ({
  search,
  actorId,
  action,
  entityType,
  entityId,
  startDate,
  endDate,
}) => {
  const filter = {};

  if (actorId) {
    filter.actor = actorId;
  }

  if (action) {
    filter.action = action;
  }

  if (entityType) {
    filter.entityType =
      entityType;
  }

  if (entityId) {
    filter.entityId = entityId;
  }

  if (search) {
    filter.entityLabel = {
      $regex: escapeRegex(
        search.trim(),
      ),
      $options: "i",
    };
  }

  const createdAt =
    buildCreatedAtFilter({
      startDate,
      endDate,
    });

  if (createdAt) {
    filter.createdAt = createdAt;
  }

  return filter;
};

export const listAuditLogs = async ({
  page = AUDIT_LIMITS.defaultPage,
  limit = AUDIT_LIMITS.defaultLimit,
  search,
  actorId,
  action,
  entityType,
  entityId,
  startDate,
  endDate,
} = {}) => {
  const filter =
    buildAuditLogFilter({
      search,
      actorId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
    });

  const skip =
    (page - 1) * limit;

  const [items, total] =
    await Promise.all([
      AuditLog.find(filter)
        .select(
          [
            "actor",
            "action",
            "entityType",
            "entityId",
            "entityLabel",
            "createdAt",
          ].join(" "),
        )
        .populate({
          path: "actor",
          select: "_id fullName",
        })
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .exec(),

      AuditLog.countDocuments(
        filter,
      ),
    ]);

  return {
    items,
    page,
    limit,
    total,

    totalPages:
      total === 0
        ? 0
        : Math.ceil(
            total / limit,
          ),
  };
};