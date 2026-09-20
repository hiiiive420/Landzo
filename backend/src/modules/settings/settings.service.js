import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "../audit/audit.constants.js";
import { recordAuditLog } from "../audit/audit.service.js";

import { DEFAULT_SETTINGS, SETTINGS_SINGLETON_KEY } from "./settings.constants.js";
import { Settings } from "./settings.model.js";

const STAFF_POPULATE = {
  select: "_id fullName",
};

const populateSettings = (query) =>
  query.populate({
    path: "updatedBy",
    ...STAFF_POPULATE,
  });

const defaultSettingsPayload = () => ({
  key: SETTINGS_SINGLETON_KEY,
  business: { ...DEFAULT_SETTINGS.business },
  social: { ...DEFAULT_SETTINGS.social },
  website: { ...DEFAULT_SETTINGS.website },
});

const ensureSettingsDocument = async () => {
  const settings = await Settings.findOneAndUpdate(
    { key: SETTINGS_SINGLETON_KEY },
    {
      $setOnInsert: defaultSettingsPayload(),
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  return settings;
};

const recordSettingsAudit = async ({ actorUserId, settings }) => {
  try {
    await recordAuditLog({
      actorUserId,
      action: AUDIT_ACTIONS.SETTINGS_UPDATED,
      entityType: AUDIT_ENTITY_TYPES.SETTINGS,
      entityId: settings._id,
      entityLabel: "Settings",
    });
  } catch (error) {
    console.error("Settings audit write failed", {
      action: AUDIT_ACTIONS.SETTINGS_UPDATED,
      entityType: AUDIT_ENTITY_TYPES.SETTINGS,
      errorCode: error?.code || "AUDIT_WRITE_FAILED",
    });
  }
};

const mergeNestedSection = (target, input) => {
  if (!input) {
    return;
  }

  for (const [key, value] of Object.entries(input)) {
    target[key] = value;
  }
};

export const getSettings = async () => {
  const settings = await ensureSettingsDocument();

  return populateSettings(Settings.findById(settings._id)).exec();
};

export const updateSettings = async ({ actorUserId, input }) => {
  const settings = await ensureSettingsDocument();

  mergeNestedSection(settings.business, input.business);
  mergeNestedSection(settings.social, input.social);
  mergeNestedSection(settings.website, input.website);
  settings.updatedBy = actorUserId;

  await settings.save();

  await recordSettingsAudit({ actorUserId, settings });

  return populateSettings(Settings.findById(settings._id)).exec();
};