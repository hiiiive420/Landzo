const emptyHomepage = {
  hero: {
    eyebrow: "",
    heading: "",
    highlight: "",
    description: "",
    primaryCta: {
      label: "",
      link: "",
    },
    secondaryCta: {
      label: "",
      link: "",
    },
    image: null,
  },

  featuredProperties: {
    heading: "",
    description: "",
  },

  exploreMap: {
    heading: "",
    description: "",
  },

  whyLandzo: {
    heading: "",
    description: "",
    benefits: [],
  },

  stats: {
    heading: "",
    items: [],
  },

  cta: {
    heading: "",
    description: "",
    button: {
      label: "",
      link: "",
    },
    image: null,
  },

  seo: {
    metaTitle: "",
    metaDescription: "",
  },
};

const cloneEmptyHomepage = () =>
  structuredClone(emptyHomepage);

const normalizeCta = (cta) => ({
  label: cta?.label ?? "",
  link: cta?.link ?? "",
});

export const homepageFormStateFromApi = (
  homepage,
) => {
  if (!homepage) {
    return cloneEmptyHomepage();
  }

  return {
    hero: {
      eyebrow: homepage.hero?.eyebrow ?? "",
      heading: homepage.hero?.heading ?? "",
      highlight: homepage.hero?.highlight ?? "",
      description:
        homepage.hero?.description ?? "",

      primaryCta: normalizeCta(
        homepage.hero?.primaryCta,
      ),

      secondaryCta: normalizeCta(
        homepage.hero?.secondaryCta,
      ),

      image: homepage.hero?.image ?? null,
    },

    featuredProperties: {
      heading:
        homepage.featuredProperties?.heading ??
        "",

      description:
        homepage.featuredProperties
          ?.description ?? "",
    },

    exploreMap: {
      heading:
        homepage.exploreMap?.heading ?? "",

      description:
        homepage.exploreMap?.description ??
        "",
    },

    whyLandzo: {
      heading:
        homepage.whyLandzo?.heading ?? "",

      description:
        homepage.whyLandzo?.description ?? "",

      benefits: (
        homepage.whyLandzo?.benefits ?? []
      ).map((benefit) => ({
        id: benefit.id ?? null,
        title: benefit.title ?? "",
        description:
          benefit.description ?? "",
        iconKey: benefit.iconKey ?? "",
      })),
    },

    stats: {
      heading:
        homepage.stats?.heading ?? "",

      items: (
        homepage.stats?.items ?? []
      ).map((item) => ({
        id: item.id ?? null,
        value: item.value ?? "",
        label: item.label ?? "",
      })),
    },

    cta: {
      heading:
        homepage.cta?.heading ?? "",

      description:
        homepage.cta?.description ?? "",

      button: normalizeCta(
        homepage.cta?.button,
      ),

      image: homepage.cta?.image ?? null,
    },

    seo: {
      metaTitle:
        homepage.seo?.metaTitle ?? "",

      metaDescription:
        homepage.seo?.metaDescription ?? "",
    },
  };
};

const trim = (value) =>
  typeof value === "string"
    ? value.trim()
    : value;

export const toHomepagePayload = (
  formState,
) => ({
  hero: {
    eyebrow: trim(formState.hero.eyebrow),
    heading: trim(formState.hero.heading),
    highlight: trim(
      formState.hero.highlight,
    ),
    description: trim(
      formState.hero.description,
    ),

    primaryCta: {
      label: trim(
        formState.hero.primaryCta.label,
      ),
      link: trim(
        formState.hero.primaryCta.link,
      ),
    },

    secondaryCta: {
      label: trim(
        formState.hero.secondaryCta.label,
      ),
      link: trim(
        formState.hero.secondaryCta.link,
      ),
    },
  },

  featuredProperties: {
    heading: trim(
      formState.featuredProperties.heading,
    ),

    description: trim(
      formState.featuredProperties
        .description,
    ),
  },

  exploreMap: {
    heading: trim(
      formState.exploreMap.heading,
    ),

    description: trim(
      formState.exploreMap.description,
    ),
  },

  whyLandzo: {
    heading: trim(
      formState.whyLandzo.heading,
    ),

    description: trim(
      formState.whyLandzo.description,
    ),

    benefits: formState.whyLandzo.benefits.map(
      (benefit) => ({
        title: trim(benefit.title),
        description: trim(
          benefit.description,
        ),
        iconKey: trim(
          benefit.iconKey,
        ),
      }),
    ),
  },

  stats: {
    heading: trim(
      formState.stats.heading,
    ),

    items: formState.stats.items.map(
      (item) => ({
        value: trim(item.value),
        label: trim(item.label),
      }),
    ),
  },

  cta: {
    heading: trim(
      formState.cta.heading,
    ),

    description: trim(
      formState.cta.description,
    ),

    button: {
      label: trim(
        formState.cta.button.label,
      ),
      link: trim(
        formState.cta.button.link,
      ),
    },
  },

  seo: {
    metaTitle: trim(
      formState.seo.metaTitle,
    ),

    metaDescription: trim(
      formState.seo.metaDescription,
    ),
  },
});