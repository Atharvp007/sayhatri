import express from "express";
import { testGeo } from "../controllers/testController.js";

const router = express.Router();

router.get("/", testGeo);

export default router;