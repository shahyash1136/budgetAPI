const bcrypt = require("bcryptjs");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const validator = require("validator");
const db = require("../db/pool");
const { signToken } = require("../utils/signToken");

const signup = catchAsync(async (req, res, next) => {
  // Step 1 ) Read the values from body.
  const { first_name, last_name, username, email, password } = req.body;

  // Step 2) Validate the values which are mandatory
  const usernameVal = (username || "").trim();
  const emailVal = (email || "").trim();
  const passwordVal = (password || "").trim();
  const firstNameVal = (first_name || "").trim();
  const lastNameVal = (last_name || "").trim();

  if (
    validator.isEmpty(usernameVal) ||
    validator.isEmpty(emailVal) ||
    validator.isEmpty(passwordVal)
  ) {
    return next(
      new AppError("Username, Email and Password are mandatory", 400)
    );
  }

  if (!validator.isEmail(emailVal)) {
    return next(new AppError("The email address format is invalid", 400));
  }

  if (!validator.isStrongPassword(passwordVal)) {
    return next(new AppError(`Password doesn’t meet requirements`, 422));
  }

  // Step 3) Bcrypt the Password to store it in DB.
  const hashedPassword = await bcrypt.hash(passwordVal, 12);

  // Step 4) Check if username or email already exisit in the db.
  const existingUser = await db.query(
    "SELECT id FROM users WHERE username=$1 OR email=$2",
    [usernameVal, emailVal]
  );

  if (existingUser.rows.length > 0) {
    return next(new AppError("Username or email already exists", 409));
  }

  // Step 5) Insert User into the DB
  const newUser = await db.query(
    "INSERT into users (first_name,last_name,username,email,password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [firstNameVal, lastNameVal, usernameVal, emailVal, hashedPassword]
  );

  const user = newUser.rows[0];

  //Step 6) Save JWT_SECRET and JWT_EXPIRES_IN config.env file

  //Step 7) Create a SignToken function.

  //Step 8) Generate a token
  const token = signToken(user.id, user.role);

  //Step 9) Send Response to the user
  res.status(201).json({
    status: "success",
    token,
    data: {
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    },
  });
});

const login = (req, res, next) => {
  const { email, password } = req.body;
  const emailVal = (email || "").trim();
  const passwordVal = (password || "").trim();

  if (validator.isEmpty(emailVal) || validator.isEmpty(passwordVal)) {
    return next(new AppError("Email and Password are mandatory", 400));
  }

  if (!validator.isEmail(email.trim())) {
    return next(new AppError("The email address format is invalid", 400));
  }

  console.log({
    user: {
      email,
      password,
    },
  });

  res.status(501).json({
    status: "error",
    message: "This route is not yet defined",
  });
};

module.exports = { signup, login };
