import { AppError } from "../../common/errors/AppError.js";
import cloudinary, {
  configureCloudinary,
} from "../../config/cloudinary.js";

const cloudinaryUnavailable = () =>
  new AppError(
    503,
    "Cloudinary is not configured",
    "CLOUDINARY_NOT_CONFIGURED",
  );

const cloudinaryUploadFailed = () =>
  new AppError(
    502,
    "Cloudinary image upload failed",
    "CLOUDINARY_UPLOAD_FAILED",
  );

const cloudinaryDeleteFailed = () =>
  new AppError(
    502,
    "Cloudinary image deletion failed",
    "CLOUDINARY_DELETE_FAILED",
  );

export const BLOG_IMAGE_UPLOAD_TRANSFORMATION =
  Object.freeze({
    width: 2560,
    height: 2560,
    crop: "limit",
    quality: "auto",
  });

const uploadBuffer = ({
  buffer,
  folder,
  originalFilename,
}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        format: "webp",
        resource_type: "image",
        transformation: [
          BLOG_IMAGE_UPLOAD_TRANSFORMATION,
        ],
        use_filename: false,
        unique_filename: true,
        overwrite: false,
        context: originalFilename
          ? {
              original_filename:
                originalFilename,
            }
          : undefined,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );

    stream.end(buffer);
  });

export const uploadBlogImageToCloudinary = async ({
  env,
  file,
  folder,
}) => {
  if (!configureCloudinary(env)) {
    throw cloudinaryUnavailable();
  }

  try {
    const result = await uploadBuffer({
      buffer: file.buffer,
      folder,
      originalFilename: file.originalname,
    });

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  } catch {
    throw cloudinaryUploadFailed();
  }
};

export const deleteBlogImageFromCloudinary =
  async ({ env, publicId }) => {
    if (!publicId) {
      return;
    }

    if (!configureCloudinary(env)) {
      throw cloudinaryUnavailable();
    }

    try {
      const result =
        await cloudinary.uploader.destroy(
          publicId,
          {
            invalidate: true,
            resource_type: "image",
          },
        );

      const successfulDeleteResults = [
        "ok",
        "not found",
      ];

      if (
        !successfulDeleteResults.includes(
          result?.result,
        )
      ) {
        throw cloudinaryDeleteFailed();
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw cloudinaryDeleteFailed();
    }
  };

export const deleteBlogImagesFromCloudinary =
  async ({ env, publicIds = [] }) => {
    const uniquePublicIds = [
      ...new Set(
        publicIds.filter(Boolean),
      ),
    ];

    for (const publicId of uniquePublicIds) {
      await deleteBlogImageFromCloudinary({
        env,
        publicId,
      });
    }
  };