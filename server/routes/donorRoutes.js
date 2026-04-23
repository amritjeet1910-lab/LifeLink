import express from "express";
import { getNearbyDonors } from "../controllers/donorController.js";

const router = express.Router();

router.get("/nearby", getNearbyDonors);

export default router;

