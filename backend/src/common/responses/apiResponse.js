export const successResponse = ({
  message = "Request completed successfully",
  data,
  meta,
} = {}) => {
  const response = {
    success: true,
    message,
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (meta !== undefined) {
    response.meta = meta;
  }

  return response;
};

export const errorResponse = ({ message, code, details } = {}) => {
  const response = {
    success: false,
    message,
    code,
  };

  if (details !== undefined) {
    response.details = details;
  }

  return response;
};
