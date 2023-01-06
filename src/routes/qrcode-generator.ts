import express from "express"
import parser from "body-parser"

const router = express.Router();

router.post("/generate", parser.json(), (req, res) => {
    console.log(req.body);
    res.send({qrcodeText: req.body.input});
});

export default router;