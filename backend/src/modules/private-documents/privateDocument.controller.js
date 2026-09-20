import { successResponse } from "../../common/responses/apiResponse.js";

import {
  serializePrivateDocument,
  serializePrivateDocumentList,
} from "./privateDocument.serializer.js";
import {
  createPrivateDocument,
  createPrivateDocumentAccess,
  deletePrivateDocument,
  getPrivateDocument,
  listPrivateDocuments,
  replacePrivateDocumentFile,
  updatePrivateDocumentMetadata,
} from "./privateDocument.service.js";

export const createPrivateDocumentHandler = (env) => async (req, res, next) => {
  try {
    const created = await createPrivateDocument({
      env,
      actorUserId: req.user.id,
      input: req.validated.body,
      file: req.file,
    });

    const document = await getPrivateDocument(created._id);

    res.status(201).json(
      successResponse({
        message: "Private document uploaded",
        data: serializePrivateDocument(document),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const listPrivateDocumentsHandler = async (req, res, next) => {
  try {
    const result = await listPrivateDocuments(req.validated.query);
    const serialized = serializePrivateDocumentList(result);

    res.status(200).json(
      successResponse({
        message: "Private documents retrieved",
        data: serialized.data,
        meta: serialized.meta,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const getPrivateDocumentHandler = async (req, res, next) => {
  try {
    const document = await getPrivateDocument(req.validated.params.documentId);

    res.status(200).json(
      successResponse({
        message: "Private document retrieved",
        data: serializePrivateDocument(document),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const accessPrivateDocumentHandler = (env) => async (req, res, next) => {
  try {
    const access = await createPrivateDocumentAccess({
      env,
      actorUserId: req.user.id,
      documentId: req.validated.params.documentId,
      attachment: req.validated.query.attachment,
    });

    res.status(200).json(
      successResponse({
        message: "Private document access URL generated",
        data: access,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const updatePrivateDocumentMetadataHandler = async (req, res, next) => {
  try {
    const updated = await updatePrivateDocumentMetadata({
      actorUserId: req.user.id,
      documentId: req.validated.params.documentId,
      input: req.validated.body,
    });

    const document = await getPrivateDocument(updated._id);

    res.status(200).json(
      successResponse({
        message: "Private document updated",
        data: serializePrivateDocument(document),
      }),
    );
  } catch (error) {
    next(error);
  }
};
export const replacePrivateDocumentFileHandler = (env) => async (req, res, next) => {
  try {
    const replaced = await replacePrivateDocumentFile({
      env,
      actorUserId: req.user.id,
      documentId: req.validated.params.documentId,
      file: req.file,
    });

    const document = await getPrivateDocument(replaced._id);

    res.status(200).json(
      successResponse({
        message: "Private document file replaced",
        data: serializePrivateDocument(document),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const deletePrivateDocumentHandler = (env) => async (req, res, next) => {
  try {
    const deleted = await deletePrivateDocument({
      env,
      actorUserId: req.user.id,
      documentId: req.validated.params.documentId,
    });

    const document = await getPrivateDocument(deleted._id, {
      includeDeleted: true,
    });

    res.status(200).json(
      successResponse({
        message: "Private document deleted",
        data: serializePrivateDocument(document),
      }),
    );
  } catch (error) {
    next(error);
  }
};