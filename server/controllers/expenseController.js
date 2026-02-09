const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const db = require("../db/pool");
const APIFeatures = require("../utils/APIFeatures");

const getUserAllExpense = catchAsync(async (req, res, next) => {
  //1 Take user id from req.user
  const { id } = req.user;

  const columnMap = {
    amount: "e.amount",
    expense_type: "e.expense_type",
    expense_date: "e.expense_date",

    category_name: "c.category_name",
    category_id: "c.id",

    first_name: "u.first_name",
    last_name: "u.last_name",
  };

  const features = new APIFeatures(req.query, {
    columnMap,
    defaultSort: "u.expense_date DESC",
  })
    .addBaseFilter("e.user_id", req.user.id)
    .filter([
      "amount",
      "expense_type",
      "expense_date",
      "category_id",
      "category_name",
    ])
    .sorts(["amount", "expense_date", "category_name"]);

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
    FROM
        expenses as e
        LEFT JOIN users as u on e.user_id = u.id
        LEFT JOIN categories as c on e.category_id = c.id
`);

  const data = await db.query(query, params);

  res.status(200).json({
    status: "success",
    count: data.rowCount,
    data: {
      expenses: data.rows,
    },
  });
});

module.exports = { getUserAllExpense };
