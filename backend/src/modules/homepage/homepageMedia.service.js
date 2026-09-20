import { AppError } from "../../common/errors/AppError.js";

import {
  HOMEPAGE_MEDIA_FOLDERS,
} from "./homepage.constants.js";

import {
  deleteHomepageImageFromCloudinary,
  uploadHomepageImageToCloudinary,
} from "./homepageMedia.cloudinary.js";

import {
  getOrCreateHomepage,
} from "./homepage.service.js";

const HOMEPAGE_IMAGE_TARGETS = Object.freeze({
  hero: {
    path: "hero.image",
    folder: HOMEPAGE_MEDIA_FOLDERS.hero,
  },

  cta: {
    path: "cta.image",
    folder: HOMEPAGE_MEDIA_FOLDERS.cta,
  },
});

const getImageTarget = (target) => {
  const config =
    HOMEPAGE_IMAGE_TARGETS[target];

  if (!config) {
    throw new AppError(
      400,
      "Invalid homepage image target",
      "HOMEPAGE_IMAGE_TARGET_INVALID",
    );
  }

  return config;
};

const getExistingImage = (
  homepage,
  target,
) => {
  if (target === "hero") {
    return homepage.hero?.image ?? null;
  }

  if (target === "cta") {
    return homepage.cta?.image ?? null;
  }

  return null;
};

export const uploadHomepageImage = async ({
  env,
  actorUserId,
  target,
  file,
  alt = "",
}) => {
  if (!file) {
    throw new AppError(
      400,
      "Homepage image is required",
      "HOMEPAGE_IMAGE_REQUIRED",
    );
  }

  const targetConfig =
    getImageTarget(target);

  const homepage =
    await getOrCreateHomepage({
      userId: actorUserId,
    });

  const previousImage =
    getExistingImage(homepage, target);

  const uploadedImage =
    await uploadHomepageImageToCloudinary({
      env,
      file,
      folder: targetConfig.folder,
    });

  homepage.set(
    targetConfig.path,
    {
      publicId:
        uploadedImage.publicId,

      secureUrl:
        uploadedImage.secureUrl,

      alt:
        typeof alt === "string"
          ? alt.trim()
          : "",

      width:
        uploadedImage.width ?? null,

      height:
        uploadedImage.height ?? null,

      format:
        uploadedImage.format ?? null,

      bytes:
        uploadedImage.bytes ?? null,
    },
  );

  homepage.updatedBy =
    actorUserId;

  try {
    await homepage.save();
  } catch (error) {
    try {
      await deleteHomepageImageFromCloudinary({
        env,
        publicId:
          uploadedImage.publicId,
      });
    } catch {
      // Preserve the original database failure.
    }

    throw error;
  }

  if (
    previousImage?.publicId &&
    previousImage.publicId !==
      uploadedImage.publicId
  ) {
    await deleteHomepageImageFromCloudinary({
      env,
      publicId:
        previousImage.publicId,
    });
  }

  return homepage;
};

export const removeHomepageImage = async ({
  env,
  actorUserId,
  target,
}) => {
  const targetConfig =
    getImageTarget(target);

  const homepage =
    await getOrCreateHomepage({
      userId: actorUserId,
    });

  const previousImage =
    getExistingImage(homepage, target);

  if (!previousImage?.publicId) {
    homepage.set(
      targetConfig.path,
      null,
    );

    homepage.updatedBy =
      actorUserId;

    await homepage.save();

    return homepage;
  }

  const previousPublicId =
    previousImage.publicId;

  homepage.set(
    targetConfig.path,
    null,
  );

  homepage.updatedBy =
    actorUserId;

  await homepage.save();

  await deleteHomepageImageFromCloudinary({
    env,
    publicId:
      previousPublicId,
  });

  return homepage;
};