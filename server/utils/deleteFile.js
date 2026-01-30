const fs = require("fs");

const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.log("File delete failed:", err.message);
    }
  });
};

module.exports = deleteFile;
