const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const db = require("../db/pool");

const getAllCategory = catchAsync(async (req, res) => {
  const categories = await db.query("SELECT * FROM categories");

  res.status(200).json({
    status: "success",
    count: categories.rowCount,
    data: {
      categories: categories.rows,
    },
  });
});

const createCategory = catchAsync(async (req, res, next) => {
  const { category } = req.body;

  if (!category || category.trim().length === 0) {
    return next(new AppError("Category value is mandatory", 400));
  }

  // Insert category and return the row
  const newCategory = await db.query(
    "INSERT INTO categories (category_name) VALUES ($1) RETURNING *",
    [category.trim()]
  );

  res.status(201).json({
    status: "success",
    data: {
      category: newCategory.rows[0],
    },
  });
});

const getCategory = catchAsync(async (req, res, next) => {
  const category = await db.query("SELECT * FROM categories WHERE id=$1", [
    req.params.id,
  ]);

  if (category.rows.length === 0) {
    return next(new AppError("No category found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      category: category.rows[0],
    },
  });
});

const updateCategory = catchAsync(async (req, res, next) => {
  const { category } = req.body;

  // 1) Check if category exists
  const categoryValue = await db.query(
    "SELECT * FROM categories WHERE id = $1",
    [req.params.id]
  );

  if (categoryValue.rows.length === 0) {
    return next(new AppError("No category found with that ID", 404));
  }

  // 2) Validate input
  if (!category || category.trim().length === 0) {
    return next(new AppError("Category value is mandatory", 400));
  }

  // 3) Update
  const newCategory = await db.query(
    "UPDATE categories SET category_name = $1 WHERE id = $2 RETURNING *",
    [category.trim(), req.params.id]
  );

  res.status(200).json({
    status: "success",
    data: {
      category: newCategory.rows[0],
    },
  });
});

const deleteCategory = catchAsync(async (req, res, next) => {
  const category = await db.query("SELECT * FROM categories WHERE id=$1", [
    req.params.id,
  ]);

  if (category.rows.length === 0) {
    return next(new AppError("No category found with that ID", 404));
  }

  await db.query("DELETE FROM categories WHERE id=$1", [req.params.id]);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

module.exports = {
  getAllCategory,
  updateCategory,
  deleteCategory,
  getCategory,
  createCategory,
};
