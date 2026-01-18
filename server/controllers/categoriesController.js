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

const createCategory = catchAsync(async (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is not yet defined",
  });
});

const getCategory = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is not yet defined",
  });
};

const updateCategory = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is not yet defined",
  });
};

const deletCategory = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is not yet defined",
  });
};

module.exports = {
  getAllCategory,
  updateCategory,
  deletCategory,
  getCategory,
  createCategory,
};
