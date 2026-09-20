const toIdString = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "object" && ("_id" in value || "id" in value)) {
    const nestedId = value._id ?? value.id;

    return nestedId?.toString?.() ?? null;
  }

  return value.toString?.() ?? null;
};

const serializeStaffReference = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: toIdString(user),

    fullName:
      typeof user === "object" && typeof user.fullName === "string"
        ? user.fullName
        : "",
  };
};

const serializeSafeFileMetadata = (storage) => {
  if (!storage) {
    return null;
  }

  return {
    originalFilename: storage.originalFilename ?? "",

    mimeType: storage.mimeType ?? "",

    format: storage.format ?? null,

    bytes: typeof storage.bytes === "number" ? storage.bytes : null,
  };
};

export const serializePrivateDocument = (document) => ({
  id: toIdString(document),

  title: document.title ?? "",

  description: document.description ?? "",

  category: document.category,

  entityId: toIdString(document.entityId),

  file: serializeSafeFileMetadata(document.storage),

  status: document.status,

  createdBy: serializeStaffReference(document.createdBy),

  updatedBy: serializeStaffReference(document.updatedBy),

  deletedBy: serializeStaffReference(document.deletedBy),

  deletedAt: document.deletedAt?.toISOString?.() ?? document.deletedAt ?? null,

  createdAt: document.createdAt?.toISOString?.() ?? document.createdAt ?? null,

  updatedAt: document.updatedAt?.toISOString?.() ?? document.updatedAt ?? null,
});

export const serializePrivateDocumentList = (result) => ({
  data: (result.items ?? []).map(serializePrivateDocument),

  meta: {
    page: result.page ?? 1,

    limit: result.limit ?? 20,

    total: result.total ?? 0,

    totalPages: result.totalPages ?? 0,
  },
});