import {
  HOMEPAGE_DEFAULT_CONTENT,
  HOMEPAGE_SINGLETON_KEY,
} from "./homepage.constants.js";
import { Homepage } from "./homepage.model.js";

const cloneDefaultContent = () =>
  structuredClone(HOMEPAGE_DEFAULT_CONTENT);

const findHomepage = () =>
  Homepage.findOne({
    singletonKey: HOMEPAGE_SINGLETON_KEY,
  });

export const getOrCreateHomepage = async ({ userId = null } = {}) => {
  const existingHomepage = await findHomepage();

  if (existingHomepage) {
    return existingHomepage;
  }

  try {
    return await Homepage.create({
      singletonKey: HOMEPAGE_SINGLETON_KEY,
      ...cloneDefaultContent(),
      createdBy: userId,
      updatedBy: userId,
    });
  } catch (error) {
    /*
     * The singletonKey unique index protects against two concurrent
     * requests creating the homepage at exactly the same time.
     */
    if (error?.code === 11000) {
      const homepage = await findHomepage();

      if (homepage) {
        return homepage;
      }
    }

    throw error;
  }
};

const updateHero = (homepage, hero) => {
  if (!hero) {
    return;
  }

  if (hero.eyebrow !== undefined) {
    homepage.set("hero.eyebrow", hero.eyebrow);
  }

  if (hero.heading !== undefined) {
    homepage.set("hero.heading", hero.heading);
  }

  if (hero.highlight !== undefined) {
    homepage.set("hero.highlight", hero.highlight);
  }

  if (hero.description !== undefined) {
    homepage.set("hero.description", hero.description);
  }

  if (hero.primaryCta) {
    if (hero.primaryCta.label !== undefined) {
      homepage.set(
        "hero.primaryCta.label",
        hero.primaryCta.label,
      );
    }

    if (hero.primaryCta.link !== undefined) {
      homepage.set(
        "hero.primaryCta.link",
        hero.primaryCta.link,
      );
    }
  }

  if (hero.secondaryCta) {
    if (hero.secondaryCta.label !== undefined) {
      homepage.set(
        "hero.secondaryCta.label",
        hero.secondaryCta.label,
      );
    }

    if (hero.secondaryCta.link !== undefined) {
      homepage.set(
        "hero.secondaryCta.link",
        hero.secondaryCta.link,
      );
    }
  }
};

const updateSectionIntro = (
  homepage,
  sectionName,
  section,
) => {
  if (!section) {
    return;
  }

  if (section.heading !== undefined) {
    homepage.set(
      `${sectionName}.heading`,
      section.heading,
    );
  }

  if (section.description !== undefined) {
    homepage.set(
      `${sectionName}.description`,
      section.description,
    );
  }
};

const updateWhyLandzo = (homepage, whyLandzo) => {
  if (!whyLandzo) {
    return;
  }

  if (whyLandzo.heading !== undefined) {
    homepage.set(
      "whyLandzo.heading",
      whyLandzo.heading,
    );
  }

  if (whyLandzo.description !== undefined) {
    homepage.set(
      "whyLandzo.description",
      whyLandzo.description,
    );
  }

  if (whyLandzo.benefits !== undefined) {
    homepage.set(
      "whyLandzo.benefits",
      whyLandzo.benefits,
    );
  }
};

const updateStats = (homepage, stats) => {
  if (!stats) {
    return;
  }

  if (stats.heading !== undefined) {
    homepage.set(
      "stats.heading",
      stats.heading,
    );
  }

  if (stats.items !== undefined) {
    homepage.set(
      "stats.items",
      stats.items,
    );
  }
};

const updateCta = (homepage, cta) => {
  if (!cta) {
    return;
  }

  if (cta.heading !== undefined) {
    homepage.set(
      "cta.heading",
      cta.heading,
    );
  }

  if (cta.description !== undefined) {
    homepage.set(
      "cta.description",
      cta.description,
    );
  }

  if (cta.button) {
    if (cta.button.label !== undefined) {
      homepage.set(
        "cta.button.label",
        cta.button.label,
      );
    }

    if (cta.button.link !== undefined) {
      homepage.set(
        "cta.button.link",
        cta.button.link,
      );
    }
  }
};

const updateSeo = (homepage, seo) => {
  if (!seo) {
    return;
  }

  if (seo.metaTitle !== undefined) {
    homepage.set(
      "seo.metaTitle",
      seo.metaTitle,
    );
  }

  if (seo.metaDescription !== undefined) {
    homepage.set(
      "seo.metaDescription",
      seo.metaDescription,
    );
  }
};

export const updateHomepage = async ({
  input,
  userId,
}) => {
  const homepage = await getOrCreateHomepage({
    userId,
  });

  updateHero(homepage, input.hero);

  updateSectionIntro(
    homepage,
    "featuredProperties",
    input.featuredProperties,
  );

  updateSectionIntro(
    homepage,
    "exploreMap",
    input.exploreMap,
  );

  updateWhyLandzo(
    homepage,
    input.whyLandzo,
  );

  updateStats(
    homepage,
    input.stats,
  );

  updateCta(
    homepage,
    input.cta,
  );

  updateSeo(
    homepage,
    input.seo,
  );

  homepage.updatedBy = userId;

  await homepage.save();

  return homepage;
};