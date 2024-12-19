// routes/adminRoutes.js
import express from "express";
import {
  create,
  login,
  verifyOTP,
  forgotPassword,
  resetPassword,
  getAllAdmins,
  getAdminProfile,
  getCurrentGame,
  updatePassword,
  postAllAdminWinnings,
  getAdminWinnings,
  getAdminGameTotalInfo,
  logout,
  // transferMoney,
  setCommission,
  getSubAdminByAdmin,
  dashLogin,
  resetSubAdminLogin,
  transferMoney,
  getTransactionHistory,
} from "../controllers/adminController.js";
import { authAdmin, authSuperAdmin } from "../middleware/auth.js";
import {
  claimAllWinnings,
  getAdminGameResultsForAdmin,
  getTotalWinnings,
} from "../controllers/cardController.js";
import { searchAll } from "../controllers/searchController.js";
import { resetSubPassword, } from "../controllers/subAdminController.js"

const router = express.Router();

router.post("/create", authSuperAdmin, create);
// New
router.post("/login", login);
// New
router.post("/logout",authAdmin, logout);
router.post("/verify-otp", verifyOTP);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/all-admins", getAllAdmins);
router.get("/profile/:userId/:type", getAdminProfile);
router.get("/current-game", getCurrentGame);
router.post("/update-password", updatePassword);
router.post("/postAllAdminWinnings/:adminId", postAllAdminWinnings);
router.get("/winnings/:adminId", authAdmin, getAdminWinnings);

router.get("/admin-game-results/:userId/:type",getAdminGameResultsForAdmin);

router.get("/search-result", searchAll);

// Get total winnings for an admin
router.get("/total-winnings/:adminId", authAdmin, getTotalWinnings);

// Claim all winnings for an admin
router.post("/claim-all/:adminId", claimAllWinnings);

router.get("/game-total-info/:adminId", getAdminGameTotalInfo);

// New
router.post('/transfer-money', transferMoney);
// New
router.get('/transactions', getTransactionHistory);
// New
router.post("/set-commission", setCommission);
// New
router.get("/subadmins/:adminId", getSubAdminByAdmin);
// New
router.post('/dashLogin', dashLogin)
// New
router.get('/subadmin/reset-login/:subAdminId', resetSubAdminLogin);
// New
router.post('/subadmin/reset-password/:subAdminId', resetSubPassword);

export default router;