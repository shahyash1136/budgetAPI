const express = require("express");
const {
  getAllCategory,
  createCategory,
  getCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoriesController");

const router = express.Router();

router.route("/").get(getAllCategory).post(createCategory);

router
  .route("/:id")
  .get(getCategory)
  .patch(updateCategory)
  .delete(deleteCategory);

module.exports = router;
