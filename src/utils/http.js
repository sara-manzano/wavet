function getDuplicateFieldLabel(error) {
  const duplicateField = Object.keys(error?.keyPattern || {})[0] || Object.keys(error?.keyValue || {})[0];

  if (!duplicateField) {
    return null;
  }

  return duplicateField;
}

function buildErrorResponse(error) {
  if (error?.code === 11000) {
    const duplicateField = getDuplicateFieldLabel(error);

    return {
      status: 409,
      message: duplicateField
        ? `A record with that ${duplicateField} already exists.`
        : 'A record with a duplicate unique value already exists.',
    };
  }

  if (error?.name === 'ValidationError') {
    const details = Object.values(error.errors || {})
      .map((item) => item.message)
      .filter(Boolean)
      .join(' ');

    return {
      status: 400,
      message: details || 'The request contains invalid data.',
    };
  }

  if (error?.name === 'CastError') {
    return {
      status: 400,
      message: `Field ${error.path} is not valid.`,
    };
  }

  return {
    status: 500,
    message: 'An internal server error occurred.',
  };
}

function sendRouteError(res, error) {
  const { status, message } = buildErrorResponse(error);
  return res.status(status).json({ message });
}

module.exports = {
  buildErrorResponse,
  sendRouteError,
};