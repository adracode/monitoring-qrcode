import express from "express";
import parser from "body-parser";

const router = express.Router();
const login = require("../controllers/login")

router.post("/", parser.json(), login);


export default router;