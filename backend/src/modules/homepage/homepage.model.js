import mongoose from "mongoose";

import { HOMEPAGE_SINGLETON_KEY } from "./homepage.constants.js";

const { Schema, model } = mongoose;

const homepageImageSchema = new Schema(
  {
    publicId: {
      type: String,
      trim: true,
      default: null,
    },
    secureUrl: {
      type: String,
      trim: true,
      default: null,
    },
    alt: {
      type: String,
      trim: true,
      default: "",
    },
    width: {
      type: Number,
      min: 1,
      default: null,
    },
    height: {
      type: Number,
      min: 1,
      default: null,
    },
    format: {
      type: String,
      trim: true,
      default: null,
    },
    bytes: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const ctaSchema = new Schema(
  {
    label: {
      type: String,
      trim: true,
      default: "",
    },
    link: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  },
);

const benefitSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      required: true,
    },
    iconKey: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: true,
  },
);

const statSchema = new Schema(
  {
    value: {
      type: String,
      trim: true,
      required: true,
    },
    label: {
      type: String,
      trim: true,
      required: true,
    },
  },
  {
    _id: true,
  },
);

const homepageSchema = new Schema(
  {
    singletonKey: {
      type: String,
      required: true,
      default: HOMEPAGE_SINGLETON_KEY,
      unique: true,
      immutable: true,
      index: true,
    },

    hero: {
      eyebrow: {
        type: String,
        trim: true,
        default: "",
      },
      heading: {
        type: String,
        trim: true,
        default: "",
      },
      highlight: {
        type: String,
        trim: true,
        default: "",
      },
      description: {
        type: String,
        trim: true,
        default: "",
      },
      primaryCta: {
        type: ctaSchema,
        default: () => ({}),
      },
      secondaryCta: {
        type: ctaSchema,
        default: () => ({}),
      },
      image: {
        type: homepageImageSchema,
        default: null,
      },
    },

    featuredProperties: {
      heading: {
        type: String,
        trim: true,
        default: "",
      },
      description: {
        type: String,
        trim: true,
        default: "",
      },
    },

    exploreMap: {
      heading: {
        type: String,
        trim: true,
        default: "",
      },
      description: {
        type: String,
        trim: true,
        default: "",
      },
    },

    whyLandzo: {
      heading: {
        type: String,
        trim: true,
        default: "",
      },
      description: {
        type: String,
        trim: true,
        default: "",
      },
      benefits: {
        type: [benefitSchema],
        default: [],
      },
    },

    stats: {
      heading: {
        type: String,
        trim: true,
        default: "",
      },
      items: {
        type: [statSchema],
        default: [],
      },
    },

    cta: {
      heading: {
        type: String,
        trim: true,
        default: "",
      },
      description: {
        type: String,
        trim: true,
        default: "",
      },
      button: {
        type: ctaSchema,
        default: () => ({}),
      },
      image: {
        type: homepageImageSchema,
        default: null,
      },
    },

    seo: {
      metaTitle: {
        type: String,
        trim: true,
        default: "",
      },
      metaDescription: {
        type: String,
        trim: true,
        default: "",
      },
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: "__v",
  },
);

export const Homepage =
  mongoose.models.Homepage || model("Homepage", homepageSchema);