const sharp = require("sharp");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const path = require("path");

const resizeUserPhoto = catchAsync(async (req, res, next) => {
  //STEP 1 - Check if file exist
  if (!req.file) return next();

  //STEP 2 - create unique filename
  const filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  //STEP 3 - Define output path
  const outputPath = path.join(
    __dirname,
    "..",
    "public",
    "img",
    "users",
    filename
  );

  //STEP 4 - Process image using sharp
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 80 })
    .toFile(outputPath);

  //STEP 5 - Attach filename to request object
  req.file.filename = filename;

  //STEP 6  - move to next middleware
  next();
});

module.exports = resizeUserPhoto;
