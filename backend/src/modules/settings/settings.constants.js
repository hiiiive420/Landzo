export const SETTINGS_SINGLETON_KEY = "global";

export const SETTINGS_LIMITS = Object.freeze({
  businessNameMaxLength: 160,
  businessEmailMaxLength: 254,
  businessPhoneMaxLength: 40,
  businessWhatsappMaxLength: 40,
  businessAddressMaxLength: 500,
  socialUrlMaxLength: 500,
  defaultMetaTitleMaxLength: 180,
  defaultMetaDescriptionMaxLength: 500,
});

export const DEFAULT_SETTINGS = Object.freeze({
  business: Object.freeze({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    address: "",
  }),
  social: Object.freeze({
    facebook: "",
    instagram: "",
    linkedin: "",
    youtube: "",
  }),
  website: Object.freeze({
    defaultMetaTitle: "",
    defaultMetaDescription: "",
  }),
});