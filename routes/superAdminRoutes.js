// routes/superAdminRoutes.js
import express from "express";
import {
  addToWallet,
  getAllAdmins,
  login,
  getGameHistory,
  blockAdmin,
  unblockAdmin,
  deleteAdmin,
  updatePercentage,
  getPercentage,
  setWithdrawalAmount,
  getWalletHistory,
  getAdminWinnings,
  getSuperAdminGameTotalInfo,
  getAllSubAdmins,
} from "../controllers/superAdminController.js";
import { authSuperAdmin } from "../middleware/auth.js";
import {
  calculateAmounts,
  chooseAlgorithm,
  getCurrentAlgorithm,
} from "../controllers/cardController.js";
import { getUserCount } from '../controllers/adminController.js';
import { getIO, startTimer, stopTimer  } from "../socket/sockectServer.js";

const router = express.Router();

router.post("/login", login);
router.get("/all-admins", getAllAdmins);
router.post("/add-to-wallet", authSuperAdmin, addToWallet);
router.get("/game-history", authSuperAdmin, getGameHistory);

router.post("/choose-algorithm", chooseAlgorithm);
router.get("/current-algorithm", getCurrentAlgorithm);
// router.get('/calculate-amounts', calculateAmounts);
router.post("/block-admin", authSuperAdmin, blockAdmin);
router.post("/unblock-admin", authSuperAdmin, unblockAdmin);
router.post("/delete-admin", authSuperAdmin, deleteAdmin);

router.get("/getPercentage", getPercentage);
router.put("/updatePercentage", updatePercentage);
router.post("/set-withdrawal", setWithdrawalAmount);
router.get("/wallet-history/:adminId", getWalletHistory);

router.get("/winnings/:adminId", authSuperAdmin, getAdminWinnings);

router.get("/all-admin-ntp", getSuperAdminGameTotalInfo);

// New
router.get('/userCount', getUserCount);

// New
router.post('/start-timer', async (req, res) => {
  try {
      const io = getIO(); // Get socket.io instance
      startTimer(io);
      
      res.status(200).json({
          success: true,
          message: "Timer started successfully"
      });
  } catch (error) {
      console.error('Error starting timer:', error);
      res.status(500).json({
          success: false,
          message: "Failed to start timer"
      });
  }
});

// New
router.post('/stop-timer', async (req, res) => {
  try {
      const io = getIO(); // Get socket.io instance
      stopTimer(io); // Call the stopTimer function
      
      res.status(200).json({
          success: true,
          message: "Timer stopped successfully"
      });
  } catch (error) {
      console.error('Error stopping timer:', error);
      res.status(500).json({
          success: false,
          message: "Failed to stop timer"
      });
  }
});

// New
router.get('/getAllSubAdmins', getAllSubAdmins);

export default router;
