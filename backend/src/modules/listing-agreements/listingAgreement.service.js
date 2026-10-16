import { AppError } from "../../common/errors/AppError.js";
import { Property } from "../properties/property.model.js";
import { ListingAgreement, ListingAgreementCounter } from "./listingAgreement.model.js";
import {
  serializeListingAgreement,
  serializeListingAgreementListItem,
} from "./listingAgreement.serializer.js";

const propertyNotFound = () => new AppError(404, "Property not found", "PROPERTY_NOT_FOUND");

const toUtcDate = (value) => new Date(`${value}T00:00:00.000Z`);

const getExpiryDate = ({ commencementDate, exclusivePeriodDays }) => {
  const expiryDate = toUtcDate(commencementDate);
  expiryDate.setUTCDate(expiryDate.getUTCDate() + exclusivePeriodDays);
  return expiryDate;
};

const generateAgreementSerial = async (year) => {
  const counter = await ListingAgreementCounter.findOneAndUpdate(
    { year },
    { $inc: { sequence: 1 } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
  );

  if (!counter?.sequence) {
    throw new AppError(
      500,
      "Listing agreement serial generation failed",
      "LISTING_AGREEMENT_SERIAL_FAILED",
    );
  }

  return `LZO-AGR-${year}-${String(counter.sequence).padStart(6, "0")}`;
};

const getPropertyOrFail = async (propertyId) => {
  const property = await Property.findOne({ _id: propertyId, deletedAt: null }).populate([
    { path: "province", select: "name" },
    { path: "district", select: "name" },
    { path: "city", select: "name" },
    { path: "area", select: "name" },
  ]);

  if (!property) {
    throw propertyNotFound();
  }

  return property;
};

export const getLatestListingAgreement = async ({ propertyId }) => {
  await getPropertyOrFail(propertyId);
  const agreement = await ListingAgreement.findOne({ propertyId }).sort({ createdAt: -1 });
  return agreement ? serializeListingAgreement(agreement) : null;
};

export const listListingAgreements = async ({ query }) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.search) {
    const escapedSearch = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const search = new RegExp(escapedSearch, "i");
    filter.$or = [
      { serialNumber: search },
      { propertyCode: search },
      { "seller1.fullName": search },
      { "seller2.fullName": search },
    ];
  }

  const [agreements, total] = await Promise.all([
    ListingAgreement.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ListingAgreement.countDocuments(filter),
  ]);

  return {
    data: agreements.map(serializeListingAgreementListItem),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

export const getListingAgreementById = async ({ propertyId, agreementId }) => {
  await getPropertyOrFail(propertyId);
  const agreement = await ListingAgreement.findOne({ _id: agreementId, propertyId });

  if (!agreement) {
    throw new AppError(
      404,
      "Listing agreement not found",
      "LISTING_AGREEMENT_NOT_FOUND",
    );
  }

  return serializeListingAgreement(agreement);
};

export const generateListingAgreement = async ({ actorUserId, propertyId, input }) => {
  const property = await getPropertyOrFail(propertyId);
  const agreementDate = toUtcDate(input.agreementDate);
  const commencementDate = toUtcDate(input.commencementDate);
  const expiryDate = getExpiryDate({
    commencementDate: input.commencementDate,
    exclusivePeriodDays: input.exclusivePeriodDays,
  });
  const serialNumber = await generateAgreementSerial(agreementDate.getUTCFullYear());
  const agreement = await ListingAgreement.create({
    ...input,
    serialNumber,
    propertyId: property._id,
    propertyCode: property.code,
    propertyType: property.type,
    agreementDate,
    commencementDate,
    expiryDate,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });

  return serializeListingAgreement(agreement);
};
