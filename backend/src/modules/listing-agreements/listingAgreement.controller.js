import { successResponse } from "../../common/responses/apiResponse.js";
import {
  generateListingAgreement,
  getLatestListingAgreement,
  getListingAgreementById,
  listListingAgreements,
} from "./listingAgreement.service.js";

export const listListingAgreementsHandler = async (req, res, next) => {
  try {
    const result = await listListingAgreements({ query: req.validated.query });
    res.status(200).json(
      successResponse({
        message: "Listing agreements retrieved",
        data: result.data,
        meta: result.meta,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const getLatestListingAgreementHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Listing agreement retrieved",
        data: await getLatestListingAgreement({
          propertyId: req.validated.params.propertyId,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const getListingAgreementByIdHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Listing agreement retrieved",
        data: await getListingAgreementById(req.validated.params),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const generateListingAgreementHandler = async (req, res, next) => {
  try {
    res.status(201).json(
      successResponse({
        message: "Listing agreement generated",
        data: await generateListingAgreement({
          actorUserId: req.auth.userId,
          propertyId: req.validated.params.propertyId,
          input: req.validated.body,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};
