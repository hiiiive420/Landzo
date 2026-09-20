import { v2 as cloudinary } from "cloudinary";

export const isCloudinaryConfigured = (env) =>
  Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

export const configureCloudinary = (env) => {
  if (!isCloudinaryConfigured(env)) {
    return false;
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return true;
};

export default cloudinary;
