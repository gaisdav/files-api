import multer from "multer";

const acceptedFileTypes = ["image/jpeg", "image/png"];
export const destination = "./uploads/";

const storage = multer.diskStorage({
  destination,
  filename: (req, file, callback) => {
    callback(null, file.originalname);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter: (req, file, callback) => {
    if (!acceptedFileTypes.includes(file.mimetype)) {
      return callback(new Error("Please upload a picture (PNG or JPEG)"));
    }
    callback(undefined, true);
  },
});
