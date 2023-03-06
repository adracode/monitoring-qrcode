import express from "express";
import parser from "body-parser";
import logIn from "../controllers/login";

const router = express.Router();

router.post("/", parser.json(), logIn);

export default router;
