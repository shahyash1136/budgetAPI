const AppError = require("./appError");

const validatePagination = (page, limit) => {
  if (page && (isNaN(page) || page < 1)) {
    throw new AppError("Page must be a number greater then 0", 400);
  }

  if (limit && (isNaN(limit) || limit < 1 || limit > 100)) {
    throw new AppError("Limit must be between 1 and 50", 400);
  }
};

const validateExpenseType = (type) => {
  if (!type) return;

  const allowed = ["inc", "exp"];
  if (!allowed.includes(type)) {
    throw new AppError("Invalid expense_type. Use inc or exp", 400);
  }
};

const validateDate = (date) => {
  if (!date) return;

  const isValidDate = (d) => {
    return !isNaN(Date.parse(d));
  };

  // ⭐ CASE 1 — Simple date
  if (typeof date === "string") {
    if (!isValidDate(date)) {
      throw new AppError("Invalid date format", 400);
    }
  }

  // ⭐ CASE 2 — Advanced filter object
  if (typeof date === "object") {
    Object.values(date).forEach((val) => {
      // between case → "2025-01-01,2025-02-01"
      if (typeof val === "string" && val.includes(",")) {
        const [start, end] = val.split(",");

        if (!isValidDate(start) || !isValidDate(end)) {
          throw new AppError("Invalid date range format", 400);
        }
      } else {
        if (!isValidDate(val)) {
          throw new AppError("Invalid date format", 400);
        }
      }
    });
  }
};

const validateAmount = (amount) => {
  if (!amount) return;

  // ⭐ CASE 1 — Simple filter
  if (typeof amount === "string" || typeof amount === "number") {
    if (isNaN(Number(amount))) {
      throw new AppError("Amount must be a number", 400);
    }
  }

  // ⭐ CASE 2 — Advanced filter object
  if (typeof amount === "object") {
    Object.values(amount).forEach((val) => {
      // between case → "100,500"
      if (typeof val === "string" && val.includes(",")) {
        const [min, max] = val.split(",");

        if (isNaN(Number(min)) || isNaN(Number(max))) {
          throw new AppError("Amount range must be numbers", 400);
        }
      } else {
        if (isNaN(Number(val))) {
          throw new AppError("Amount must be a number", 400);
        }
      }
    });
  }
};

module.exports = {
  validatePagination,
  validateAmount,
  validateDate,
  validateExpenseType,
};
