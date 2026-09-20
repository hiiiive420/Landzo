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
      typeof user === "object" && typeof user.fullName === "string" ? user.fullName : "",
  };
};

export const serializeSettings = (settings) => ({
  business: {
    name: settings.business?.name ?? "",
    email: settings.business?.email ?? "",
    phone: settings.business?.phone ?? "",
    whatsapp: settings.business?.whatsapp ?? "",
    address: settings.business?.address ?? "",
  },
  social: {
    facebook: settings.social?.facebook ?? "",
    instagram: settings.social?.instagram ?? "",
    linkedin: settings.social?.linkedin ?? "",
    youtube: settings.social?.youtube ?? "",
  },
  website: {
    defaultMetaTitle: settings.website?.defaultMetaTitle ?? "",
    defaultMetaDescription: settings.website?.defaultMetaDescription ?? "",
  },
  updatedBy: serializeStaffReference(settings.updatedBy),
  updatedAt: settings.updatedAt?.toISOString?.() ?? settings.updatedAt ?? null,
});
export const serializePublicContactSettings = (settings) => ({
  business: {
    name: settings.business?.name ?? "",
    email: settings.business?.email ?? "",
    phone: settings.business?.phone ?? "",
    whatsapp: settings.business?.whatsapp ?? "",
    address: settings.business?.address ?? "",
  },
  social: {
    facebook: settings.social?.facebook ?? "",
    instagram: settings.social?.instagram ?? "",
    linkedin: settings.social?.linkedin ?? "",
    youtube: settings.social?.youtube ?? "",
  },
});