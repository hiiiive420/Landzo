import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormProvider,
  useForm,
  useWatch,
} from "react-hook-form";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import BlogEditor from "./BlogEditor.jsx";
import FeaturedImageUploader from "./FeaturedImageUploader.jsx";
import TagInput from "./TagInput.jsx";
import {
  BLOG_FORM_DEFAULTS,
  BLOG_LIMITS,
} from "./blog.constants.js";
import {
  formatBlogDate,
  getReadingTime,
  getWordCount,
  prepareBlogHtmlForSave,
} from "./blog.helpers.js";
import {
  blogFormSchema,
  blogStepFields,
} from "./blog.schema.js";

const steps = [
  {
    title: "Basic Information",
    description:
      "Article title, category, tags and excerpt.",
  },
  {
    title: "Content",
    description:
      "Write and format the article content.",
  },
  {
    title: "Featured Image",
    description:
      "Article hero image and alt text.",
  },
  {
    title: "SEO",
    description:
      "Search title and description.",
  },
  {
    title: "Review",
    description:
      "Review the article before saving.",
  },
];

const getInitialValues = (
  initialValues,
) => ({
  ...BLOG_FORM_DEFAULTS,
  ...initialValues,
  tags:
    initialValues?.tags ||
    BLOG_FORM_DEFAULTS.tags,
  featuredImageFile: null,
  removeFeaturedImage: false,
});

const CharacterCount = ({
  value = "",
  max,
}) => (
  <small>
    {String(value || "").length}/{max}
  </small>
);

const ReviewItem = ({
  label,
  value,
}) => (
  <div className="blog-review-item">
    <span className="muted">
      {label}
    </span>

    <strong>
      {value || "Not set"}
    </strong>
  </div>
);

export default function BlogWizard({
  mode = "create",
  initialValues = BLOG_FORM_DEFAULTS,
  existingBlog = null,
  categoryOptions = [],
  onSubmit,
  isSubmitting = false,
}) {
  const [activeStep, setActiveStep] =
    useState(0);

  const [contentMode, setContentMode] =
    useState("editor");

  const methods = useForm({
    resolver: zodResolver(
      blogFormSchema,
    ),

    defaultValues:
      getInitialValues(
        initialValues,
      ),

    mode: "onBlur",
  });

const {
  register,
  handleSubmit,
  reset,
  setValue,
  trigger,
  control,
  formState: {
    errors,
  },
} = methods;



  const values = useWatch({ control });

  useEffect(() => {
    reset(
      getInitialValues(
        initialValues,
      ),
    );
  }, [
    initialValues,
    reset,
  ]);

  const previewHtml =
    useMemo(
      () =>
        prepareBlogHtmlForSave(
          values.content,
          values.title,
        ),
      [
        values.content,
        values.title,
      ],
    );

  const wordCount =
    getWordCount(
      values.content,
    );

  const readingTime =
    getReadingTime(
      values.content,
    );

  const isLastStep =
    activeStep ===
    steps.length - 1;

  const goNext = async () => {
    const fields =
      blogStepFields[
        activeStep
      ];

    const valid =
      fields.length
        ? await trigger(
            fields,
            {
              shouldFocus: true,
            },
          )
        : true;

    if (!valid) {
      return;
    }

    setActiveStep(
      (current) =>
        Math.min(
          current + 1,
          steps.length - 1,
        ),
    );
  };

  const goBack = () => {
    setActiveStep(
      (current) =>
        Math.max(
          current - 1,
          0,
        ),
    );
  };

  const handleStepClick =
    async (index) => {
      if (
        index ===
        activeStep
      ) {
        return;
      }

      if (
        index <
        activeStep
      ) {
        setActiveStep(index);
        return;
      }

      /*
       * Do not allow users to jump
       * forward past invalid steps.
       */
      for (
        let stepIndex =
          activeStep;
        stepIndex < index;
        stepIndex += 1
      ) {
        const fields =
          blogStepFields[
            stepIndex
          ];

        if (!fields.length) {
          continue;
        }

        const valid =
          await trigger(
            fields,
            {
              shouldFocus:
                stepIndex ===
                activeStep,
            },
          );

        if (!valid) {
          return;
        }
      }

      setActiveStep(index);
    };

  const handleValidSubmit =
    async (formValues) => {
      const preparedContent =
        prepareBlogHtmlForSave(
          formValues.content,
          formValues.title,
        );

      await onSubmit?.({
        ...formValues,
        content:
          preparedContent,
      });
    };

  const renderBasicInformation =
    () => (
      <div className="form-grid">
        <label className="field">
          <span>Title</span>

          <input
            type="text"
            maxLength={
              BLOG_LIMITS.TITLE
            }
            placeholder="Article title"
            {...register("title")}
          />

          <CharacterCount
            value={values.title}
            max={
              BLOG_LIMITS.TITLE
            }
          />

          {errors.title ? (
            <span className="field-error">
              {
                errors.title
                  .message
              }
            </span>
          ) : null}
        </label>

        <label className="field">
          <span>Category</span>

          <input
            type="text"
            list="blog-category-options"
            maxLength={
              BLOG_LIMITS.CATEGORY
            }
            placeholder="e.g. Property Guide"
            {...register(
              "category",
            )}
          />

          {categoryOptions.length ? (
            <datalist id="blog-category-options">
              {categoryOptions.map(
                (category) => (
                  <option
                    key={
                      category
                    }
                    value={
                      category
                    }
                  />
                ),
              )}
            </datalist>
          ) : null}

          {errors.category ? (
            <span className="field-error">
              {
                errors.category
                  .message
              }
            </span>
          ) : null}
        </label>

        <TagInput
          value={
            values.tags || []
          }
          onChange={(tags) =>
            setValue(
              "tags",
              tags,
              {
                shouldDirty: true,
                shouldValidate:
                  true,
              },
            )
          }
          error={
            errors.tags?.message
          }
        />

        <label className="field blog-form-field-full">
          <span>Excerpt</span>

          <textarea
            rows={5}
            maxLength={
              BLOG_LIMITS.EXCERPT
            }
            placeholder="Short introduction shown on Blog cards and listings"
            {...register(
              "excerpt",
            )}
          />

          <CharacterCount
            value={
              values.excerpt
            }
            max={
              BLOG_LIMITS.EXCERPT
            }
          />

          {errors.excerpt ? (
            <span className="field-error">
              {
                errors.excerpt
                  .message
              }
            </span>
          ) : null}
        </label>
      </div>
    );

  const renderContent = () => (
    <div className="blog-content-step">
      <div className="section-heading">
        <div>
          <h2>
            Article Content
          </h2>

          <p className="muted">
            Create the public
            article using the
            LANDZO editor.
          </p>
        </div>

        <div className="blog-content-mode">
          <button
            type="button"
            className={[
              "button small",
              contentMode ===
              "editor"
                ? "primary"
                : "secondary",
            ].join(" ")}
            onClick={() =>
              setContentMode(
                "editor",
              )
            }
          >
            Editor
          </button>

          <button
            type="button"
            className={[
              "button small",
              contentMode ===
              "preview"
                ? "primary"
                : "secondary",
            ].join(" ")}
            onClick={() =>
              setContentMode(
                "preview",
              )
            }
          >
            Preview
          </button>
        </div>
      </div>

      <div className="blog-content-stats">
        <span>
          {wordCount} words
        </span>

        <span>
          {readingTime} min
          read
        </span>
      </div>

      {contentMode ===
      "editor" ? (
        <BlogEditor
          value={
            values.content
          }
          title={
            values.title
          }
          onTitleChange={(
            title,
          ) =>
            setValue(
              "title",
              title,
              {
                shouldDirty:
                  true,
                shouldValidate:
                  true,
              },
            )
          }
          onChange={(
            content,
          ) =>
            setValue(
              "content",
              content,
              {
                shouldDirty:
                  true,
                shouldValidate:
                  true,
              },
            )
          }
          error={
            errors.content
              ?.message
          }
        />
      ) : (
        <section className="panel blog-preview">
          {values.title?.trim() ? (
            <header className="blog-preview-title">
              <h1>
                {values.title}
              </h1>
            </header>
          ) : null}

          {previewHtml ? (
            <article
              className="blog-article-content"
              dangerouslySetInnerHTML={{
                __html:
                  previewHtml,
              }}
            />
          ) : (
            <p className="muted">
              No article content
              available yet.
            </p>
          )}
        </section>
      )}
    </div>
  );

  const renderFeaturedImage =
    () => (
      <FeaturedImageUploader
        file={
          values.featuredImageFile
        }
        existingImage={
          existingBlog
            ?.featuredImage
        }
        isExistingRemoved={Boolean(
          values.removeFeaturedImage,
        )}
        altValue={
          values.featuredImageAlt ||
          ""
        }
        imageError={
          errors.featuredImageFile
            ?.message
        }
        altError={
          errors.featuredImageAlt
            ?.message
        }
        onFileChange={(file) => {
          setValue(
            "featuredImageFile",
            file,
            {
              shouldDirty: true,
              shouldValidate:
                true,
            },
          );

          if (file) {
            setValue(
              "removeFeaturedImage",
              false,
              {
                shouldDirty:
                  true,
              },
            );
          }
        }}
        onRemoveExisting={() => {
          setValue(
            "featuredImageFile",
            null,
            {
              shouldDirty: true,
            },
          );

          setValue(
            "removeFeaturedImage",
            true,
            {
              shouldDirty: true,
            },
          );
        }}
        onRestoreExisting={() => {
          setValue(
            "removeFeaturedImage",
            false,
            {
              shouldDirty: true,
            },
          );
        }}
        onAltChange={(
          altText,
        ) =>
          setValue(
            "featuredImageAlt",
            altText,
            {
              shouldDirty: true,
              shouldValidate:
                true,
            },
          )
        }
      />
    );

  const renderSeo = () => (
    <div className="form-grid">
      <label className="field">
        <span>
          Meta Title
        </span>

        <input
          type="text"
          maxLength={
            BLOG_LIMITS.META_TITLE
          }
          placeholder="SEO title"
          {...register(
            "metaTitle",
          )}
        />

        <CharacterCount
          value={
            values.metaTitle
          }
          max={
            BLOG_LIMITS.META_TITLE
          }
        />

        {errors.metaTitle ? (
          <span className="field-error">
            {
              errors.metaTitle
                .message
            }
          </span>
        ) : null}
      </label>

      <label className="field blog-form-field-full">
        <span>
          Meta Description
        </span>

        <textarea
          rows={5}
          maxLength={
            BLOG_LIMITS.META_DESCRIPTION
          }
          placeholder="Short search engine description"
          {...register(
            "metaDescription",
          )}
        />

        <CharacterCount
          value={
            values.metaDescription
          }
          max={
            BLOG_LIMITS.META_DESCRIPTION
          }
        />

        {errors.metaDescription ? (
          <span className="field-error">
            {
              errors.metaDescription
                .message
            }
          </span>
        ) : null}
      </label>

      <div className="panel blog-seo-note blog-form-field-full">
        <h3>
          Publishing is managed
          separately
        </h3>

        <p className="muted">
          Saving this form does
          not directly change
          publication state,
          publish date, views or
          featured status.
        </p>
      </div>
    </div>
  );

  const renderReview = () => {
    const imageLabel =
      values.featuredImageFile
        ?.name ||
      (values.removeFeaturedImage
        ? "Existing image will be removed"
        : existingBlog
            ?.featuredImage
            ?.secureUrl ||
          existingBlog
            ?.featuredImage
            ?.url
          ? "Existing featured image"
          : "No featured image");

    return (
      <div className="blog-review">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>
                Article Review
              </h2>

              <p className="muted">
                Check the article
                before saving.
              </p>
            </div>
          </div>

          <h1 className="blog-review-title">
            {values.title ||
              "Untitled article"}
          </h1>

          <p className="muted">
            {values.excerpt ||
              "No excerpt"}
          </p>
        </section>

        <div className="blog-review-grid">
          <ReviewItem
            label="Category"
            value={
              values.category
            }
          />

          <ReviewItem
            label="Words"
            value={String(
              wordCount,
            )}
          />

          <ReviewItem
            label="Reading Time"
            value={`${readingTime} min`}
          />

          <ReviewItem
            label="Featured Image"
            value={imageLabel}
          />

          <ReviewItem
            label="Current Status"
            value={
              existingBlog
                ?.status ||
              "Draft after creation"
            }
          />

          <ReviewItem
            label="Publish Date"
            value={formatBlogDate(
              existingBlog
                ?.publishDate,
            )}
          />
        </div>

        <section className="panel">
          <h2>Tags</h2>

          {values.tags?.length ? (
            <div className="blog-tag-list blog-review-tags">
              {values.tags.map(
                (tag) => (
                  <span
                    className="blog-tag"
                    key={tag}
                  >
                    {tag}
                  </span>
                ),
              )}
            </div>
          ) : (
            <p className="muted">
              No tags added.
            </p>
          )}
        </section>

        <section className="panel blog-preview">
          <h2>
            Content Preview
          </h2>

          {previewHtml ? (
            <article
              className="blog-article-content"
              dangerouslySetInnerHTML={{
                __html:
                  previewHtml,
              }}
            />
          ) : (
            <p className="muted">
              No content.
            </p>
          )}
        </section>

        <section className="panel">
          <h2>SEO</h2>

          <div className="blog-review-grid">
            <ReviewItem
              label="Meta Title"
              value={
                values.metaTitle
              }
            />

            <ReviewItem
              label="Meta Description"
              value={
                values.metaDescription
              }
            />
          </div>
        </section>
      </div>
    );
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return renderBasicInformation();

      case 1:
        return renderContent();

      case 2:
        return renderFeaturedImage();

      case 3:
        return renderSeo();

      default:
        return renderReview();
    }
  };

  return (
    <FormProvider {...methods}>
      <form
        className="blog-wizard"
        onSubmit={handleSubmit(
          handleValidSubmit,
        )}
      >
        <nav
          className="blog-wizard-steps"
          aria-label="Blog form steps"
        >
          {steps.map(
            (
              step,
              index,
            ) => (
              <button
                key={
                  step.title
                }
                type="button"
                className={[
                  "blog-wizard-step",
                  index ===
                  activeStep
                    ? "is-active"
                    : "",
                  index <
                  activeStep
                    ? "is-complete"
                    : "",
                ]
                  .filter(
                    Boolean,
                  )
                  .join(" ")}
                onClick={() =>
                  void handleStepClick(
                    index,
                  )
                }
              >
                <span className="blog-wizard-step-number">
                  {index + 1}
                </span>

                <span>
                  <strong>
                    {step.title}
                  </strong>

                  <small>
                    {
                      step.description
                    }
                  </small>
                </span>
              </button>
            ),
          )}
        </nav>

        <div className="blog-wizard-body">
          {renderStep()}
        </div>

        <div className="form-actions blog-wizard-actions">
          {activeStep > 0 ? (
            <button
              type="button"
              className="button secondary"
              disabled={
                isSubmitting
              }
              onClick={
                goBack
              }
            >
              Back
            </button>
          ) : (
            <span />
          )}

          {!isLastStep ? (
            <button
              type="button"
              className="button primary"
              disabled={
                isSubmitting
              }
              onClick={() =>
                void goNext()
              }
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              className="button primary"
              disabled={
                isSubmitting
              }
            >
              {isSubmitting
                ? "Saving..."
                : mode ===
                    "edit"
                  ? "Save Changes"
                  : "Create Blog"}
            </button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}