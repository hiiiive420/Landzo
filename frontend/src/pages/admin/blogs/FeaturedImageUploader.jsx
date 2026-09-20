import {
  useEffect,
  useRef,
  useState,
} from "react";

import { Alert } from "../../../components/common/Alert";
import {
  BLOG_IMAGE_ACCEPT,
  BLOG_LIMITS,
} from "./blog.constants.js";
import { isBlogImageFile } from "./blog.schema.js";

const getExistingImageUrl = (image) =>
  image?.secureUrl ||
  image?.url ||
  "";

const formatBytes = (bytes) =>
  `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

export default function FeaturedImageUploader({
  file = null,
  existingImage = null,
  isExistingRemoved = false,
  altValue = "",
  imageError = "",
  altError = "",
  onFileChange,
  onRemoveExisting,
  onRestoreExisting,
  onAltChange,
}) {
  const inputRef = useRef(null);
  const localPreviewUrlRef = useRef("");
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");

  const clearLocalPreview = () => {
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
      localPreviewUrlRef.current = "";
    }

    setLocalPreviewUrl("");
  };

  useEffect(
    () => () => {
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (file || !localPreviewUrlRef.current) {
      return;
    }

    URL.revokeObjectURL(localPreviewUrlRef.current);
    localPreviewUrlRef.current = "";
    setLocalPreviewUrl("");
  }, [file]);
  const [localError, setLocalError] = useState("");

 

  const existingImageUrl =
    getExistingImageUrl(
      existingImage,
    );

  const visibleExistingImage =
    !file &&
    !isExistingRemoved &&
    existingImageUrl;

  const handleFileChange = (
    event,
  ) => {
    const [selectedFile] =
      Array.from(
        event.target.files || [],
      );

    setLocalError("");

    if (!selectedFile) {
      return;
    }

    const validationError =
      isBlogImageFile(
        selectedFile,
      );

    if (validationError) {
      setLocalError(
        validationError,
      );

      event.target.value = "";

      return;
    }

    clearLocalPreview();

    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    localPreviewUrlRef.current = nextPreviewUrl;
    setLocalPreviewUrl(nextPreviewUrl);

    onFileChange?.(selectedFile);

    event.target.value = "";
  };

  const clearSelectedFile = () => {
    setLocalError("");
    clearLocalPreview();

    onFileChange?.(null);

    if (inputRef.current) {
      inputRef.current.value =
        "";
    }
  };

  const removeExistingImage = () => {
    setLocalError("");
    clearLocalPreview();

    onFileChange?.(null);
    onRemoveExisting?.();
  };

  const restoreExistingImage = () => {
    setLocalError("");
    onRestoreExisting?.();
  };

  const displayedError =
    localError || imageError;

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Featured Image</h2>

          <p className="muted">
            Used on Blog cards and
            the public article hero.
          </p>
        </div>

        <span>Optional</span>
      </div>

      <Alert tone="danger">
        {displayedError}
      </Alert>

      <div className="media-upload">
        <label className="field">
          <span>
            Select Featured Image
          </span>

          <input
            ref={inputRef}
            type="file"
            accept={
              BLOG_IMAGE_ACCEPT
            }
            onChange={
              handleFileChange
            }
          />
        </label>

        <p className="muted">
          JPG, PNG or WEBP. Maximum
          file size 20 MB.
        </p>

    {file ? (
  <div className="preview-grid">
    <figure className="media-card">
      <img
        src={localPreviewUrl}
        alt={altValue || file.name}
      />

              <figcaption>
                <span>
                  {file.name} -{" "}
                  {formatBytes(
                    file.size,
                  )}
                </span>

                <strong>
                  New image
                </strong>
              </figcaption>
            </figure>
          </div>
        ) : null}

        {visibleExistingImage ? (
          <div className="gallery-grid">
            <figure className="media-card">
              <img
                src={
                  existingImageUrl
                }
                alt={
                  altValue ||
                  existingImage?.alt ||
                  "Existing Blog featured image"
                }
              />

              <figcaption>
                <span>
                  Existing featured
                  image
                </span>

                <strong>
                  Current
                </strong>
              </figcaption>
            </figure>
          </div>
        ) : null}

        {isExistingRemoved &&
        !file ? (
          <Alert tone="warning">
            Existing featured image
            will be removed when you
            save the Blog.
          </Alert>
        ) : null}

        <div className="form-actions">
          {file ? (
            <button
              className="button secondary"
              type="button"
              onClick={
                clearSelectedFile
              }
            >
              Clear Selection
            </button>
          ) : null}

          {visibleExistingImage ? (
            <button
              className="button secondary danger"
              type="button"
              onClick={
                removeExistingImage
              }
            >
              Remove Existing Image
            </button>
          ) : null}

          {isExistingRemoved &&
          existingImageUrl &&
          !file ? (
            <button
              className="button secondary"
              type="button"
              onClick={
                restoreExistingImage
              }
            >
              Undo Removal
            </button>
          ) : null}
        </div>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Image Alt Text</span>

          <input
            type="text"
            value={altValue}
            maxLength={
              BLOG_LIMITS.FEATURED_IMAGE_ALT
            }
            placeholder="Describe the featured image"
            onChange={(event) =>
              onAltChange?.(
                event.target.value,
              )
            }
          />

          <small>
            {altValue.length}/
            {
              BLOG_LIMITS.FEATURED_IMAGE_ALT
            }
          </small>

          {altError ? (
            <span className="field-error">
              {altError}
            </span>
          ) : null}
        </label>
      </div>
    </section>
  );
}