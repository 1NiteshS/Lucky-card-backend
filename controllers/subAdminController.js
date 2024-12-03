import SubAdmin from "../models/SubAdmin.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import UserCount from "../models/UserCount.js";
import { getIO } from "../socket/sockectServer.js";

// New
export const create = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Assuming logged-in Admin's ID is available in `req.admin.adminId`
    const adminId = req.admin.adminId;

    // Check if SubAdmin already exists with this email
    // const existingSubAdmin = await SubAdmin.findOne({ email });

    // if (existingSubAdmin) {
    //   return res.status(400).send({ error: "Email already in use" });
    // }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 8);

    // Create new SubAdmin
    const subAdminId = uuidv4();
    const subAdmin = new SubAdmin({
      name,
      email,
      password: hashedPassword,
      subAdminId,
      createdBy: adminId, // Track the creator Admin
    });

    // Save SubAdmin to database
    await subAdmin.save();

    // Send success response
    res.status(201).send({
      message: "SubAdmin created successfully",
      subAdmin: {
        name: subAdmin.name,
        email: subAdmin.email,
        createdBy: subAdmin.createdBy,
      },
    });
  } catch (error) {
    res.status(400).send(error);
  }
};


// New
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin
    const admin = await SubAdmin.findOne({ email });
    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Check password
    const isPasswordMatch = await bcrypt.compare(password, admin.password);

    if (!isPasswordMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
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
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    // If no record exists, create one
    if (!userCount) {
      userCount = new UserCount({
        date: today,
        totalLogins: 0,
        uniqueUsers: [],
        loggedInUsers: 0,
      });
    }

    // Update user count
    userCount.totalLogins += 1;
    userCount.loggedInUsers += 1;

    // Add unique user if not already exists
    if (!userCount.uniqueUsers.some((id) => id.equals(admin._id))) {
      userCount.uniqueUsers.push(admin._id);
    }

    // Save the updated or new record
    await userCount.save();

    // Generate token
    const token = jwt.sign({ _id: admin._id }, process.env.JWT_SECRET);

    // Emit socket event with updated counts
    const io = getIO();
    io.emit("userCountUpdate", {
      loggedInUsers: userCount.loggedInUsers,
      totalLogins: userCount.totalLogins,
      uniqueUsers: userCount.uniqueUsers.length,
    });

    res.status(200).json({
      success: true,
      token,
      type: admin.type,
      adminId: admin.adminId,
      loggedInUsers: userCount.loggedInUsers,
      totalLogins: userCount.totalLogins,
      uniqueUsers: userCount.uniqueUsers.length,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

// New
export const logout = async (req, res) => {
  try {
    const admin = await SubAdmin.findById(req.admin._id);

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "Admin not found",
      });
    }

    admin.isLoggedIn = false;
    await admin.save();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await UserCount.findOneAndUpdate(
      { date: { $gte: today } },
      {
        $inc: { loggedInUsers: -1 },
      }
    );

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    });
  }
};

// New
export const getSubAdminGameTotalInfo = async (req, res) => {
  try {
    const { subAdminId } = req.params;
    const { from, to } = req.query;

    // Fetch the necessary data from the database for sub-admin
    const { games, selectedCards, subAdmin, adminGameResults } =
      await getSubAdminGameData(subAdminId, from, to);

    // Calculate the required metrics
    const {
      totalBetAmount,
      totalWinAmount,
      endAmount,
      commission,
      totalClaimedAmount,
      unclaimedAmount,
      NTP,
    } = await calculateSubAdminGameTotals(
      games,
      selectedCards,
      subAdmin,
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
    console.error("Error retrieving sub-admin game total info:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving sub-admin game total info",
      error: error.message,
    });
  }
};

// New
// Helper function to fetch sub-admin game data
async function getSubAdminGameData(subAdminId, from, to) {
  // Verify sub-admin exists
  const subAdmin = await SubAdmin.findOne({ subAdminId });
  if (!subAdmin) {
    throw new Error("Sub-Admin not found");
  }

  // Prepare date filter if from and to are provided
  const dateFilter = {};
  if (from && to) {
    dateFilter.createdAt = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }

  // Fetch related game data
  const games = await Game.find({
    ...dateFilter,
    "Bets.adminID": subAdmin.adminId,
  });

  const selectedCards = await SelectedCard.find({
    ...dateFilter,
    adminId: subAdmin.adminId,
  });

  const adminGameResults = await AdminGameResult.find({
    ...dateFilter,
    "winners.adminId": subAdmin.adminId,
  });

  return {
    games,
    selectedCards,
    subAdmin,
    adminGameResults,
  };
}

// New
// Helper function to calculate sub-admin game totals
async function calculateSubAdminGameTotals(
  games,
  selectedCards,
  subAdmin,
  adminGameResults
) {
  let totalBetAmount = 0;
  let totalWinAmount = 0;
  let totalClaimedAmount = 0;

  // Calculate total bet amount
  for (const game of games) {
    const subAdminBets = game.Bets.filter(
      (bet) => bet.adminID === subAdmin.adminId
    );
    for (const bet of subAdminBets) {
      totalBetAmount += bet.card.reduce(
        (total, card) => total + card.Amount,
        0
      );
    }
  }

  // Calculate total win amount from AdminGameResult
  for (const result of adminGameResults) {
    const winnerEntry = result.winners.find(
      (winner) => winner.adminId === subAdmin.adminId
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
  const commission = totalBetAmount * 0.05; // Assuming same 5% commission as admin
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
