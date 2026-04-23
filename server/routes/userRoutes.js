import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { updateMyAvailability, updateMyLocation } from "../controllers/userController.js";

const router = express.Router();

router.patch("/me/availability", protect, authorize("donor", "admin"), updateMyAvailability);
router.patch("/me/location", protect, updateMyLocation);

export default router;
