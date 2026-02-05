const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const db = require("../db/pool");
const APIFeatures = require("../utils/APIFeatures");

const getUserAllExpense = catchAsync(async (req, res, next) => {
  //1 Take user id from req.user
  const { id } = req.user;

  const filterObj = new APIFeatures(req.query).filter();
  const filters = [];
  const params = [id];
  Object.entries(filterObj.queryString).forEach(([key, value]) => {
    params.push(value);
    filters.push(`${key} = $${params.length}`);
  });

  const data = await db.query(
    `SELECT
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
    WHERE e.user_id = $1
        ${filters.length ? `AND ${filters.join(" AND ")}` : ""} ;`,
    params,
  );

  res.status(200).json({
    status: "success",
    count: data.rowCount,
    data: {
      expenses: data.rows,
    },
  });
});

module.exports = { getUserAllExpense };
