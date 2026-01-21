const { promisify } = require("util");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
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

const login = catchAsync(async (req, res, next) => {
  // Step 1) Read the values from body.
  const { email, password } = req.body;

  // Step 2) Validate the values which are mandatory
  const emailVal = (email || "").trim();
  const passwordVal = (password || "").trim();

  if (validator.isEmpty(emailVal) || validator.isEmpty(passwordVal)) {
    return next(new AppError("Email and Password are mandatory", 400));
  }

  if (!validator.isEmail(emailVal)) {
    return next(new AppError("The email address format is invalid", 400));
  }

  // Step 3) Check if user exisit in the db.
  const user = await db.query("SELECT * FROM users WHERE email=$1", [emailVal]);

  if (user.rows.length === 0) {
    return next(new AppError("Invalid email or password", 401));
  }

  const userData = user.rows[0];

  const isValid = await bcrypt.compare(passwordVal, userData.password_hash);

  if (!isValid) {
    return next(new AppError("Invalid email or password", 401));
  }

  const token = signToken(userData.id, userData.role);

  res.status(200).json({
    status: "success",
    token,
    data: {
      user: {
        id: userData.id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        username: userData.username,
        email: userData.email,
        role: userData.role,
      },
    },
  });
});

const protect = catchAsync(async (req, res, next) => {
  // Step 1) Get token from Authorization header and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Step 2) If token does not exist, return unauthorized error
  if (!token) {
    return next(new AppError("Please log in to access this resource", 401));
  }

  // Step 3) Verify the token using JWT_SECRET
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // Step 4) Find the user in database using decoded id
  const freshUser = await db.query("SELECT * FROM users WHERE id=$1", [
    decoded.id,
  ]);

  if (freshUser.rows.length === 0) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }

  // Step 5) Check if user account is active
  if (!freshUser.rows[0].is_active) {
    return next(new AppError("User account is deactivated", 401));
  }

  // Step 6) Check if user changed password after token was issued
  if (freshUser.rows[0].password_changed_at) {
    const changedTimestamp = Math.floor(
      freshUser.rows[0].password_changed_at.getTime() / 1000
    );

    if (changedTimestamp > decoded.iat) {
      return next(
        new AppError(
          "User recently changed password! Please log in again.",
          401
        )
      );
    }
  }

  // Step 7) Grant access by attaching user to req object
  req.user = freshUser.rows[0];

  // Step 8) Call next() to move to protected route
  next();
});


module.exports = { signup, login, protect };
