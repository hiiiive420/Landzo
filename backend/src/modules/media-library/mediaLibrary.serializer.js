const serializeTimestamp = (timestamp) => timestamp?.toISOString?.() ?? timestamp ?? null;

const serializeMediaOwner = (owner = {}) => ({
  id: owner.id ?? null,
  label: owner.label ?? "",
  secondaryLabel: owner.secondaryLabel ?? null,
  adminPath: owner.adminPath ?? null,
});

export const serializeMediaLibraryItem = (item = {}) => ({
  id: item.id,
  source: item.source,
  role: item.role,
  url: item.url,
  alt: item.alt ?? "",
  width: item.width ?? null,
  height: item.height ?? null,
  format: item.format ?? null,
  bytes: item.bytes ?? null,
  owner: serializeMediaOwner(item.owner),
  timestamp: serializeTimestamp(item.timestamp),
});

export const serializeMediaLibraryResult = (result = {}) => {
  const meta = result.meta ?? {};

  return {
    items: (result.data ?? []).map(serializeMediaLibraryItem),
    page: meta.page ?? 1,
    limit: meta.limit ?? 0,
    total: meta.total ?? 0,
    totalPages: meta.totalPages ?? 0,
  };
};
