import { successResponse } from "../../common/responses/apiResponse.js";
import {
  createCustomer,
  createCustomerFromEnquiry,
  getCustomer,
  getCustomerByEnquiry,
  listCustomerAssignees,
  listCustomerOptions,
  listCustomers,
  updateCustomer,
} from "./customer.service.js";

export const listCustomersHandler = async (req, res, next) => {
  try {
    const result = await listCustomers(req.validated.query);
    res.status(200).json(successResponse({ message: "Customers retrieved", data: result.data, meta: result.meta }));
  } catch (error) {
    next(error);
  }
};

export const listCustomerAssigneesHandler = async (_req, res, next) => {
  try {
    const assignees = await listCustomerAssignees();
    res.status(200).json(successResponse({ message: "Customer assignees retrieved", data: assignees }));
  } catch (error) {
    next(error);
  }
};

export const listCustomerOptionsHandler = async (req, res, next) => {
  try {
    const customers = await listCustomerOptions(req.validated.query);
    res.status(200).json(successResponse({ message: "Customer options retrieved", data: customers }));
  } catch (error) {
    next(error);
  }
};

export const getCustomerHandler = async (req, res, next) => {
  try {
    const customer = await getCustomer(req.validated.params.customerId);
    res.status(200).json(successResponse({ message: "Customer retrieved", data: customer }));
  } catch (error) {
    next(error);
  }
};

export const createCustomerHandler = async (req, res, next) => {
  try {
    const customer = await createCustomer({ payload: req.validated.body, actorUserId: req.auth.userId });
    res.status(201).json(successResponse({ message: "Customer created", data: customer }));
  } catch (error) {
    next(error);
  }
};

export const updateCustomerHandler = async (req, res, next) => {
  try {
    const customer = await updateCustomer({
      customerId: req.validated.params.customerId,
      payload: req.validated.body,
      actorUserId: req.auth.userId,
    });
    res.status(200).json(successResponse({ message: "Customer updated", data: customer }));
  } catch (error) {
    next(error);
  }
};

export const createCustomerFromEnquiryHandler = async (req, res, next) => {
  try {
    const customer = await createCustomerFromEnquiry({
      enquiryId: req.validated.params.enquiryId,
      payload: req.validated.body,
      actorUserId: req.auth.userId,
    });
    res.status(201).json(successResponse({ message: "Customer created from enquiry", data: customer }));
  } catch (error) {
    next(error);
  }
};
export const getCustomerByEnquiryHandler = async (
  req,
  res,
  next,
) => {
  try {
    const customer = await getCustomerByEnquiry(
      req.validated.params.enquiryId,
    );

    res.status(200).json(
      successResponse({
        message: customer
          ? "Customer linked to enquiry retrieved"
          : "No customer linked to enquiry",
        data: customer,
      }),
    );
  } catch (error) {
    next(error);
  }
};