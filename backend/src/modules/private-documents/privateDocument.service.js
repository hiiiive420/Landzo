import mongoose from "mongoose";

import { AppError } from "../../common/errors/AppError.js";

import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit/audit.constants.js";
import { recordAuditLog } from "../audit/audit.service.js";
import { Customer } from "../customers/customer.model.js";
import { Enquiry } from "../enquiries/enquiry.model.js";
import { Property } from "../properties/property.model.js";
import { SiteVisit } from "../site-visits/siteVisit.model.js";

import {
  PRIVATE_DOCUMENT_CATEGORIES,
  PRIVATE_DOCUMENT_ERROR_CODES,
  PRIVATE_DOCUMENT_LIMITS,
  PRIVATE_DOCUMENT_STATUSES,
} from "./privateDocument.constants.js";
import { PrivateDocument } from "./privateDocument.model.js";
import {
  createPrivateDocumentAccessUrl,
  deletePrivateDocumentFromCloudinary,
  uploadPrivateDocumentToCloudinary,
} from "./privateDocumentStorage.cloudinary.js";

const STAFF_POPULATE = {
  select: "_id fullName",
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const privateDocumentNotFound = () =>
  new AppError(404, "Private document not found", "PRIVATE_DOCUMENT_NOT_FOUND");

const linkedEntityNotFound = (category) =>
  new AppError(404, "Linked entity not found", "PRIVATE_DOCUMENT_LINKED_ENTITY_NOT_FOUND", {
    category,
  });

const privateDocumentFileRequired = () =>
  new AppError(
    400,
    "Private document file is required",
    PRIVATE_DOCUMENT_ERROR_CODES.FILE_REQUIRED,
  );

const privateDocumentStorageUnavailable = () =>
  new AppError(
    409,
    "Private document storage metadata is unavailable",
    "PRIVATE_DOCUMENT_STORAGE_UNAVAILABLE",
  );

const populateStaffReferences = (query) =>
  query
    .populate({
      path: "createdBy",
      ...STAFF_POPULATE,
    })
    .populate({
      path: "updatedBy",
      ...STAFF_POPULATE,
    })
    .populate({
      path: "deletedBy",
      ...STAFF_POPULATE,
    });

const recordPrivateDocumentAudit = async ({ actorUserId, action, document }) => {
  try {
    await recordAuditLog({
      actorUserId,
      action,
      entityType: AUDIT_ENTITY_TYPES.PRIVATE_DOCUMENT,
      entityId: document._id,
      entityLabel: "Private Document",
    });
  } catch (error) {
    console.error("Private document audit write failed", {
      action,
      entityType: AUDIT_ENTITY_TYPES.PRIVATE_DOCUMENT,
      errorCode: error?.code || "AUDIT_WRITE_FAILED",
    });
  }
};

const assertActiveStorage = (document) => {
  if (!document.storage?.publicId || !document.storage?.resourceType || !document.storage?.format) {
    throw privateDocumentStorageUnavailable();
  }

  return {
    publicId: document.storage.publicId,
    resourceType: document.storage.resourceType,
    format: document.storage.format,
  };
};

const toStoragePayload = (uploaded) => ({
  publicId: uploaded.publicId,
  resourceType: uploaded.resourceType,
  format: uploaded.format,
  bytes: uploaded.bytes,
  mimeType: uploaded.mimeType,
  originalFilename: uploaded.originalFilename,
});

export const validatePrivateDocumentLink = async ({ category, entityId = null }) => {
  if (category === PRIVATE_DOCUMENT_CATEGORIES.GENERAL) {
    return null;
  }

  let exists;

  switch (category) {
    case PRIVATE_DOCUMENT_CATEGORIES.PROPERTY:
      exists = Boolean(
        await Property.exists({
          _id: entityId,
          deletedAt: null,
        }),
      );
      break;

    case PRIVATE_DOCUMENT_CATEGORIES.CUSTOMER:
      exists = Boolean(
        await Customer.exists({
          _id: entityId,
        }),
      );
      break;

    case PRIVATE_DOCUMENT_CATEGORIES.ENQUIRY:
      exists = Boolean(
        await Enquiry.exists({
          _id: entityId,
        }),
      );
      break;

    case PRIVATE_DOCUMENT_CATEGORIES.SITE_VISIT:
      exists = Boolean(
        await SiteVisit.exists({
          _id: entityId,
        }),
      );
      break;

    default:
      exists = false;
  }

  if (!exists) {
    throw linkedEntityNotFound(category);
  }

  return entityId;
};

export const listPrivateDocuments = async ({
  page = PRIVATE_DOCUMENT_LIMITS.defaultPage,
  limit = PRIVATE_DOCUMENT_LIMITS.defaultLimit,
  search,
  category,
  entityId,
  status,
} = {}) => {
  const filter = {
    status: status ?? PRIVATE_DOCUMENT_STATUSES.ACTIVE,
  };

  if (category) {
    filter.category = category;
  }

  if (entityId) {
    filter.entityId = entityId;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");

    filter.$or = [
      {
        title: regex,
      },
      {
        "storage.originalFilename": regex,
      },
    ];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    populateStaffReferences(
      PrivateDocument.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
    ).exec(),
    PrivateDocument.countDocuments(filter),
  ]);

  return {
    items,
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
};

export const getPrivateDocument = async (documentId, { includeDeleted = false } = {}) => {
  const filter = {
    _id: documentId,
  };

  if (!includeDeleted) {
    filter.status = PRIVATE_DOCUMENT_STATUSES.ACTIVE;
  }

  const document = await populateStaffReferences(PrivateDocument.findOne(filter)).exec();

  if (!document) {
    throw privateDocumentNotFound();
  }

  return document;
};

export const getPrivateDocumentInternal = async (documentId, { includeDeleted = false } = {}) => {
  const filter = {
    _id: documentId,
  };

  if (!includeDeleted) {
    filter.status = PRIVATE_DOCUMENT_STATUSES.ACTIVE;
  }

  const document = await PrivateDocument.findOne(filter);

  if (!document) {
    throw privateDocumentNotFound();
  }

  return document;
};

export const createPrivateDocument = async ({ env, actorUserId, input, file }) => {
  if (!file) {
    throw privateDocumentFileRequired();
  }

  await validatePrivateDocumentLink({
    category: input.category,
    entityId: input.entityId ?? null,
  });

  const documentId = new mongoose.Types.ObjectId();
  const folder = `landzo/private-documents/${documentId.toString()}`;
  const uploaded = await uploadPrivateDocumentToCloudinary({ env, file, folder });

  try {
    const document = await PrivateDocument.create({
      _id: documentId,
      title: input.title,
      description: input.description ?? "",
      category: input.category,
      entityId: input.entityId ?? null,
      storage: toStoragePayload(uploaded),
      status: PRIVATE_DOCUMENT_STATUSES.ACTIVE,
      createdBy: actorUserId,
      updatedBy: null,
    });

    await recordPrivateDocumentAudit({
      actorUserId,
      action: AUDIT_ACTIONS.PRIVATE_DOCUMENT_UPLOADED,
      document,
    });

    return document;
  } catch (error) {
    try {
      await deletePrivateDocumentFromCloudinary({
        env,
        publicId: uploaded.publicId,
        resourceType: uploaded.resourceType,
      });
    } catch (cleanupError) {
      console.error("Private document upload compensation failed", {
        errorCode: cleanupError?.code || "PRIVATE_DOCUMENT_CLEANUP_FAILED",
      });
    }

    throw error;
  }
};

export const createPrivateDocumentAccess = async ({
  env,
  actorUserId,
  documentId,
  attachment = false,
}) => {
  const document = await getPrivateDocumentInternal(documentId);
  const storage = assertActiveStorage(document);

  const url = createPrivateDocumentAccessUrl({
    env,
    publicId: storage.publicId,
    resourceType: storage.resourceType,
    format: storage.format,
    attachment,
    expiresInSeconds: PRIVATE_DOCUMENT_LIMITS.accessUrlExpiresInSeconds,
  });

  await recordPrivateDocumentAudit({
    actorUserId,
    action: AUDIT_ACTIONS.PRIVATE_DOCUMENT_VIEWED,
    document,
  });

  return {
    url,
    expiresInSeconds: PRIVATE_DOCUMENT_LIMITS.accessUrlExpiresInSeconds,
  };
};

export const updatePrivateDocumentMetadata = async ({ actorUserId, documentId, input }) => {
  const document = await getPrivateDocumentInternal(documentId);

  if (Object.hasOwn(input, "title")) {
    document.title = input.title;
  }

  if (Object.hasOwn(input, "description")) {
    document.description = input.description ?? "";
  }

  const hasMeaningfulChanges = document.modifiedPaths().some((path) => path !== "updatedBy");

  if (hasMeaningfulChanges) {
    document.updatedBy = actorUserId;
    await document.save();

    await recordPrivateDocumentAudit({
      actorUserId,
      action: AUDIT_ACTIONS.PRIVATE_DOCUMENT_UPDATED,
      document,
    });
  }

  return document;
};
export const replacePrivateDocumentFile = async ({ env, actorUserId, documentId, file }) => {
  if (!file) {
    throw privateDocumentFileRequired();
  }

  const document = await getPrivateDocumentInternal(documentId);
  const previousStorage = assertActiveStorage(document);
  const folder = `landzo/private-documents/${document._id.toString()}`;
  const uploaded = await uploadPrivateDocumentToCloudinary({ env, file, folder });

  try {
    document.storage = toStoragePayload(uploaded);
    document.updatedBy = actorUserId;
    await document.save();
  } catch (error) {
    try {
      await deletePrivateDocumentFromCloudinary({
        env,
        publicId: uploaded.publicId,
        resourceType: uploaded.resourceType,
      });
    } catch (cleanupError) {
      console.error("Private document replacement compensation failed", {
        errorCode: cleanupError?.code || "PRIVATE_DOCUMENT_CLEANUP_FAILED",
      });
    }

    throw error;
  }

  try {
    await deletePrivateDocumentFromCloudinary({
      env,
      publicId: previousStorage.publicId,
      resourceType: previousStorage.resourceType,
    });
  } catch (cleanupError) {
    console.error("Private document replaced file cleanup failed", {
      errorCode: cleanupError?.code || "PRIVATE_DOCUMENT_OLD_FILE_CLEANUP_FAILED",
    });
  }

  await recordPrivateDocumentAudit({
    actorUserId,
    action: AUDIT_ACTIONS.PRIVATE_DOCUMENT_REPLACED,
    document,
  });

  return document;
};

export const deletePrivateDocument = async ({ env, actorUserId, documentId }) => {
  const document = await getPrivateDocumentInternal(documentId);
  const storage = assertActiveStorage(document);

  await deletePrivateDocumentFromCloudinary({
    env,
    publicId: storage.publicId,
    resourceType: storage.resourceType,
  });

  document.status = PRIVATE_DOCUMENT_STATUSES.DELETED;
  document.deletedAt = new Date();
  document.deletedBy = actorUserId;
  document.updatedBy = actorUserId;
  document.storage.publicId = null;
  document.storage.resourceType = null;

  await document.save();

  await recordPrivateDocumentAudit({
    actorUserId,
    action: AUDIT_ACTIONS.PRIVATE_DOCUMENT_DELETED,
    document,
  });

  return document;
};