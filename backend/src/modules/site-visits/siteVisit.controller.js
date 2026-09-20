import { successResponse } from "../../common/responses/apiResponse.js";
import {
  cancelSiteVisit,
  completeSiteVisit,
  createSiteVisit,
  getSiteVisit,
  listSiteVisitAssignees,
  listSiteVisitPropertyOptions,
  listSiteVisits,
  markSiteVisitNoShow,
  updateSiteVisit,
} from "./siteVisit.service.js";
import { listCustomerOptions } from "../customers/customer.service.js";

export const listSiteVisitsHandler = async (req, res, next) => {
  try {
    const result = await listSiteVisits(req.validated.query);
    res.status(200).json(successResponse({ message: "Site visits retrieved", data: result.data, meta: result.meta }));
  } catch (error) {
    next(error);
  }
};

export const listSiteVisitAssigneesHandler = async (_req, res, next) => {
  try {
    const assignees = await listSiteVisitAssignees();
    res.status(200).json(successResponse({ message: "Site visit assignees retrieved", data: assignees }));
  } catch (error) {
    next(error);
  }
};

export const listSiteVisitPropertyOptionsHandler = async (req, res, next) => {
  try {
    const properties = await listSiteVisitPropertyOptions(req.validated.query);
    res.status(200).json(successResponse({ message: "Site visit property options retrieved", data: properties }));
  } catch (error) {
    next(error);
  }
};

export const listSiteVisitCustomerOptionsHandler = async (req, res, next) => {
  try {
    const customers = await listCustomerOptions(req.validated.query);
    res.status(200).json(successResponse({ message: "Site visit customer options retrieved", data: customers }));
  } catch (error) {
    next(error);
  }
};

export const getSiteVisitHandler = async (req, res, next) => {
  try {
    const siteVisit = await getSiteVisit(req.validated.params.siteVisitId);
    res.status(200).json(successResponse({ message: "Site visit retrieved", data: siteVisit }));
  } catch (error) {
    next(error);
  }
};

export const createSiteVisitHandler = async (req, res, next) => {
  try {
    const siteVisit = await createSiteVisit({ payload: req.validated.body, actorUserId: req.auth.userId });
    res.status(201).json(successResponse({ message: "Site visit created", data: siteVisit }));
  } catch (error) {
    next(error);
  }
};

export const updateSiteVisitHandler = async (req, res, next) => {
  try {
    const siteVisit = await updateSiteVisit({
      siteVisitId: req.validated.params.siteVisitId,
      payload: req.validated.body,
      actorUserId: req.auth.userId,
    });
    res.status(200).json(successResponse({ message: "Site visit updated", data: siteVisit }));
  } catch (error) {
    next(error);
  }
};

export const completeSiteVisitHandler = async (req, res, next) => {
  try {
    const siteVisit = await completeSiteVisit({
      siteVisitId: req.validated.params.siteVisitId,
      completionNote: req.validated.body.completionNote,
      actorUserId: req.auth.userId,
    });
    res.status(200).json(successResponse({ message: "Site visit completed", data: siteVisit }));
  } catch (error) {
    next(error);
  }
};

export const cancelSiteVisitHandler = async (req, res, next) => {
  try {
    const siteVisit = await cancelSiteVisit({
      siteVisitId: req.validated.params.siteVisitId,
      cancellationReason: req.validated.body.cancellationReason,
      actorUserId: req.auth.userId,
    });
    res.status(200).json(successResponse({ message: "Site visit cancelled", data: siteVisit }));
  } catch (error) {
    next(error);
  }
};

export const markSiteVisitNoShowHandler = async (req, res, next) => {
  try {
    const siteVisit = await markSiteVisitNoShow({
      siteVisitId: req.validated.params.siteVisitId,
      actorUserId: req.auth.userId,
    });
    res.status(200).json(successResponse({ message: "Site visit marked no-show", data: siteVisit }));
  } catch (error) {
    next(error);
  }
};