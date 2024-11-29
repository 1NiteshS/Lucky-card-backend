import express from "express";
import {
  calculateAmounts,
  claimWinnings,
  getAdminGameResult,
  // getAdminGameResults,
  getAdminResults,
  getAllCards,
  // getAllRecentWinningCards,
  getAllSelectedCards,
  getCurrentGame,
  getLatestSelectedCards,
  placeBet,
  postCardNumber,
  processAllSelectedCards,
  placeAutomatedBet,
  getAdminLatestBets,
  deleteBetByTicketId,
} from "../controllers/cardController.js";
import { authAdmin, authSubAdmin } from "../middleware/auth.js";
import  PercentageMode  from "../models/PercentageMode.js"

const router = express.Router();

// Start the timer
// router.post('/start-timer', startTimer);

// Route to calculate total, lowest, and perform operations
router.get("/calculate", calculateAmounts);

// Route to place a bet
router.post("/bet/:adminId", authAdmin, placeBet);

// Route for SubAdmin to place a bet
router.post('/bet/subadmin/:adminId', authSubAdmin, placeBet);

// In your routes file
router.get('/getBets/:adminId', getAdminLatestBets);

// DELETE /api/bets/:ticketId
router.delete('/deleteBets/:ticketId', deleteBetByTicketId);

router.post("/betBot", placeAutomatedBet);

// Route to get all cards
router.get("/all-cards", getAllCards);

// Route to post card number
router.post("/card-number", postCardNumber);

// Route to get current game
router.get("/current-game", getCurrentGame);

router.get("/selected-cards", getAllSelectedCards);

// router.get('/admin-game-results/:gameId', getAdminGameResults);

router.get("/admin-game", getAdminGameResult);

router.get("/admin-results/:adminId", getAdminResults);

router.post("/claim", claimWinnings);

router.post("/save-selected-cards", processAllSelectedCards);

// router.get("/recent-winning-cards", getAllRecentWinningCards);

router.get("/recent-winning-cards", getLatestSelectedCards);

// Get current percentage mode
router.get('/getpercentage-mode', async (req, res) => {
  try {
    let mode = await PercentageMode.findOne();
    if (!mode) {
      mode = await PercentageMode.create({
        mode: 'automatic'
      });
    }
    res.json(mode);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update percentage mode
router.put('/percentage-mode', async (req, res) => {
  try {
    const { mode } = req.body;
    let percentageMode = await PercentageMode.findOne();
    
    if (!percentageMode) {
      percentageMode = new PercentageMode();
    }
    
    if (mode) percentageMode.mode = mode;
    percentageMode.updatedAt = new Date();
    
    await percentageMode.save();
    res.json(percentageMode);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


export default router;