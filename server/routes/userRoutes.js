const express = require("express");
const {
  signup,
  login,
  protect,
  updatePassword,
} = require("../controllers/authController");

const userRouter = express.Router();

userRouter.post("/signup", signup);
userRouter.post("/login", login);

//Password Routes
userRouter.patch("/updateMyPassword", protect, updatePassword);

module.exports = userRouter;
