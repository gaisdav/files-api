import jwt from "jsonwebtoken";
import { JWT_REFRESH_SECRET, JWT_SECRET } from "../constants.js";

export const generateToken = ({ id }) => {
  const token = jwt.sign({ id }, JWT_SECRET, { expiresIn: "10m" });
  const refreshToken = jwt.sign({ id }, JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
  return { token, refreshToken };
};
