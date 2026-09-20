import mongoose from "mongoose";

import { DEFAULT_SETTINGS, SETTINGS_LIMITS, SETTINGS_SINGLETON_KEY } from "./settings.constants.js";

const { Schema } = mongoose;

const businessSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: SETTINGS_LIMITS.businessNameMaxLength,
      default: DEFAULT_SETTINGS.business.name,
    },
    email: {
      type: String,
      trim: true,
      maxlength: SETTINGS_LIMITS.businessEmailMaxLength,
      default: DEFAULT_SETTINGS.business.email,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: SETTINGS_LIMITS.businessPhoneMaxLength,
      default: DEFAULT_SETTINGS.business.phone,
    },
    whatsapp: {
      type: String,
      trim: true,
      maxlength: SETTINGS_LIMITS.businessWhatsappMaxLength,
      default: DEFAULT_SETTINGS.business.whatsapp,
    },
    address: {
      type: String,
      trim: true,
      maxlength: SETTINGS_LIMITS.businessAddressMaxLength,
      default: DEFAULT_SETTINGS.business.address,
    },
  },
  { _id: false },
);

const socialSchema = new Schema(
  {
    facebook: {
      type: String,
      trim: true,
      maxlength: SETTINGS_LIMITS.socialUrlMaxLength,
      default: DEFAULT_SETTINGS.social.facebook,
    },
    instagram: {
      type: String,
      trim: true,
      maxlength: SETTINGS_LIMITS.socialUrlMaxLength,
      default: DEFAULT_SETTINGS.social.instagram,
    },
    linkedin: {
      type: String,
      trim: true,
      maxlength: SETTINGS_LIMITS.socialUrlMaxLength,
      default: DEFAULT_SETTINGS.social.linkedin,
    },
    youtube: {
      type: String,
      trim: true,
      maxlength: SETTINGS_LIMITS.socialUrlMaxLength,
      default: DEFAULT_SETTINGS.social.youtube,
    },
  },
  { _id: false },
);

const websiteSchema = new Schema(
  {
    defaultMetaTitle: {
      type: String,
      trim: true,
      maxlength: SETTINGS_LIMITS.defaultMetaTitleMaxLength,
      default: DEFAULT_SETTINGS.website.defaultMetaTitle,
    },
    defaultMetaDescription: {
      type: String,
      trim: true,
      maxlength: SETTINGS_LIMITS.defaultMetaDescriptionMaxLength,
      default: DEFAULT_SETTINGS.website.defaultMetaDescription,
    },
  },
  { _id: false },
);

const settingsSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: SETTINGS_SINGLETON_KEY,
    },
    business: {
      type: businessSchema,
      default: () => ({ ...DEFAULT_SETTINGS.business }),
    },
    social: {
      type: socialSchema,
      default: () => ({ ...DEFAULT_SETTINGS.social }),
    },
    website: {
      type: websiteSchema,
      default: () => ({ ...DEFAULT_SETTINGS.website }),
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);