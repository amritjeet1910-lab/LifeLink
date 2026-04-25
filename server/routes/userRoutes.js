import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  completeMyOnboarding,
  getAdminOverview,
  listUsersForAdmin,
  resolveLocation,
  updateMySettings,
  updateMyAvailability,
  updateMyLocation,
  updateMyProfile,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/resolve-location", resolveLocation);
router.get("/admin/overview", protect, authorize("admin"), getAdminOverview);
router.get("/admin/users", protect, authorize("admin"), listUsersForAdmin);
router.patch("/me/onboarding", protect, completeMyOnboarding);
router.patch("/me/profile", protect, updateMyProfile);
router.patch("/me/settings", protect, updateMySettings);
router.patch("/me/availability", protect, authorize("donor", "admin"), updateMyAvailability);
router.patch("/me/location", protect, updateMyLocation);

export default router;
