const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const db = require("../db/pool");
const APIFeatures = require("../utils/APIFeatures");
const {
  validatePagination,
  validateExpenseType,
  validateDate,
  validateAmount,
} = require("../utils/validateQuery");

const getUserAllExpense = catchAsync(async (req, res, next) => {
  // STEP 1 — identify the current user
  const { id } = req.user;

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  // VALIDATION CALLS
  validatePagination(page, limit);
  validateExpenseType(req.query.expense_type);
  validateDate(req.query.expense_date);
  validateAmount(req.query.amount);

  // STEP 2 — map request fields to joined table columns and base FROM clause
  const columnMap = {
    amount: "e.amount",
    expense_type: "e.expense_type",
    expense_date: "e.expense_date",

    category_name: "c.category_name",
    category_id: "c.id",

    first_name: "u.first_name",
    last_name: "u.last_name",
  };

  const baseFromQuery = `
    FROM expenses e
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN categories c ON e.category_id = c.id
  `;

  // STEP 3 — configure API features (filtering, sorting, pagination)
  const features = new APIFeatures(req.query, {
    columnMap,
    defaultSort: "e.expense_date DESC",
  })
    .addBaseFilter("e.user_id", id)
    .search(["description"])
    .filter([
      "amount",
      "expense_type",
      "expense_date",
      "category_id",
      "category_name",
    ])
    .sorts(["amount", "expense_date", "category_name"])
    .pagination();

  // STEP 4 — build the SELECT statement with joins
  const { query, params } = features.buildQuery(`
  SELECT
        e.id,
        u.first_name,
        u.last_name,
        e.description,
        e.amount,
        e.expense_type,
        c.category_name,
        e.expense_date,
        e.updated_at
    ${baseFromQuery}
`);

  // STEP 5 — build a parallel count query for pagination
  const { query: countQuery, params: countParams } =
    features.buildCountQuery(baseFromQuery);

  // STEP 6 — run both data and count queries
  const [dataResult, countResult] = await Promise.all([
    db.query(query, params),
    db.query(countQuery, countParams),
  ]);

  // STEP 7 — compute pagination metadata
  const totalRecords = Number(countResult.rows[0].count);
  const totalPages =
    totalRecords === 0 ? 1 : Math.ceil(totalRecords / features.limit);

  if (features.page > totalPages && totalRecords > 0) {
    return next(new AppError("Page number exceeds total pages", 400));
  }

  if (totalRecords === 0) {
    return res.status(200).json({
      status: "success",
      message: "No expenses found",
      pagination: {
        totalRecords,
        totalPages,
        currentPage: features.page,
        limit: features.limit,
        hasNextPage: features.page < totalPages,
        hasPrevPage: features.page > 1,
        isFirstPage: features.page === 1,
        isLastPage: features.page >= totalPages,
      },
      data: { expenses: [] },
    });
  }

  // STEP 8 — format and send response
  res.status(200).json({
    status: "success",

    pagination: {
      totalRecords,
      totalPages,
      currentPage: features.page,
      limit: features.limit,
      hasNextPage: features.page < totalPages,
      hasPrevPage: features.page > 1,
      isFirstPage: features.page === 1,
      isLastPage: features.page >= totalPages,
    },

    results: dataResult.rowCount,

    data: {
      expenses: dataResult.rows,
    },
  });
});

module.exports = { getUserAllExpense };
