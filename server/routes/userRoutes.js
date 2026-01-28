const express = require("express");
const {
  signup,
  login,
  protect,
  updatePassword,
  forgotpassword,
  resetPassword,
} = require("../controllers/authController");
const { usersDetails, updateUser } = require("../controllers/userController");
const { uploadUserPhoto } = require("../utils/multer");
const resizeUserPhoto = require("../utils/resizeUserPhoto");

const userRouter = express.Router();

userRouter.post("/signup", signup);
userRouter.post("/login", login);

//Password Routes
userRouter.patch("/updateMyPassword", protect, updatePassword);
userRouter.post("/forgotpassword", forgotpassword);
userRouter.patch("/reset-password", resetPassword);

userRouter.get("/me", protect, usersDetails);
userRouter.patch(
  "update-me",
  protect,
  uploadUserPhoto,
  resizeUserPhoto,
  updateUser
);
userRouter.delete("deactivate-me", protect, (req, res, next) => {});

module.exports = userRouter;
