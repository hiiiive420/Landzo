import { useEffect, useState } from "react";

import { getErrorMessage } from "../../../api/apiClient";
import {
  getAdminHomepage,
  removeHomepageImage,
  updateHomepage,
  uploadHomepageImage,
} from "../../../api/homepage.api";
import { useAuth } from "../../../auth/useAuth";
import { Alert } from "../../../components/common/Alert";
import { Field } from "../../../components/forms/Field";
import { permissions } from "../../../utils/propertyOptions";

import {
  homepageFormStateFromApi,
  toHomepagePayload,
} from "./homepage.form";

const MAX_BENEFITS = 4;
const MAX_STATS = 4;
const MAX_HOMEPAGE_IMAGE_BYTES =
  20 * 1024 * 1024;

const ALLOWED_HOMEPAGE_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
const createClientId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

export const HomepagePage = () => {
  const { hasPermission } = useAuth();

  const [homepage, setHomepage] = useState(null);
  const [form, setForm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mediaAction, setMediaAction] =
  useState("");

const [heroImageAlt, setHeroImageAlt] =
  useState("");

const [ctaImageAlt, setCtaImageAlt] =
  useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const canEdit = hasPermission(
    permissions.homepageEdit,
  );

  useEffect(() => {
    let active = true;

    const loadHomepage = async () => {
      await Promise.resolve();

      if (active) {
        setLoading(true);
        setError("");
        setNotice("");
      }

      try {
        const loaded =
          await getAdminHomepage();

       if (active) {
  setHomepage(loaded);

  setForm(
    homepageFormStateFromApi(loaded),
  );

  setHeroImageAlt(
    loaded.hero?.image?.alt ?? "",
  );

  setCtaImageAlt(
    loaded.cta?.image?.alt ?? "",
  );
}
      } catch (loadError) {
        if (active) {
          setError(
            getErrorMessage(loadError),
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadHomepage();

    return () => {
      active = false;
    };
  }, []);

  const updateSection = (
    section,
    nextValues,
  ) => {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        ...nextValues,
      },
    }));
  };

  const updateHeroCta = (
    ctaName,
    nextValues,
  ) => {
    setForm((current) => ({
      ...current,

      hero: {
        ...current.hero,

        [ctaName]: {
          ...current.hero[ctaName],
          ...nextValues,
        },
      },
    }));
  };

  const updateCtaButton = (
    nextValues,
  ) => {
    setForm((current) => ({
      ...current,

      cta: {
        ...current.cta,

        button: {
          ...current.cta.button,
          ...nextValues,
        },
      },
    }));
  };

  const addBenefit = () => {
    setForm((current) => {
      if (
        current.whyLandzo.benefits.length >=
        MAX_BENEFITS
      ) {
        return current;
      }

      return {
        ...current,

        whyLandzo: {
          ...current.whyLandzo,

          benefits: [
            ...current.whyLandzo.benefits,

            {
              id: createClientId("benefit"),
              title: "",
              description: "",
              iconKey: "",
            },
          ],
        },
      };
    });
  };

  const updateBenefit = (
    index,
    field,
    value,
  ) => {
    setForm((current) => ({
      ...current,

      whyLandzo: {
        ...current.whyLandzo,

        benefits:
          current.whyLandzo.benefits.map(
            (benefit, benefitIndex) =>
              benefitIndex === index
                ? {
                    ...benefit,
                    [field]: value,
                  }
                : benefit,
          ),
      },
    }));
  };

  const removeBenefit = (index) => {
    setForm((current) => ({
      ...current,

      whyLandzo: {
        ...current.whyLandzo,

        benefits:
          current.whyLandzo.benefits.filter(
            (_, benefitIndex) =>
              benefitIndex !== index,
          ),
      },
    }));
  };

  const addStat = () => {
    setForm((current) => {
      if (
        current.stats.items.length >=
        MAX_STATS
      ) {
        return current;
      }

      return {
        ...current,

        stats: {
          ...current.stats,

          items: [
            ...current.stats.items,

            {
              id: createClientId("stat"),
              value: "",
              label: "",
            },
          ],
        },
      };
    });
  };

  const updateStat = (
    index,
    field,
    value,
  ) => {
    setForm((current) => ({
      ...current,

      stats: {
        ...current.stats,

        items: current.stats.items.map(
          (item, itemIndex) =>
            itemIndex === index
              ? {
                  ...item,
                  [field]: value,
                }
              : item,
        ),
      },
    }));
  };

  const removeStat = (index) => {
    setForm((current) => ({
      ...current,

      stats: {
        ...current.stats,

        items: current.stats.items.filter(
          (_, itemIndex) =>
            itemIndex !== index,
        ),
      },
    }));
  };

  const validateHomepageImage = (file) => {
  if (!file) {
    return "Select an image first.";
  }

  if (
    !ALLOWED_HOMEPAGE_IMAGE_TYPES.includes(
      file.type,
    )
  ) {
    return "Only JPG, PNG, and WEBP images are allowed.";
  }

  if (
    file.size >
    MAX_HOMEPAGE_IMAGE_BYTES
  ) {
    return "Image must not exceed 20 MB.";
  }

  return "";
};

const applyUpdatedImage = (
  updated,
  target,
) => {
  setHomepage(updated);

  const nextImage =
    target === "hero"
      ? updated.hero?.image ?? null
      : updated.cta?.image ?? null;

  setForm((current) => {
    if (!current) {
      return current;
    }

    if (target === "hero") {
      return {
        ...current,

        hero: {
          ...current.hero,
          image: nextImage,
        },
      };
    }

    return {
      ...current,

      cta: {
        ...current.cta,
        image: nextImage,
      },
    };
  });

  if (target === "hero") {
    setHeroImageAlt(
      nextImage?.alt ?? "",
    );
  } else {
    setCtaImageAlt(
      nextImage?.alt ?? "",
    );
  }
};

const handleImageUpload = async (
  target,
  file,
) => {
  if (!canEdit) {
    return;
  }

  const validationError =
    validateHomepageImage(file);

  if (validationError) {
    setError(validationError);
    return;
  }

  const actionKey = `${target}-upload`;

  setMediaAction(actionKey);
  setError("");
  setNotice("");

  try {
    const updated =
      await uploadHomepageImage({
        target,
        file,

        alt:
          target === "hero"
            ? heroImageAlt
            : ctaImageAlt,
      });

    applyUpdatedImage(
      updated,
      target,
    );

    setNotice(
      target === "hero"
        ? "Hero image updated"
        : "CTA image updated",
    );
  } catch (uploadError) {
    setError(
      getErrorMessage(uploadError),
    );
  } finally {
    setMediaAction("");
  }
};

const handleImageRemove = async (
  target,
) => {
  if (!canEdit) {
    return;
  }

  const confirmed = window.confirm(
    target === "hero"
      ? "Remove the Homepage hero image?"
      : "Remove the Homepage CTA image?",
  );

  if (!confirmed) {
    return;
  }

  const actionKey = `${target}-remove`;

  setMediaAction(actionKey);
  setError("");
  setNotice("");

  try {
    const updated =
      await removeHomepageImage(target);

    applyUpdatedImage(
      updated,
      target,
    );

    setNotice(
      target === "hero"
        ? "Hero image removed"
        : "CTA image removed",
    );
  } catch (removeError) {
    setError(
      getErrorMessage(removeError),
    );
  } finally {
    setMediaAction("");
  }
};

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form || !canEdit) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const updated =
        await updateHomepage(
          toHomepagePayload(form),
        );

      setHomepage(updated);
      setForm(
        homepageFormStateFromApi(updated),
      );

      setNotice(
        "Homepage content saved successfully",
      );
    } catch (saveError) {
      setError(
        getErrorMessage(saveError),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p>Loading homepage...</p>;
  }

  if (!form) {
    return (
      <div className="stack">
        <Alert tone="danger">
          {error ||
            "Homepage content could not be loaded."}
        </Alert>
      </div>
    );
  }

  return (
    <div className="stack homepage-cms">
      <section className="page-heading row-between">
        <div>
          <p className="eyebrow">
            Content Management
          </p>

          <h1>Homepage</h1>

          <p className="muted">
            Manage the content shown on the
            LANDZO public homepage.
          </p>
        </div>

        <div className="homepage-status">
          <span className="status-badge">
            Live content
          </span>

          {homepage?.updatedAt ? (
            <span className="muted">
              Last updated{" "}
              {new Date(
                homepage.updatedAt,
              ).toLocaleString()}
            </span>
          ) : null}
        </div>
      </section>

      <Alert tone="danger">
        {error}
      </Alert>

      <Alert tone="success">
        {notice}
      </Alert>

      {!canEdit ? (
        <Alert tone="warning">
          You have view-only access to
          Homepage content.
        </Alert>
      ) : null}

      <form
        className="stack"
        onSubmit={handleSubmit}
      >
        {/* HERO */}
        <section className="panel homepage-cms-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                First impression
              </p>

              <h2>Hero Section</h2>

              <p className="muted">
                Main content displayed at the
                top of the LANDZO homepage.
              </p>
            </div>

            <span className="status-badge">
              Hero
            </span>
          </div>

          <div className="form-grid">
            <Field label="Eyebrow">
              <input
                value={form.hero.eyebrow}
                maxLength={80}
                disabled={!canEdit}
                onChange={(event) =>
                  updateSection("hero", {
                    eyebrow:
                      event.target.value,
                  })
                }
                placeholder="Find your place"
              />
            </Field>

            <Field label="Main heading">
              <input
                value={form.hero.heading}
                maxLength={160}
                disabled={!canEdit}
                onChange={(event) =>
                  updateSection("hero", {
                    heading:
                      event.target.value,
                  })
                }
                placeholder="Discover property across Sri Lanka"
              />
            </Field>

            <Field label="Highlight text">
              <input
                value={form.hero.highlight}
                maxLength={100}
                disabled={!canEdit}
                onChange={(event) =>
                  updateSection("hero", {
                    highlight:
                      event.target.value,
                  })
                }
                placeholder="Optional highlighted words"
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              rows={4}
              value={form.hero.description}
              maxLength={500}
              disabled={!canEdit}
              onChange={(event) =>
                updateSection("hero", {
                  description:
                    event.target.value,
                })
              }
            />
          </Field>

          <div className="homepage-cms-subsection">
            <div className="section-heading">
              <h3>Primary action</h3>
            </div>

            <div className="form-grid">
              <Field label="Button label">
                <input
                  value={
                    form.hero.primaryCta
                      .label
                  }
                  maxLength={60}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updateHeroCta(
                      "primaryCta",
                      {
                        label:
                          event.target.value,
                      },
                    )
                  }
                />
              </Field>

              <Field label="Button link">
                <input
                  value={
                    form.hero.primaryCta
                      .link
                  }
                  maxLength={500}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updateHeroCta(
                      "primaryCta",
                      {
                        link:
                          event.target.value,
                      },
                    )
                  }
                  placeholder="/properties"
                />
              </Field>
            </div>
          </div>

          <div className="homepage-cms-subsection">
            <div className="section-heading">
              <h3>Secondary action</h3>
            </div>

            <div className="form-grid">
              <Field label="Button label">
                <input
                  value={
                    form.hero.secondaryCta
                      .label
                  }
                  maxLength={60}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updateHeroCta(
                      "secondaryCta",
                      {
                        label:
                          event.target.value,
                      },
                    )
                  }
                />
              </Field>

              <Field label="Button link">
                <input
                  value={
                    form.hero.secondaryCta
                      .link
                  }
                  maxLength={500}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updateHeroCta(
                      "secondaryCta",
                      {
                        link:
                          event.target.value,
                      },
                    )
                  }
                  placeholder="/explore"
                />
              </Field>
            </div>
          </div>

          <div className="homepage-media-placeholder">
  <div className="stack">
    <div>
      <strong>
        Hero background image
      </strong>

      <p className="muted">
        JPG, PNG or WEBP. Maximum 20 MB.
        Images are optimized and stored
        as WEBP.
      </p>
    </div>

    <Field label="Image alt text">
      <input
        value={heroImageAlt}
        maxLength={160}
        disabled={
          !canEdit ||
          Boolean(mediaAction)
        }
        onChange={(event) =>
          setHeroImageAlt(
            event.target.value,
          )
        }
        placeholder="Describe the hero image"
      />
    </Field>

    {canEdit ? (
      <div className="form-actions">
        <label className="button secondary">
          {mediaAction ===
          "hero-upload"
            ? "Uploading..."
            : form.hero.image
              ? "Replace Image"
              : "Upload Image"}

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            disabled={
              Boolean(mediaAction)
            }
            onChange={(event) => {
              const file =
                event.target
                  .files?.[0];

              if (file) {
                handleImageUpload(
                  "hero",
                  file,
                );
              }

              event.target.value = "";
            }}
          />
        </label>

        {form.hero.image ? (
          <button
            className="button secondary"
            type="button"
            disabled={
              Boolean(mediaAction)
            }
            onClick={() =>
              handleImageRemove(
                "hero",
              )
            }
          >
            {mediaAction ===
            "hero-remove"
              ? "Removing..."
              : "Remove Image"}
          </button>
        ) : null}
      </div>
    ) : null}
  </div>

  {form.hero.image?.url ||
  form.hero.image?.secureUrl ? (
    <img
      src={
        form.hero.image.url ??
        form.hero.image.secureUrl
      }
      alt={
        form.hero.image.alt ||
        "Homepage hero"
      }
    />
  ) : (
    <span className="muted">
      No image uploaded
    </span>
  )}
</div>
        </section>

        {/* FEATURED PROPERTIES */}
        <section className="panel homepage-cms-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                Property discovery
              </p>

              <h2>
                Featured Properties
              </h2>

              <p className="muted">
                Property selection is managed
                from Featured Properties. Only
                the homepage introduction is
                edited here.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <Field label="Section heading">
              <input
                value={
                  form.featuredProperties
                    .heading
                }
                maxLength={140}
                disabled={!canEdit}
                onChange={(event) =>
                  updateSection(
                    "featuredProperties",
                    {
                      heading:
                        event.target.value,
                    },
                  )
                }
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              rows={3}
              value={
                form.featuredProperties
                  .description
              }
              maxLength={500}
              disabled={!canEdit}
              onChange={(event) =>
                updateSection(
                  "featuredProperties",
                  {
                    description:
                      event.target.value,
                  },
                )
              }
            />
          </Field>

          <div className="cms-linked-feature">
            <span>
              Featured Property records remain
              managed from the existing
              Featured Properties module.
            </span>
          </div>
        </section>

        {/* EXPLORE MAP */}
        <section className="panel homepage-cms-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                Location discovery
              </p>

              <h2>Explore Map</h2>

              <p className="muted">
                Manage the introduction around
                the public map experience.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <Field label="Section heading">
              <input
                value={
                  form.exploreMap.heading
                }
                maxLength={140}
                disabled={!canEdit}
                onChange={(event) =>
                  updateSection(
                    "exploreMap",
                    {
                      heading:
                        event.target.value,
                    },
                  )
                }
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              rows={3}
              value={
                form.exploreMap.description
              }
              maxLength={500}
              disabled={!canEdit}
              onChange={(event) =>
                updateSection(
                  "exploreMap",
                  {
                    description:
                      event.target.value,
                  },
                )
              }
            />
          </Field>

          <div className="cms-linked-feature">
            <span>
              Map Property records remain
              managed from Explore Map.
            </span>
          </div>
        </section>

        {/* WHY LANDZO */}
        <section className="panel homepage-cms-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                Brand value
              </p>

              <h2>Why LANDZO</h2>

              <p className="muted">
                Add up to four concise reasons
                for customers to choose LANDZO.
              </p>
            </div>

            {canEdit ? (
              <button
                type="button"
                className="button secondary"
                onClick={addBenefit}
                disabled={
                  form.whyLandzo.benefits
                    .length >= MAX_BENEFITS
                }
              >
                + Add Benefit
              </button>
            ) : null}
          </div>

          <div className="form-grid">
            <Field label="Section heading">
              <input
                value={
                  form.whyLandzo.heading
                }
                maxLength={140}
                disabled={!canEdit}
                onChange={(event) =>
                  updateSection(
                    "whyLandzo",
                    {
                      heading:
                        event.target.value,
                    },
                  )
                }
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              rows={3}
              value={
                form.whyLandzo.description
              }
              maxLength={500}
              disabled={!canEdit}
              onChange={(event) =>
                updateSection(
                  "whyLandzo",
                  {
                    description:
                      event.target.value,
                  },
                )
              }
            />
          </Field>

          {form.whyLandzo.benefits.length ? (
            <div className="homepage-card-grid">
              {form.whyLandzo.benefits.map(
                (benefit, index) => (
                  <article
                    className="homepage-editor-card"
                    key={
                      benefit.id ??
                      `benefit-${index}`
                    }
                  >
                    <div className="row-between">
                      <strong>
                        Benefit {index + 1}
                      </strong>

                      {canEdit ? (
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() =>
                            removeBenefit(
                              index,
                            )
                          }
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <Field label="Title">
                      <input
                        value={
                          benefit.title
                        }
                        maxLength={100}
                        disabled={!canEdit}
                        onChange={(event) =>
                          updateBenefit(
                            index,
                            "title",
                            event.target.value,
                          )
                        }
                      />
                    </Field>

                    <Field label="Description">
                      <textarea
                        rows={3}
                        value={
                          benefit.description
                        }
                        maxLength={300}
                        disabled={!canEdit}
                        onChange={(event) =>
                          updateBenefit(
                            index,
                            "description",
                            event.target.value,
                          )
                        }
                      />
                    </Field>

                    <Field label="Icon key">
                      <input
                        value={
                          benefit.iconKey
                        }
                        maxLength={60}
                        disabled={!canEdit}
                        onChange={(event) =>
                          updateBenefit(
                            index,
                            "iconKey",
                            event.target.value,
                          )
                        }
                        placeholder="verified, map, support..."
                      />
                    </Field>
                  </article>
                ),
              )}
            </div>
          ) : (
            <p className="muted">
              No benefit cards added yet.
            </p>
          )}
        </section>

        {/* STATS */}
        <section className="panel homepage-cms-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                Numbers
              </p>

              <h2>Stats</h2>

              <p className="muted">
                Add up to four short statistics
                for the homepage.
              </p>
            </div>

            {canEdit ? (
              <button
                type="button"
                className="button secondary"
                onClick={addStat}
                disabled={
                  form.stats.items.length >=
                  MAX_STATS
                }
              >
                + Add Stat
              </button>
            ) : null}
          </div>

          <Field label="Section heading">
            <input
              value={form.stats.heading}
              maxLength={140}
              disabled={!canEdit}
              onChange={(event) =>
                updateSection("stats", {
                  heading:
                    event.target.value,
                })
              }
            />
          </Field>

          {form.stats.items.length ? (
            <div className="homepage-card-grid">
              {form.stats.items.map(
                (item, index) => (
                  <article
                    className="homepage-editor-card"
                    key={
                      item.id ??
                      `stat-${index}`
                    }
                  >
                    <div className="row-between">
                      <strong>
                        Stat {index + 1}
                      </strong>

                      {canEdit ? (
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() =>
                            removeStat(index)
                          }
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <Field label="Value">
                      <input
                        value={item.value}
                        maxLength={40}
                        disabled={!canEdit}
                        onChange={(event) =>
                          updateStat(
                            index,
                            "value",
                            event.target.value,
                          )
                        }
                        placeholder="100+"
                      />
                    </Field>

                    <Field label="Label">
                      <input
                        value={item.label}
                        maxLength={80}
                        disabled={!canEdit}
                        onChange={(event) =>
                          updateStat(
                            index,
                            "label",
                            event.target.value,
                          )
                        }
                        placeholder="Properties"
                      />
                    </Field>
                  </article>
                ),
              )}
            </div>
          ) : (
            <p className="muted">
              No homepage stats added yet.
            </p>
          )}
        </section>

        {/* CTA */}
        {/* CTA */}
<section className="panel homepage-cms-section">
  <div className="section-heading">
    <div>
      <p className="eyebrow">
        Conversion
      </p>

      <h2>Call to Action</h2>

      <p className="muted">
        Final homepage message before
        visitors continue to an enquiry
        or property journey.
      </p>
    </div>
  </div>

  <div className="form-grid">
    <Field label="Heading">
      <input
        value={form.cta.heading}
        maxLength={140}
        disabled={!canEdit}
        onChange={(event) =>
          updateSection("cta", {
            heading: event.target.value,
          })
        }
      />
    </Field>

    <Field label="Button label">
      <input
        value={form.cta.button.label}
        maxLength={60}
        disabled={!canEdit}
        onChange={(event) =>
          updateCtaButton({
            label: event.target.value,
          })
        }
      />
    </Field>

    <Field label="Button link">
      <input
        value={form.cta.button.link}
        maxLength={500}
        disabled={!canEdit}
        onChange={(event) =>
          updateCtaButton({
            link: event.target.value,
          })
        }
        placeholder="/contact"
      />
    </Field>
  </div>

  <Field label="Description">
    <textarea
      rows={3}
      value={form.cta.description}
      maxLength={500}
      disabled={!canEdit}
      onChange={(event) =>
        updateSection("cta", {
          description: event.target.value,
        })
      }
    />
  </Field>

  <div className="homepage-media-placeholder">
    <div className="stack">
      <div>
        <strong>
          CTA background image
        </strong>

        <p className="muted">
          JPG, PNG or WEBP. Maximum 20 MB.
          Images are optimized and stored
          as WEBP.
        </p>
      </div>

      <Field label="Image alt text">
        <input
          value={ctaImageAlt}
          maxLength={160}
          disabled={
            !canEdit ||
            Boolean(mediaAction)
          }
          onChange={(event) =>
            setCtaImageAlt(
              event.target.value,
            )
          }
          placeholder="Describe the CTA image"
        />
      </Field>

      {canEdit ? (
        <div className="form-actions">
          <label className="button secondary">
            {mediaAction === "cta-upload"
              ? "Uploading..."
              : form.cta.image
                ? "Replace Image"
                : "Upload Image"}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              disabled={Boolean(mediaAction)}
              onChange={(event) => {
                const file =
                  event.target.files?.[0];

                if (file) {
                  handleImageUpload(
                    "cta",
                    file,
                  );
                }

                event.target.value = "";
              }}
            />
          </label>

          {form.cta.image ? (
            <button
              className="button secondary"
              type="button"
              disabled={Boolean(mediaAction)}
              onClick={() =>
                handleImageRemove("cta")
              }
            >
              {mediaAction === "cta-remove"
                ? "Removing..."
                : "Remove Image"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>

    {form.cta.image?.url ||
    form.cta.image?.secureUrl ? (
      <img
        src={
          form.cta.image.url ??
          form.cta.image.secureUrl
        }
        alt={
          form.cta.image.alt ||
          "Homepage CTA"
        }
      />
    ) : (
      <span className="muted">
        No image uploaded
      </span>
    )}
  </div>
</section>

        {/* SEO */}
        <section className="panel homepage-cms-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                Search visibility
              </p>

              <h2>SEO</h2>

              <p className="muted">
                Metadata used by the future
                public LANDZO homepage.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <Field label="Meta title">
              <input
                value={
                  form.seo.metaTitle
                }
                maxLength={60}
                disabled={!canEdit}
                onChange={(event) =>
                  updateSection("seo", {
                    metaTitle:
                      event.target.value,
                  })
                }
              />

              <span className="field-hint">
                {
                  form.seo.metaTitle
                    .length
                }
                /60
              </span>
            </Field>
          </div>

          <Field label="Meta description">
            <textarea
              rows={3}
              value={
                form.seo.metaDescription
              }
              maxLength={160}
              disabled={!canEdit}
              onChange={(event) =>
                updateSection("seo", {
                  metaDescription:
                    event.target.value,
                })
              }
            />

            <span className="field-hint">
              {
                form.seo.metaDescription
                  .length
              }
              /160
            </span>
          </Field>
        </section>

        {canEdit ? (
          <div className="homepage-save-bar">
            <div>
              <strong>
                Homepage content
              </strong>

              <p className="muted">
                Changes become available to the
                public Homepage API after
                saving.
              </p>
            </div>

            <button
              className="button primary"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
};