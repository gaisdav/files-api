import "reflect-metadata";
import express from "express";
import cors from "cors";
import fs from "fs/promises";
import { dataSource } from "./dataSource.js";
import { ENDPOINTS } from "./endoints.js";
import { destination, upload } from "./upload.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { JWT_REFRESH_SECRET, JWT_SECRET } from "./constants.js";
import { generateToken } from "./utils/generateToken.js";

const initializeDataSource = async () => {
  try {
    await dataSource.initialize();
    console.log("Data Source has been initialized!");
  } catch (err) {
    console.error("Error during Data Source initialization:", err);
  }
};

initializeDataSource();

const fileRepository = dataSource.getRepository("File");
const userRepository = dataSource.getRepository("User");
const blockedTokenRepository = dataSource.getRepository("BlockedTokens");

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  const blockedToken = await blockedTokenRepository.findOne({
    where: { token },
  });

  if (blockedToken) {
    return res.status(401).json({ message: "Token is blocked" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

/**
 * Sign up a new user
 */
app.post(ENDPOINTS.SIGNUP, async (req, res) => {
  const { id, password } = req.body;

  if (!id || !password) {
    return res.status(400).send({ message: "ID and password are required" });
  }

  const user = await userRepository.findOne({ where: { id } });

  if (user) {
    return res.status(400).send({ message: "User already exists" });
  }

  const encryptedPassword = bcrypt.hashSync(password, 8);

  const tokens = generateToken({
    id,
  });

  await userRepository.save({
    id,
    password: encryptedPassword,
    refreshToken: tokens.refreshToken,
  });

  res.json(tokens);
});

/**
 * Sign in an existing user
 */
app.post(ENDPOINTS.SIGNIN, async (req, res) => {
  const { id, password } = req.body;
  const user = await userRepository.findOneBy({ id });

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const tokens = generateToken({ id: user.id });

  await userRepository.update(user.id, { refreshToken: tokens.refreshToken });

  res.json(tokens);
});

/**
 * Refresh token
 */
app.post(ENDPOINTS.REFRESH_TOKEN, async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "No refresh token provided in authorization headers" });
  }

  const refreshToken = authHeader.split(" ")[1];

  const blockedToken = await blockedTokenRepository.findOne({
    where: { refreshToken },
  });

  if (blockedToken) {
    return res.status(401).json({ message: "Refresh token is blocked" });
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const tokens = generateToken({ id: payload.id });
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ message: "Invalid refresh token" });
  }
});

/**
 * Get user info
 */
app.get(ENDPOINTS.USER_INFO, authenticate, async (req, res) => {
  const user = await userRepository.findOneBy({ id: req.user.id });
  res.json({ id: user.id });
});

app.get(ENDPOINTS.LOGOUT, authenticate, async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.split(" ")[1];
  const user = await userRepository.findOneBy({ id: req.user.id });

  await blockedTokenRepository.save({ token, refreshToken: user.refreshToken });

  res.json({ message: "Successfully logged out" });
});

/**
 * Get list of files
 */
app.get(ENDPOINTS.FILE_LIST, authenticate, async (req, res) => {
  const listSize = parseInt(req.query.list_size || "10"); // Размер страницы по умолчанию 10
  const page = parseInt(req.query.page || "1"); // Номер страницы по умолчанию 1

  try {
    const files = await fileRepository.findAndCount({
      take: listSize,
      skip: (page - 1) * listSize,
    });

    console.log(files);
    res.json(files);
  } catch (err) {
    console.error("Error fetching files:", err);
    res.status(500).json({ message: err.message || "Error fetching files" });
  }
});

/**
 * Upload a file
 */
app.post(
  ENDPOINTS.FILE_UPLOAD,
  authenticate,
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).send({ message: "Please upload a file" });
      }

      const dbFile = await fileRepository.findOne({
        where: { name: file.originalname },
      });

      if (dbFile) {
        return res.status(400).send({ message: "File already exists" });
      }

      await fileRepository.save({
        name: file.originalname,
        extension: file.originalname.split(".").pop(),
        mimetype: file.mimetype,
        size: file.size,
      });

      res.json({ message: "Successfully uploaded file" });
    } catch (err) {
      console.error("Error during file upload:", err);
      res
        .status(500)
        .json({ message: err.message || "Error during file upload" });
    }
  },
);

/**
 * Delete a file
 */
app.delete(ENDPOINTS.FILE_DELETE, authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const file = await fileRepository.findOne({ where: { id } });

    if (!file) {
      return res.status(404).send({ message: "File not found" });
    }

    await fs.unlink(`${destination}${file.name}`);
    await fileRepository.remove(file);

    res.json({ message: "Successfully deleted file" });
  } catch (err) {
    console.error("Error during file deletion:", err);
    res
      .status(500)
      .json({ message: err.message || "Error during file deletion" });
  }
});

/**
 * Get a file
 */
app.get(ENDPOINTS.FILE, authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const file = await fileRepository.findOne({ where: { id } });

    if (!file) {
      return res.status(404).send({ message: "File not found" });
    }

    res.json(file);
  } catch (err) {
    console.error("Error fetching file:", err);
    res.status(500).json({ message: err.message || "Error fetching file" });
  }
});

/**
 * Download a file
 */
app.get(ENDPOINTS.FILE_DOWNLOAD, authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const file = await fileRepository.findOne({ where: { id } });

    if (!file) {
      return res.status(404).send({ message: "File not found" });
    }

    const path = `${destination}${file.name}`;
    res.download(path);
  } catch (err) {
    console.error("Error during file download:", err);
    res
      .status(500)
      .json({ message: err.message || "Error during file download" });
  }
});

/**
 * Update a file
 */
app.put(
  ENDPOINTS.FILE_UPDATE,
  authenticate,
  upload.single("file"),
  async (req, res) => {
    const { id } = req.params;
    const newFile = req.file;
    const newPath = `${destination}${newFile.originalname}`;

    try {
      const file = await fileRepository.findOne({ where: { id } });

      if (!file) {
        await fs.unlink(newPath);
        return res.status(404).send({ message: "File not found" });
      }

      const oldPath = `${destination}${file.name}`;

      if (newPath !== oldPath) {
        await fs.unlink(oldPath);
      }

      file.name = req.file.originalname;
      file.extension = req.file.originalname.split(".").pop();
      file.mimetype = req.file.mimetype;
      file.size = req.file.size;

      await fileRepository.save(file);

      res.json({ message: "Successfully updated file" });
    } catch (err) {
      console.error("Error during file update:", err);
      res
        .status(500)
        .json({ message: err.message || "Error during file update" });
    }
  },
);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
