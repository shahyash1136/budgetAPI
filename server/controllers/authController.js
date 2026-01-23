const crypto = require("crypto");
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

//1) Create a Higher-Order Function
const restrictTo = (...roles) => {
  //2) Return a middleware function
  return (req, res, next) => {
    //3) Read current user role
    const { role } = req.user;
    //4) Check Role Authorization
    if (!roles.includes(role)) {
      //5) Send Authorization Error
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    //6) Grant Access
    next();
  };
};

//STEP 0 — Error handling wrapper
const updatePassword = catchAsync(async (req, res, next) => {
  //STEP 1 — Read input from request body
  const { currentPassword, newPassword, confirmPassword } = req.body;

  //STEP 2 — Normalize inputs (trim + fallback)
  const currentPasswordVal = (currentPassword || "").trim();
  const newPasswordVal = (newPassword || "").trim();
  const confirmPasswordVal = (confirmPassword || "").trim();

  //STEP 3 — Mandatory fields validation
  if (
    validator.isEmpty(currentPasswordVal) ||
    validator.isEmpty(newPasswordVal) ||
    validator.isEmpty(confirmPasswordVal)
  ) {
    return next(
      new AppError(
        "Current Password, New Password and Confrim Password are mandatory fields",
        400
      )
    );
  }

  //STEP 4 — New password & confirm password match
  if (newPasswordVal !== confirmPasswordVal) {
    return next(
      new AppError("New Password should be equal to confirm password", 400)
    );
  }

  //STEP 5 — Strong password validation
  if (!validator.isStrongPassword(newPasswordVal)) {
    return next(new AppError(`Password doesn’t meet requirements`, 422));
  }

  //STEP 6 — Fetch logged-in user from DB
  const user = await db.query("SELECT * FROM users WHERE id=$1", [req.user.id]);

  //STEP 7 — User existence check
  if (user.rows.length === 0) {
    return next(new AppError("User no longer exists", 401));
  }

  //STEP 8 — Verify current password
  const isValid = await bcrypt.compare(
    currentPasswordVal,
    user.rows[0].password_hash
  );

  //STEP 9 — Current password wrong case
  if (!isValid) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  //STEP 10 — Prevent password reuse
  if (currentPasswordVal === newPasswordVal) {
    return next(
      new AppError("New Password cannot be same as current password", 400)
    );
  }

  //STEP 11 — Hash new password
  const newPasswordHash = await bcrypt.hash(newPasswordVal, 12);

  //STEP 12 — UPDATE QUERY
  const freshUser = await db.query(
    "UPDATE users SET password_hash=$1, password_changed_at=$2 WHERE id=$3 RETURNING *",
    [newPasswordHash, new Date(), user.rows[0].id]
  );

  //STEP 13 — Generate new JWT
  const token = signToken(freshUser.rows[0].id, freshUser.rows[0].role);

  //STEP 14 — Send response
  res.status(200).json({
    status: "success",
    token,
    data: {
      user: {
        id: freshUser.rows[0].id,
        first_name: freshUser.rows[0].first_name,
        last_name: freshUser.rows[0].last_name,
        username: freshUser.rows[0].username,
        email: freshUser.rows[0].email,
        role: freshUser.rows[0].role,
      },
    },
  });
});

const forgotpassword = catchAsync(async (req, res, next) => {
  // STEP 1 — Extract email from request body
  const { email } = req.body;

  // STEP 2 — Normalize email input
  const emailVal = (email || "").trim();

  // STEP 3 — Validate email presence
  if (validator.isEmpty(emailVal)) {
    return next(new AppError("Email is a mandatory field", 400));
  }

  // STEP 4 — Validate email format
  if (!validator.isEmail(emailVal)) {
    return next(new AppError("The email address format is invalid", 400));
  }

  // STEP 5 — Find user by email
  const user = await db.query("SELECT * FROM users WHERE email=$1", [emailVal]);

  // STEP 6 — Prevent email enumeration attack
  // Always return success response even if user does not exist
  if (user.rows.length === 0) {
    return res.status(200).json({
      status: "success",
      message: "Reset Token send to the provided email",
    });
  }

  // STEP 7 — Generate password reset token (plain)
  const resetToken = crypto.randomBytes(32).toString("hex");

  // STEP 8 — Hash reset token before storing in DB
  const password_reset_token = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // STEP 9 — Set token expiry time (10 minutes)
  const password_reset_expires = Date.now() + 10 * 60 * 1000;

  // STEP 10 — Store hashed token & expiry in DB
  await db.query(
    "UPDATE users SET password_reset_token=$1, password_reset_expires=$2 WHERE email=$3",
    [password_reset_token, password_reset_expires, emailVal]
  );

  // STEP 11 — Create reset URL (send via email)
  const resetUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/reset-password?token=${resetToken}`;

  // STEP 12 — TODO: Send reset email to user with resetUrl

  // STEP 13 — Send success response
  res.status(200).json({
    status: "success",
    message: "Reset Token send to the provided email",
  });
});

const resetPassword = catchAsync(async (req, res, next) => {
  // STEP 1 — Extract passwords & token
  const { newPassword, confirmPassword } = req.body;
  const { token } = req.query;

  // STEP 2 — Normalize inputs
  const newPasswordVal = (newPassword || "").trim();
  const confirmPasswordVal = (confirmPassword || "").trim();

  // STEP 3 — Validate required fields
  if (
    validator.isEmpty(newPasswordVal) ||
    validator.isEmpty(confirmPasswordVal)
  ) {
    return next(
      new AppError(
        "New Password and Confirm Password are mandotory fields",
        400
      )
    );
  }

  // STEP 4 — Hash received reset token
  const hashToken = crypto.createHash("sha256").update(token).digest("hex");

  // STEP 5 — Find user by valid token & expiry
  const user = await db.query(
    "SELECT * FROM users WHERE password_reset_token=$1 AND password_reset_expires > $2",
    [hashToken, new Date()]
  );

  if (user.rows.length === 0) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  // STEP 6 — Validate password strength
  if (!validator.isStrongPassword(newPasswordVal)) {
    return next(new AppError("Password doesn’t meet requirements", 422));
  }

  // STEP 7 — Match new & confirm password
  if (newPasswordVal !== confirmPasswordVal) {
    return next(
      new AppError("New Password should be equal to confirm password", 400)
    );
  }

  // STEP 8 — Ensure new password is not same as old password
  const isSameAsOld = await bcrypt.compare(
    newPasswordVal,
    user.rows[0].password_hash
  );

  if (isSameAsOld) {
    return next(
      new AppError("New Password cannot be same as current password", 400)
    );
  }

  // STEP 9 — Hash new password
  const newPasswordHash = await bcrypt.hash(newPasswordVal, 12);

  // STEP 10 — Update password & clear reset token fields
  const freshUser = await db.query(
    `UPDATE users 
     SET password_hash=$1,
         password_changed_at=$2,
         password_reset_token=$3,
         password_reset_expires=$4
     WHERE id=$5 
     RETURNING *`,
    [newPasswordHash, new Date(), null, null, user.rows[0].id]
  );

  // STEP 11 — Generate new JWT after password reset
  const updatedToken = signToken(freshUser.rows[0].id, freshUser.rows[0].role);

  // STEP 12 — Send success response
  res.status(200).json({
    status: "success",
    updatedToken,
    data: {
      user: {
        id: freshUser.rows[0].id,
        first_name: freshUser.rows[0].first_name,
        last_name: freshUser.rows[0].last_name,
        username: freshUser.rows[0].username,
        email: freshUser.rows[0].email,
        role: freshUser.rows[0].role,
      },
    },
  });
});

module.exports = {
  signup,
  login,
  protect,
  restrictTo,
  updatePassword,
  forgotpassword,
  resetPassword,
};
