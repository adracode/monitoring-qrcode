import express from "express";
import parser from "body-parser";
import changePassword from "../controllers/password";

const router = express.Router();

router.post("/", parser.json(), changePassword);

export default router;
