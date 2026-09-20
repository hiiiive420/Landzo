const serializeImage = (image, { includePrivateFields = false } = {}) => {
  if (!image?.secureUrl) {
    return null;
  }

  const serialized = {
    url: image.secureUrl,
    alt: image.alt || "",
    width: image.width ?? null,
    height: image.height ?? null,
    format: image.format ?? null,
    bytes: image.bytes ?? null,
  };

  if (includePrivateFields) {
    serialized.publicId = image.publicId ?? null;
    serialized.secureUrl = image.secureUrl;
  }

  return serialized;
};

const serializeCta = (cta) => ({
  label: cta?.label || "",
  link: cta?.link || "",
});

const serializeBenefits = (benefits = []) =>
  benefits.map((benefit) => ({
    id: benefit._id?.toString?.() ?? null,
    title: benefit.title,
    description: benefit.description,
    iconKey: benefit.iconKey || "",
  }));

const serializeStats = (items = []) =>
  items.map((item) => ({
    id: item._id?.toString?.() ?? null,
    value: item.value,
    label: item.label,
  }));

const serializeHomepageContent = (
  homepage,
  { includePrivateImageFields = false } = {},
) => ({
  hero: {
    eyebrow: homepage.hero?.eyebrow || "",
    heading: homepage.hero?.heading || "",
    highlight: homepage.hero?.highlight || "",
    description: homepage.hero?.description || "",

    primaryCta: serializeCta(homepage.hero?.primaryCta),
    secondaryCta: serializeCta(homepage.hero?.secondaryCta),

    image: serializeImage(homepage.hero?.image, {
      includePrivateFields: includePrivateImageFields,
    }),
  },

  featuredProperties: {
    heading: homepage.featuredProperties?.heading || "",
    description: homepage.featuredProperties?.description || "",
  },

  exploreMap: {
    heading: homepage.exploreMap?.heading || "",
    description: homepage.exploreMap?.description || "",
  },

  whyLandzo: {
    heading: homepage.whyLandzo?.heading || "",
    description: homepage.whyLandzo?.description || "",
    benefits: serializeBenefits(homepage.whyLandzo?.benefits),
  },

  stats: {
    heading: homepage.stats?.heading || "",
    items: serializeStats(homepage.stats?.items),
  },

  cta: {
    heading: homepage.cta?.heading || "",
    description: homepage.cta?.description || "",
    button: serializeCta(homepage.cta?.button),

    image: serializeImage(homepage.cta?.image, {
      includePrivateFields: includePrivateImageFields,
    }),
  },

  seo: {
    metaTitle: homepage.seo?.metaTitle || "",
    metaDescription: homepage.seo?.metaDescription || "",
  },
});

export const serializeAdminHomepage = (homepage) => ({
  id: homepage._id?.toString?.() ?? null,

  ...serializeHomepageContent(homepage, {
    includePrivateImageFields: true,
  }),

  createdBy: homepage.createdBy?.toString?.() ?? null,
  updatedBy: homepage.updatedBy?.toString?.() ?? null,

  createdAt: homepage.createdAt ?? null,
  updatedAt: homepage.updatedAt ?? null,
});

export const serializePublicHomepage = (homepage) =>
  serializeHomepageContent(homepage);