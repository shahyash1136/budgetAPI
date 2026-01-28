const multer = require("multer");
const AppError = require("./appError");

//STEP 1 - Configure Storage
//Memory storage is best when using cloudinary/S3 later
const multerStorage = multer.memoryStorage();

//STEP 2 - File Filter (allow only images)
const multerFilter = (req, file, cb) => {
  //STEP 2.1 - Check MIME type
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    // STEP 2.2 — Reject non-image files
    cb(
      new AppError("Only image files are allowed (jpg, png, jpeg)", 400),
      false
    );
  }
};

//STEP 3 - Multer configuration
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

// STEP 4 — Single image upload middleware
// `photo` will be the form-data key
exports.uploadUserPhoto = upload.single("photo");
