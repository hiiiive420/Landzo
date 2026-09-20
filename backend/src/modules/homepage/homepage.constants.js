export const HOMEPAGE_SINGLETON_KEY = "main";

export const HOMEPAGE_LIMITS = Object.freeze({
  heroEyebrow: 80,
  heroHeading: 160,
  heroHighlight: 100,
  heroDescription: 500,

  sectionHeading: 140,
  sectionDescription: 500,

  ctaLabel: 60,
  ctaLink: 500,

  benefitTitle: 100,
  benefitDescription: 300,
  benefitIconKey: 60,

  statLabel: 80,
  statValue: 40,

  metaTitle: 60,
  metaDescription: 160,

  imageAlt: 160,
});

export const HOMEPAGE_COLLECTION_LIMITS = Object.freeze({
  benefitsMin: 0,
  benefitsMax: 4,

  statsMin: 0,
  statsMax: 4,
});

export const HOMEPAGE_IMAGE_LIMITS = Object.freeze({
  maxBytes: 20 * 1024 * 1024,
  maxDimension: 2560,
});

export const HOMEPAGE_ALLOWED_IMAGE_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const HOMEPAGE_ALLOWED_IMAGE_FORMATS = Object.freeze([
  "jpg",
  "jpeg",
  "png",
  "webp",
]);

export const HOMEPAGE_MEDIA_FOLDERS = Object.freeze({
  hero: "landzo/homepage/hero",
  cta: "landzo/homepage/cta",
});

export const HOMEPAGE_DEFAULT_CONTENT = Object.freeze({
  hero: {
    eyebrow: "Find your place",
    heading: "Discover property across Sri Lanka",
    highlight: "",
    description:
      "Explore selected land, homes, apartments and commercial opportunities across Sri Lanka.",
    primaryCta: {
      label: "Explore Properties",
      link: "/properties",
    },
    secondaryCta: {
      label: "Explore Map",
      link: "/explore",
    },
  },

  featuredProperties: {
    heading: "Featured Properties",
    description:
      "Discover selected opportunities from across our property portfolio.",
  },

  exploreMap: {
    heading: "Explore Properties by Location",
    description:
      "Discover available properties across Sri Lanka through an interactive map.",
  },

  whyLandzo: {
    heading: "Why LANDZO",
    description:
      "A simpler way to discover and explore property opportunities.",
    benefits: [],
  },

  stats: {
    heading: "",
    items: [],
  },

  cta: {
    heading: "Looking for the right property?",
    description:
      "Explore available opportunities or get in touch with our team.",
    button: {
      label: "Contact Us",
      link: "/contact",
    },
  },

  seo: {
    metaTitle: "LANDZO | Property in Sri Lanka",
    metaDescription:
      "Discover land, houses, apartments and commercial properties across Sri Lanka with LANDZO.",
  },
});