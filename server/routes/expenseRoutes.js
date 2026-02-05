const express = require("express");
const { protect, restrictTo } = require("../controllers/authController");
const { getUserAllExpense } = require("../controllers/expenseController");

const router = express.Router();

router.route("/").get(protect, restrictTo("user"), getUserAllExpense);

module.exports = router;
