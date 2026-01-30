const validator = require("validator");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const db = require("../db/pool");

const usersDetails = catchAsync(async (req, res, next) => {
  // STEP 1 — Extract logged-in user id from protect middleware
  const userId = req.user.id;

  // STEP 2 — Fetch user details from database
  // (Avoid SELECT * in production for security & performance)
  const user = await db.query(
    `SELECT 
        id,
        first_name,
        last_name,
        username,
        email,
        role,
        profile_image_url,
        date_of_birth,
        is_active,
        created_at,
        updated_at
     FROM users 
     WHERE id = $1`,
    [userId]
  );

  // STEP 3 — Check if user still exists
  if (user.rows.length === 0) {
    return next(new AppError("User no longer exists", 401));
  }

  // STEP 4 — Check if user account is active
  if (!user.rows[0].is_active) {
    return next(new AppError("User account is deactivated", 401));
  }

  // STEP 5 — Send user data response
  res.status(200).json({
    status: "success",
    data: {
      user: user.rows[0],
    },
  });
});

const updateUser = catchAsync(async (req, res, next) => {
  // STEP 1 — Extract allowed fields from request body
  const { first_name, last_name, date_of_birth } = req.body;

  // STEP 2 — Prepare dynamic update query
  // This allows partial updates (industry standard)
  const updates = [];
  const values = [];
  let index = 1;

  // STEP 3 — Validate & add first_name if provided
  if (first_name && !validator.isEmpty(first_name.trim())) {
    updates.push(`first_name = $${index++}`);
    values.push(first_name.trim());
  }

  // STEP 4 — Validate & add last_name if provided
  if (last_name && !validator.isEmpty(last_name.trim())) {
    updates.push(`last_name = $${index++}`);
    values.push(last_name.trim());
  }

  // STEP 5 — Add date_of_birth if provided
  if (date_of_birth) {
    updates.push(`date_of_birth = $${index++}`);
    values.push(date_of_birth);
  }

  // STEP 5 — Fetch current user to get old image
  const existingUser = await db.query(
    "SELECT profile_image_url FROM users WHERE id=$1",
    [req.user.id]
  );

  // STEP 6 - Add profile image if uploaded
  if (req.file) {
    const oldImage = existingUser.rows[0]?.profile_image_url;

    // STEP 7 - delete old image if exists
    if (oldImage) {
      const oldImagePath = `public${oldImage}`;
      deleteFile(oldImagePath);
    }

    updates.push(`profile_image_url = $${index++}`);
    values.push(`/img/users/${req.file.filename}`);
  }

  // STEP 8 — Ensure at least one field is being updated
  if (updates.length === 0) {
    return next(new AppError("Provide at least one field to update", 400));
  }

  // STEP 9 — Always update updated_at timestamp
  updates.push(`updated_at = $${index++}`);
  values.push(new Date());

  // STEP 10 — Add user id for WHERE clause
  values.push(req.user.id);

  // STEP 11 — Execute UPDATE query
  const updatedUser = await db.query(
    `
    UPDATE users
    SET ${updates.join(", ")}
    WHERE id = $${index}
    RETURNING 
      id,
      first_name,
      last_name,
      username,
      email,
      role,
      profile_image_url,
      date_of_birth,
      is_active,
      created_at,
      updated_at
    `,
    values
  );

  // STEP 12 — Send updated user data response
  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser.rows[0],
    },
  });
});

module.exports = { usersDetails, updateUser };
