const AppError = require("../utils/appError");

const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    status: err.status || "error",
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    // Trusted error: send to client
    res.status(err.statusCode || 500).json({
      status: err.status || "error",
      message: err.message || "Something went wrong!",
    });
  } else {
    // Programming or unknown error
    console.error("ERROR ⛔", err);
    res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.detail.match(/=\((.*?)\)/)[1];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 409);
};

// Global error handling middleware
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (err.code === "23505") err = handleDuplicateFieldsDB(err);

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    // Important: copy properties properly
    let error = Object.assign({}, err); // safer than {...err}
    error.message = err.message;
    sendErrorProd(error, res);
  }
};
