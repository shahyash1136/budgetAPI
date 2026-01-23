const express = require("express");
const {
  signup,
  login,
  protect,
  updatePassword,
  forgotpassword,
  resetPassword,
} = require("../controllers/authController");

const userRouter = express.Router();

userRouter.post("/signup", signup);
userRouter.post("/login", login);

//Password Routes
userRouter.patch("/updateMyPassword", protect, updatePassword);
userRouter.post("/forgotpassword", forgotpassword);
userRouter.patch("/reset-password", resetPassword);

module.exports = userRouter;
