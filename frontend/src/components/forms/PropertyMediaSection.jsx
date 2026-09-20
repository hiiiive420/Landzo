import { useEffect, useRef, useState } from "react";

import { getErrorMessage } from "../../api/apiClient";
import {
  deletePropertyImage,
  reorderPropertyImages,
  setPropertyCoverImage,
  uploadPropertyImages,
} from "../../api/properties.api";
import { useAuth } from "../../auth/useAuth";
import { permissions } from "../../utils/propertyOptions";
import { Alert } from "../common/Alert";

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFilesPerRequest = 10;
const maxImagesPerProperty = 20;
const maxImageSize = 10 * 1024 * 1024;

const formatBytes = (bytes) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

export const PropertyMediaSection = ({ property, onChanged }) => {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission(permissions.propertyEdit);
  const images = property?.media?.images || [];
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [busyImageId, setBusyImageId] = useState(null);
  const previewUrlsRef = useRef([]);

  const clearPreviews = () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];
    setPreviews([]);
    setSelectedFiles([]);
  };

  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const validateFiles = (files) => {
    if (files.length > maxFilesPerRequest) {
      return "Select 10 images or fewer per upload.";
    }

    if (images.length + files.length > maxImagesPerProperty) {
      return "Maximum images reached for this property.";
    }

    const unsupportedFile = files.find((file) => !allowedTypes.includes(file.type));
    if (unsupportedFile) {
      return `Unsupported image: ${unsupportedFile.name}`;
    }

    const oversizedFile = files.find((file) => file.size > maxImageSize);
    if (oversizedFile) {
      return `Image exceeds size limit: ${oversizedFile.name}`;
    }

    return "";
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    clearPreviews();
    setError("");
    setNotice("");

    if (!files.length) {
      return;
    }

    const validationError = validateFiles(files);
    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    const nextPreviews = files.map((file) => {
      const url = URL.createObjectURL(file);
      previewUrlsRef.current.push(url);
      return { name: file.name, size: file.size, url };
    });

    setSelectedFiles(files);
    setPreviews(nextPreviews);
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) {
      setError("Select at least one image first.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError("");
    setNotice("");

    try {
      await uploadPropertyImages(property.id, selectedFiles, (event) => {
        if (event.total) {
          setUploadProgress(Math.round((event.loaded * 100) / event.total));
        }
      });
      clearPreviews();
      setNotice("Images uploaded");
      await onChanged();
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setUploading(false);
    }
  };

  const refreshAfterAction = async (action, successMessage) => {
    setBusyImageId(action.imageId || "gallery");
    setError("");
    setNotice("");

    try {
      await action.run();
      setNotice(successMessage);
      await onChanged();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setBusyImageId(null);
    }
  };

  const handleSetCover = (imageId) =>
    refreshAfterAction(
      { imageId, run: () => setPropertyCoverImage(property.id, imageId) },
      "Cover image updated",
    );

  const handleRemove = (imageId) => {
    if (!window.confirm("Remove this image from the property gallery?")) {
      return;
    }

    refreshAfterAction(
      { imageId, run: () => deletePropertyImage(property.id, imageId) },
      "Image removed",
    );
  };

  const moveImage = (imageId, direction) => {
    const currentIndex = images.findIndex((image) => image.id === imageId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= images.length) {
      return;
    }

    const imageIds = images.map((image) => image.id);
    const [movedId] = imageIds.splice(currentIndex, 1);
    imageIds.splice(nextIndex, 0, movedId);

    refreshAfterAction(
      { imageId, run: () => reorderPropertyImages(property.id, imageIds) },
      "Image order updated",
    );
  };

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Media</h2>
        <span>{images.length} / {maxImagesPerProperty}</span>
      </div>

      <Alert tone="danger">{error}</Alert>
      <Alert tone="success">{notice}</Alert>

      {canEdit ? (
        <div className="media-upload">
          <label className="field">
            <span>Select Images</span>
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
          </label>
          {previews.length ? (
            <div className="preview-grid">
              {previews.map((preview) => (
                <figure className="media-card" key={preview.url}>
                  <img src={preview.url} alt={preview.name} />
                  <figcaption>{preview.name} - {formatBytes(preview.size)}</figcaption>
                </figure>
              ))}
            </div>
          ) : null}
          <div className="form-actions">
            <button className="button primary" type="button" onClick={handleUpload} disabled={uploading || !selectedFiles.length}>
              {uploading ? `Uploading${uploadProgress ? ` ${uploadProgress}%` : "..."}` : "Upload Images"}
            </button>
            <button className="button secondary" type="button" onClick={clearPreviews} disabled={uploading || !selectedFiles.length}>Clear Selection</button>
          </div>
        </div>
      ) : null}

      {images.length ? (
        <div className="gallery-grid">
          {images.map((image, index) => (
            <figure className="media-card" key={image.id}>
              <img src={image.url} alt={image.originalFilename || `Property image ${index + 1}`} />
              <figcaption>
                <span>{index + 1}. {image.originalFilename || image.format}</span>
                {image.isCover ? <strong>Cover</strong> : null}
              </figcaption>
              {canEdit ? (
                <div className="media-actions">
                  <button className="button secondary small" type="button" onClick={() => moveImage(image.id, -1)} disabled={index === 0 || busyImageId !== null}>Move Left</button>
                  <button className="button secondary small" type="button" onClick={() => moveImage(image.id, 1)} disabled={index === images.length - 1 || busyImageId !== null}>Move Right</button>
                  <button className="button secondary small" type="button" onClick={() => handleSetCover(image.id)} disabled={image.isCover || busyImageId !== null}>Set Cover</button>
                  <button className="button secondary small danger" type="button" onClick={() => handleRemove(image.id)} disabled={busyImageId !== null}>Remove</button>
                </div>
              ) : null}
            </figure>
          ))}
        </div>
      ) : (
        <p className="muted">No public property images uploaded yet.</p>
      )}
    </section>
  );
};