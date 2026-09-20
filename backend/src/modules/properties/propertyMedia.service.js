import { AppError } from "../../common/errors/AppError.js";
import {
  PROPERTY_IMAGE_ERROR_CODES,
  PROPERTY_IMAGE_MAX_IMAGES,
  PROPERTY_IMAGE_MAX_UPLOAD_FILES,
} from "./property.constants.js";
import { Property } from "./property.model.js";
import { serializePropertyMedia } from "./property.serializer.js";
import {
  deletePropertyImageFromCloudinary,
  uploadPropertyImageToCloudinary,
} from "./propertyMedia.cloudinary.js";

const toPropertyNotFoundError = () => new AppError(404, "Property not found", "PROPERTY_NOT_FOUND");
const toImageNotFoundError = () =>
  new AppError(404, "Property image not found", PROPERTY_IMAGE_ERROR_CODES.NOT_FOUND);

const normalizeImages = (images = []) => {
  const sorted = [...images].sort((left, right) => left.order - right.order);

  sorted.forEach((image, index) => {
    image.order = index;
  });

  if (!sorted.length) {
    return sorted;
  }

  const existingCover = sorted.find((image) => image.isCover) ?? sorted[0];
  sorted.forEach((image) => {
    image.isCover = image._id.toString() === existingCover._id.toString();
  });

  return sorted;
};

const getImages = (property) => property.media?.images ?? [];

const propertyImageFolder = (property) => `landzo/properties/${property.code}`;

const cleanupUploadedImages = async ({ env, uploadedImages }) => {
  await Promise.allSettled(
    uploadedImages.map((image) =>
      deletePropertyImageFromCloudinary({ env, publicId: image.publicId }),
    ),
  );
};

export const addPropertyImages = async ({ env, propertyId, files = [] }) => {
  if (!files.length) {
    throw new AppError(400, "At least one property image is required", "PROPERTY_IMAGE_REQUIRED");
  }

  if (files.length > PROPERTY_IMAGE_MAX_UPLOAD_FILES) {
    throw new AppError(
      400,
      "Too many property images in one request",
      PROPERTY_IMAGE_ERROR_CODES.REQUEST_LIMIT_EXCEEDED,
    );
  }

  const property = await Property.findById(propertyId);

  if (!property) {
    throw toPropertyNotFoundError();
  }

  const existingImages = getImages(property);

  if (existingImages.length + files.length > PROPERTY_IMAGE_MAX_IMAGES) {
    throw new AppError(
      400,
      "Property image limit exceeded",
      PROPERTY_IMAGE_ERROR_CODES.LIMIT_EXCEEDED,
    );
  }

  const folder = propertyImageFolder(property);
  const uploadedImages = [];

  try {
    for (const file of files) {
      uploadedImages.push(await uploadPropertyImageToCloudinary({ env, file, folder }));
    }

    const firstOrder = existingImages.length;
    const hasCover = existingImages.some((image) => image.isCover);

    uploadedImages.forEach((image, index) => {
      existingImages.push({
        publicId: image.publicId,
        secureUrl: image.secureUrl,
        width: image.width,
        height: image.height,
        format: image.format,
        bytes: image.bytes,
        order: firstOrder + index,
        isCover: !hasCover && index === 0,
        originalFilename: image.originalFilename ?? null,
        uploadedAt: new Date(),
      });
    });

    property.media = { images: normalizeImages(existingImages) };
    await property.save();
    return serializePropertyMedia(property.media);
  } catch (error) {
    await cleanupUploadedImages({ env, uploadedImages });
    throw error;
  }
};

export const setPropertyImageCover = async ({ propertyId, imageId }) => {
  const property = await Property.findById(propertyId);

  if (!property) {
    throw toPropertyNotFoundError();
  }

  const images = getImages(property);
  const selectedImage = images.id(imageId);

  if (!selectedImage) {
    throw toImageNotFoundError();
  }

  images.forEach((image) => {
    image.isCover = image._id.toString() === selectedImage._id.toString();
  });

  property.media = { images: normalizeImages(images) };
  await property.save();
  return serializePropertyMedia(property.media);
};

export const removePropertyImage = async ({ env, propertyId, imageId }) => {
  const property = await Property.findById(propertyId);

  if (!property) {
    throw toPropertyNotFoundError();
  }

  const images = getImages(property);
  const selectedImage = images.id(imageId);

  if (!selectedImage) {
    throw toImageNotFoundError();
  }

  await deletePropertyImageFromCloudinary({ env, publicId: selectedImage.publicId });
  selectedImage.deleteOne();

  property.media = { images: normalizeImages(images) };
  await property.save();
  return serializePropertyMedia(property.media);
};

export const reorderPropertyImages = async ({ propertyId, imageIds = [] }) => {
  const property = await Property.findById(propertyId);

  if (!property) {
    throw toPropertyNotFoundError();
  }

  const images = getImages(property);
  const currentIds = images.map((image) => image._id.toString());
  const uniqueRequestedIds = new Set(imageIds);
  const currentIdSet = new Set(currentIds);

  if (
    imageIds.length !== currentIds.length ||
    uniqueRequestedIds.size !== imageIds.length ||
    imageIds.some((imageId) => !currentIdSet.has(imageId))
  ) {
    throw new AppError(
      400,
      "Invalid property image order",
      PROPERTY_IMAGE_ERROR_CODES.INVALID_ORDER,
    );
  }

  const orderById = new Map(imageIds.map((imageId, index) => [imageId, index]));
  images.forEach((image) => {
    image.order = orderById.get(image._id.toString());
  });

  property.media = { images: normalizeImages(images) };
  await property.save();
  return serializePropertyMedia(property.media);
};
