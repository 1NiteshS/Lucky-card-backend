// controllers/adminController.js
import Admin from '../models/Admin.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { sendOTP } from '../utils/emailService.js';
import Game from '../models/gameModel.js';
import SelectedCard from '../models/selectedCardModel.js';
import AdminWinnings from '../models/AdminWinnings.js';
import UserCount  from '../models/UserCount.js';
import AdminGameResult from '../models/AdminGameResult.js';
import { getIO } from '../socket/sockectServer.js';
import SubAdmin from '../models/SubAdmin.js'; // Add this import

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// New
export const create = async (req, res) => {
  try {
    const { name, email, password, commission } = req.body;

    // Check if admin already exists with this email
    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      return res.status(400).send({ error: "Email already in use" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 8);

    // Create new admin with UUID
    const adminId = uuidv4();
    const admin = new Admin({
      name,
      email,
      password: hashedPassword,
      commission,
      adminId,
    });

    // Save admin to database
    await admin.save();

    // Send success response
    res.status(201).send({
      message: "Admin created successfully",
      admin: {
        name: admin.name,
        email: admin.email,
        commission: admin.commission,
        adminId: admin.adminId,
      },
    });
  } catch (error) {
    res.status(400).send(error);
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).send({ error: "Admin not found" });
    }

    if (admin.otp !== otp || admin.otpExpiry < new Date()) {
      return res.status(400).send({ error: "Invalid or expired OTP" });
    }

    admin.isVerified = true;
    admin.otp = undefined;
    admin.otpExpiry = undefined;
    await admin.save();

    res.send({ message: "Email verified successfully" });
  } catch (error) {
    res.status(400).send(error);
  }
};

// New
export const dashLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).send({ error: "Invalid login credentials" });
    }
     // Check if user is already logged in
    if (admin.isLoggedIn) {
      return res.status(400).json({
        success: false,
        message: 'You are already logged in from another device. Please logout first.'
      });
    }

    const token = jwt.sign({ _id: admin._id }, process.env.JWT_SECRET);
    res.send({ token, adminId: admin.adminId });
  } catch (error) {
    res.status(400).send(error);
  }
};

// New
export const login = async (req, res) => {
  try {
      const { email, password } = req.body;
      
      // Find admin
      const admin = await Admin.findOne({ email });
      if (!admin) {
          return res.status(400).json({ 
              success: false, 
              message: 'Admin not found' 
          });
      }

       // Check if user is already logged in
      if (admin.isLoggedIn) {
        return res.status(400).json({
          success: false,
          message: 'You are already logged in from another device. Please logout first.'
        });
      }

      // Check password
      const isPasswordMatch = await bcrypt.compare(password, admin.password);

      if (!isPasswordMatch) {
          return res.status(400).json({ 
              success: false, 
              message: 'Invalid credentials' 
          });
      }

      // Update admin login status
      admin.isLoggedIn = true;
      await admin.save();

      // Ensure a record exists for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let userCount = await UserCount.findOne({ 
          date: { 
              $gte: today, 
              $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) 
          } 
      });

      // If no record exists, create one
      if (!userCount) {
          userCount = new UserCount({
              date: today,
              totalLogins: 0,
              uniqueUsers: [],
              loggedInUsers: 0
          });
      }

      // Update user count
      userCount.totalLogins += 1;
      userCount.loggedInUsers += 1;
      
      // Add unique user if not already exists
      if (!userCount.uniqueUsers.some(id => id.equals(admin._id))) {
          userCount.uniqueUsers.push(admin._id);
      }

      // Save the updated or new record
      await userCount.save();

      // Generate token
      const token = jwt.sign({ _id: admin._id }, process.env.JWT_SECRET);

      // Emit socket event with updated counts
      const io = getIO();
      io.emit('userCountUpdate', {
          loggedInUsers: userCount.loggedInUsers,
          totalLogins: userCount.totalLogins,
          uniqueUsers: userCount.uniqueUsers.length
      });
      
      res.status(200).json({ 
          success: true,
          token, 
          type: admin.type,
          adminId: admin.adminId,
          loggedInUsers: userCount.loggedInUsers,
          totalLogins: userCount.totalLogins,
          uniqueUsers: userCount.uniqueUsers.length
      });

  } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
          success: false, 
          message: 'Login failed',
          error: error.message 
      });
  }
};

// New
export const dashLogout = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    
    if (!admin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin not found' 
      });
    }

    admin.isLoggedIn = false;
    await admin.save();
   

    res.status(200).json({ 
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Logout failed',
      error: error.message 
    });
  }
};


// New
// Logout route mein
export const logout = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    
    if (!admin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin not found' 
      });
    }

    admin.isLoggedIn = false;
    await admin.save();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await UserCount.findOneAndUpdate(
      { date: { $gte: today } },
      { 
        $inc: { loggedInUsers: -1 }
      }
    );    

    res.status(200).json({ 
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Logout failed',
      error: error.message 
    });
  }
};

// New
export const getUserCount = async (req, res) => {
  try {
    // Find all UserCount documents, sorted by date in descending order
    const userCounts = await UserCount.find()
      .sort({ date: -1 })
      .populate('uniqueUsers', 'name email'); // Optionally populate unique users

    if (!userCounts || userCounts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No user count data found'
      });
    }

    // Calculate total statistics across all records
    const totalStatistics = userCounts.reduce((acc, current) => {
      return {
        totalLoginRecords: acc.totalLoginRecords + 1,
        totalLogins: acc.totalLogins + current.totalLogins,
        totalLoggedInUsers: acc.totalLoggedInUsers + current.loggedInUsers,
        totalUniqueUsers: new Set([...acc.totalUniqueUsers, ...current.uniqueUsers.map(u => u.toString())])
      };
    }, {
      totalLoginRecords: 0,
      totalLogins: 0,
      totalLoggedInUsers: 0,
      totalUniqueUsers: new Set()
    });

    res.status(200).json({
      success: true,
      totalStatistics: {
        // totalLoginRecords: totalStatistics.totalLoginRecords,
        // totalLogins: totalStatistics.totalLogins,
        totalLoggedInUsers: totalStatistics.totalLoggedInUsers,
        // totalUniqueUsers: totalStatistics.totalUniqueUsers.size
      }
      // data: userCounts.map(count => ({
      //   date: count.date,
      //   totalLogins: count.totalLogins,
      //   loggedInUsers: count.loggedInUsers,
      //   uniqueUsers: count.uniqueUsers,
      //   uniqueUserCount: count.uniqueUsers.length
      // }))
    });
  } catch (error) {
    console.error('Error fetching user count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user count',
      error: error.message
    });
  }
};




export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).send({ error: "Admin not found" });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

    admin.otp = otp;
    admin.otpExpiry = otpExpiry;
    await admin.save();

    await sendOTP(email, otp);

    res.send({ message: "OTP sent to your email for password reset" });
  } catch (error) {
    res.status(400).send(error);
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).send({ error: "Admin not found" });
    }

    if (admin.otp !== otp || admin.otpExpiry < new Date()) {
      return res.status(400).send({ error: "Invalid or expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 8);
    admin.password = hashedPassword;
    admin.otp = undefined;
    admin.otpExpiry = undefined;
    await admin.save();

    res.send({ message: "Password reset successfully" });
  } catch (error) {
    res.status(400).send(error);
  }
};

export const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({});

    const adminData = admins.map((admin) => ({
      name: admin.name,
      email: admin.email,
      creationDate: admin.createdAt,
      password: admin.password.replace(/./g, "*").slice(0, 10) + "...",
      walletBalance: admin.wallet,
    }));

    res.status(200).json(adminData);
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAdminProfile = async (req, res) => {
  try {
    const { adminId } = req.params; // Get adminId from URL params

    console.log("Requested AdminId:", adminId);
    console.log("Authenticated Admin:", req.admin);

    const admin = await Admin.findOne({ adminId }).select(
      "name email adminId wallet isVerified createdAt"
    );

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: "Admin not found",
      });
    }
    if (admin.adminId !== req.admin.adminId) {
      return res.status(403).json({
        success: false,
        error: "You can only view your own profile",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        name: admin.name,
        email: admin.email,
        adminId: admin.adminId,
        wallet: admin.wallet,
        isVerified: admin.isVerified,
        joinedDate: admin.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const getCurrentGame = async (req, res) => {
  try {
    // Find the most recent game
    const currentGame = await Game.findOne().sort({ createdAt: -1 });

    if (!currentGame) {
      return res.status(404).json({ message: "No active game found" });
    }

    // Return the game ID and any other relevant information
    res.status(200).json({
      success: true,
      data: {
        gameId: currentGame._id,
        gameNo: currentGame.GameNo, // Assuming you have a GameNo field
        createdAt: currentGame.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching current game:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching current game",
      error: error.message,
    });
  }
};

export const addAdminWinning = async (req, res) => {
  try {
    const { adminId, gameId, winningAmount } = req.body;
    // Validate input
    if (!adminId || !gameId || !winningAmount) {
      return res.status(400).json({
        success: false,
        error: "adminId, gameId, and winningAmount are required",
      });
    }
    // Check if the admin exists
    const admin = await Admin.findOne({ adminId });
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: "Admin not found",
      });
    }
    // Create new AdminWinnings document
    const newWinning = new AdminWinnings({
      adminId,
      gameId,
      winningAmount,
    });
    // Save the new winning record
    await newWinning.save();
    // Update admin's wallet
    await Admin.findOneAndUpdate(
      { adminId },
      { $inc: { wallet: winningAmount } }
    );
    res.status(201).json({
      success: true,
      message: "Admin winning added successfully",
      data: newWinning,
    });
  } catch (error) {
    console.error("Error adding admin winning:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const postAllAdminWinnings = async (adminId) => {
  try {
    // Validate input
    if (!adminId) {
      console.log("No adminID");

      return {
        success: false,
        error: "adminId is required",
      };
    }
    // Check if the admin exists
    const admin = await Admin.findOne({ adminId });
    if (!admin) {
      console.log("No admin With Id");

      return {
        success: false,
        error: "Admin not found",
      };
    }
    // Find all games where this admin has placed bets
    const games = await Game.find({ "Bets.adminID": adminId });
    console.log("Games found:", games);

    //console.log("games", games)
    let totalWinnings = 0;
    const winningRecords = [];
    for (const game of games) {
      const selectedCard = await SelectedCard.findOne({ gameId: game.GameId });
      if (!selectedCard) {
        console.log("No selected card for game:", game.GameId);
        continue;
      }

      if (!selectedCard) continue; // Skip if no winning card was selected for this game
      const winningCardId = selectedCard.cardId;

      const winningMultiplier = selectedCard.multiplier;
      console.log("winningMultiplier", winningMultiplier);

      let gameWinningAmount = 0;
      // Find this admin's bet in the game
      const adminBet = game.Bets.find((bet) => bet.adminID === adminId);

      if (adminBet) {
        for (const card of adminBet.card) {
          if (card.cardNo === winningCardId) {
            gameWinningAmount += card.Amount * (winningMultiplier * 10);
            console.log("game winner amt", gameWinningAmount);
          }
        }
      }
      if (gameWinningAmount > 0) {
        const winningRecord = new AdminWinnings({
          adminId,
          gameId: game.GameId,
          winningAmount: gameWinningAmount,
        });
        await winningRecord.save();
        winningRecords.push(winningRecord);
        totalWinnings += gameWinningAmount;
      }
    }
    return {
      success: true,
      message: "Admin winnings posted successfully",
      data: {
        totalWinnings,
        winningRecords,
      },
    };
  } catch (error) {
    console.error("Error posting admin winnings:", error);
    return {
      success: false,
      error: "Internal server error",
    };
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { adminId, oldPassword, newPassword } = req.body;
    // Find the admin by adminId
    const admin = await Admin.findOne({ adminId });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    // Verify the old password
    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 8);
    // Update the password
    admin.password = hashedPassword;
    await admin.save();
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const calculateAndStoreAdminWinnings = async (gameId) => {
  try {
    const game = await Game.findOne({ GameId: gameId });

    const selectedCard = await SelectedCard.find({ gameId });

    const lastCard = selectedCard[selectedCard.length - 1];

    if (!game || !selectedCard) {
      console.error("Game or SelectedCard not found");
      return;
    }
    const winningCardId = lastCard.cardId;

    const winningMultiplier = lastCard.multiplier;

    for (const bet of game.Bets) {
      const adminId = bet.adminID;
      let winningAmount = 0;
      for (const card of bet.card) {
        if (card.cardNo === winningCardId) {
          winningAmount += card.Amount * (winningMultiplier * 10);
        }
      }
      if (winningAmount > 0) {
        const adminWinning = new AdminWinnings({
          adminId,
          gameId,
          winningAmount,
        });
        await adminWinning.save();
      }
    }
  } catch (error) {
    console.error("Error calculating and storing admin winnings:", error);
  }
};

export const getAdminWinnings = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { from, to } = req.body;

    // Create a date filter object
    let dateFilter = {};
    if (from) {
      dateFilter.createdAt = { $gte: new Date(from) };
    }
    if (to) {
      dateFilter.createdAt = { ...dateFilter.createdAt, $lte: new Date(to) };
    }

    // Combine adminId and date filters
    const filter = {
      adminId,
      ...dateFilter,
    };

    // Use the filter in the query
    const winnings = await AdminWinnings.find(filter).sort({ createdAt: -1 });

    // If no winnings found, handle that case
    if (!winnings.length) {
      return res.status(404).json({
        success: false,
        message:
          "No winnings found for this admin within the specified date range",
      });
    }

    res.status(200).json({
      success: true,
      data: winnings,
    });
  } catch (error) {
    console.error("Error fetching admin winnings:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const getAdminGameTotalInfo = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { from, to } = req.query;

    // Fetch the necessary data from the database
    const { games, selectedCards, admin, adminGameResults } =
      await getAdminGameData(adminId, from, to);

    // Calculate the required metrics
    const {
      totalBetAmount,
      totalWinAmount,
      endAmount,
      commission,
      totalClaimedAmount,
      unclaimedAmount,
      NTP,
    } = await calculateAdminGameTotals(
      games,
      selectedCards,
      admin,
      adminGameResults
    );

    // Construct the response
    return res.status(200).json({
      success: true,
      data: {
        totalBetAmount,
        totalWinAmount,
        endAmount,
        commission,
        totalClaimedAmount,
        unclaimedAmount,
        NTP,
      },
    });
  } catch (error) {
    console.error("Error retrieving admin game total info:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving admin game total info",
      error: error.message,
    });
  }
};

async function getAdminGameData(adminId, from, to) {
  // Set default date range for today
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
    999
  );

  // Use the provided date range if available, or use today's date
  const fromDate = from ? new Date(from) : startOfDay;
  const toDate = to ? new Date(to) : endOfDay;

  // Fetch all the game data for the given adminId and date range
  const games = await Game.find({
    "Bets.adminID": adminId,
    createdAt: { $gte: fromDate, $lte: toDate },
  }).lean();

  const selectedCards = await SelectedCard.find({
    gameId: { $in: games.map((game) => game.GameId) },
  }).lean();

  const adminGameResults = await AdminGameResult.find({
    gameId: { $in: games.map((game) => game.GameId) },
    "winners.adminId": adminId,
  }).lean();

  const admin = await Admin.findOne({ adminId }).lean();

  return { games, selectedCards, admin, adminGameResults };
}

async function calculateAdminGameTotals(
  games,
  selectedCards,
  admin,
  adminGameResults
) {
  let totalBetAmount = 0;
  let totalWinAmount = 0;
  let totalClaimedAmount = 0;

  // Calculate total bet amount
  for (const game of games) {
    const adminBets = game.Bets.filter((bet) => bet.adminID === admin.adminId);
    for (const bet of adminBets) {
      totalBetAmount += bet.card.reduce(
        (total, card) => total + card.Amount,
        0
      );
    }
  }

  // Calculate total win amount from AdminGameResult
  for (const result of adminGameResults) {
    const winnerEntry = result.winners.find(
      (winner) => winner.adminId === admin.adminId
    );
    if (winnerEntry) {
      totalWinAmount += winnerEntry.winAmount || 0;
      if (winnerEntry.status === "claimed") {
        totalClaimedAmount += winnerEntry.winAmount || 0;
      }
    }
  }

  // If no claimed amount is found, default to 0
  totalClaimedAmount = totalClaimedAmount || 0;

  // Calculate derived values
  const endAmount = totalBetAmount - totalWinAmount;
  const commission = totalBetAmount * 0.05;
  const unclaimedAmount = totalWinAmount - totalClaimedAmount;
  const NTP = endAmount - commission;

  return {
    totalBetAmount,
    totalWinAmount,
    endAmount,
    commission,
    totalClaimedAmount,
    unclaimedAmount,
    NTP,
  };
}



// New
export const transferMoney = async (req, res) => {
  const { adminId, subAdminId, amount } = req.body;

  // Input validation
  if (!adminId || !subAdminId || !amount) {
      return res.status(400).json({ message: "All fields are required" });
  }

  if (amount <= 0) {
      return res.status(400).json({ message: "Amount should be greater than 0" });
  }

  try {
      // Fetch the admin
      const admin = await Admin.findOne({ adminId });
      if (!admin) {
          return res.status(404).json({ message: "Admin not found" });
      }

      // Check if admin has enough balance
      if (admin.wallet < amount) {
          return res.status(400).json({ message: "Insufficient balance in Admin's wallet" });
      }

      // Fetch the sub-admin
      const subAdmin = await SubAdmin.findOne({ subAdminId });
      if (!subAdmin) {
          return res.status(404).json({ message: "SubAdmin not found" });
      }

      // Update wallets
      admin.wallet -= amount;
      subAdmin.wallet += amount;

      // Save changes
      await admin.save();
      await subAdmin.save();

      res.status(200).json({
          message: "Money transferred successfully",
          adminWallet: admin.wallet,
          subAdminWallet: subAdmin.wallet,
      });
  } catch (error) {
      console.error("Error during wallet transfer:", error);
      res.status(500).json({ message: "Internal server error" });
  }
};

// New
export const setCommission = async (req, res) => {
  const { adminId, subAdminId, commission } = req.body;

  // Input validation
  if (!adminId || !subAdminId || commission === undefined) {
      return res.status(400).json({ message: "All fields are required" });
  }

  if (commission < 0 || commission > 100) {
      return res.status(400).json({ message: "Commission should be between 0 and 100 percent" });
  }

  try {
      // Fetch the admin
      const admin = await Admin.findOne({ adminId });
      if (!admin) {
          return res.status(404).json({ message: "Admin not found" });
      }

      // Fetch the sub-admin
      const subAdmin = await SubAdmin.findOne({ subAdminId });
      if (!subAdmin) {
          return res.status(404).json({ message: "SubAdmin not found" });
      }

      // Update the commission
      subAdmin.commission = commission;

      // Save changes
      await subAdmin.save();

      res.status(200).json({
          message: "Commission set successfully",
          subAdminId: subAdmin.subAdminId,
          commission: subAdmin.commission,
      });
  } catch (error) {
      console.error("Error while setting commission:", error);
      res.status(500).json({ message: "Internal server error" });
  }
};

// New
export const getSubAdminByAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    //check if the admin exists
    const admin = await Admin.findOne({ adminId });
    if (!admin) {
      return res.status(404).json({message: "Admin not found"});
    }

    // Fetch the subadmins created by this admin
    const subadmins = await SubAdmin.find({ createdBy: adminId });

    res.status(200).json( subadmins )
    
  } catch (error) {
    console.error(error);
    res.status(500).json({message: "Server Error"});
  }
}