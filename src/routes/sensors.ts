import express from "express"

const router = express.Router();

router.get("/:sensor", (req, res) => {
    res.status(200).send(req.params.sensor);
});

export default router;