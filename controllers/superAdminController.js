// controllers/superAdminController.js
import SuperAdmin from "../models/SuperAdmin.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import Game from "../models/gameModel.js";
import BetPercentage from "../models/BetPercentage.js";
import AdminWinnings from "../models/AdminWinnings.js";
import WalletTransaction from "../models/WalletTransaction.js";

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const superAdmin = await SuperAdmin.findOne({ username });

    // if (!superAdmin || !(await bcrypt.compare(password, superAdmin.password))) {
    //   return res.status(401).send({ error: 'Invalid login credentials' });
    // }

    if (!superAdmin) {
      return res.status(401).send({ error: "Super admin not found" });
    }

    const passwordMatch = await bcrypt.compare(password, superAdmin.password);
    if (!passwordMatch) {
      return res.status(401).send({ error: "Password is incorrect" });
    }

    const token = jwt.sign({ _id: superAdmin._id }, process.env.JWT_SECRET);
    return res.send({ token });
  } catch (error) {
    return res.status(400).send(error);
  }
};

export const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({});

    const adminData = admins.map((admin) => ({
      adminId: admin.adminId,
      name: admin.name,
      email: admin.email,
      creationDate: admin.createdAt,
      password: admin.password.replace(/./g, "*").slice(0, 10) + "...",
      walletBalance: admin.wallet,
    }));

    console.log(adminData);

    return res.status(200).json(adminData);
  } catch (error) {
    console.error("Error fetching admins:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const addToWallet = async (req, res) => {
  try {
    const { adminId, amount } = req.body;

    if (!adminId || !amount || amount <= 0) {
      return res.status(400).json({
        error:
          "Invalid input. Please provide a valid adminId and a positive amount.",
      });
    }

    const admin = await Admin.findOne({ adminId });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    admin.wallet += Number(amount);
    await admin.save();

    // Create and save transaction record
    const transaction = new WalletTransaction({
      adminId: admin.adminId,
      amount: amount,
      transactionType: "deposit", // or 'add' depending on your schema
    });
    await transaction.save();

    return res.status(200).json({
      message: "Amount added to wallet successfully",
      adminId: admin.adminId,
      newBalance: admin.wallet,
      transaction: {
        amount: transaction.amount,
        transactionType: transaction.transactionType,
        timestamp: transaction.timestamp,
      },
    });
  } catch (error) {
    console.error("Error adding to wallet:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getGameHistory = async (req, res) => {
  try {
    // Get pagination parameters from query string with defaults
    const page = parseInt(req.query.page) || 1;
    // const limit = parseInt(req.query.limit) || 10;
    const skip = page - 1;

    // Get total count of games for pagination info
    const totalGames = await Game.countDocuments();

    // Fetch games with pagination, sorting by GameNo in descending order
    const games = await Game.find()
      .sort({ GameNo: -1 })
      .skip(skip)
      // .limit(limit)
      .select("GameNo Bets createdAt") // Select specific fields you want to return
      .lean(); // Convert to plain JavaScript objects for better performance

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalGames);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Return response with games and pagination info
    return res.status(200).json({
      success: true,
      data: {
        games,
        pagination: {
          currentPage: page,
          totalPages,
          totalGames,
          // limit,
          hasNextPage,
          hasPrevPage,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching game history:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const blockAdmin = async (req, res) => {
  try {
    const { adminId } = req.body;
    const admin = await Admin.findOne({ adminId: adminId });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    admin.isBlocked = true;
    await admin.save();
    res.status(200).json({ message: "Admin blocked successfully" });
  } catch (error) {
    console.error("Error blocking admin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const unblockAdmin = async (req, res) => {
  try {
    const { adminId } = req.body;
    const admin = await Admin.findOne({ adminId: adminId });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    admin.isBlocked = false;
    await admin.save();
    res.status(200).json({ message: "Admin unblocked successfully" });
  } catch (error) {
    console.error("Error unblocking admin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.body;
    const result = await Admin.findOneAndDelete({ adminId: adminId });
    if (!result) {
      return res.status(404).json({ error: "Admin not found" });
    }
    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (error) {
    console.error("Error deleting admin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPercentage = async (req, res) => {
  try {
    let betPercentage = await BetPercentage.findOne();
    if (!betPercentage) {
      betPercentage = await BetPercentage.create({ percentage: 85 });
    }
    res.json({ percentage: betPercentage.percentage });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching bet percentage", error: error.message });
  }
};

export const updatePercentage = async (req, res) => {
  try {
    const { percentage } = req.body;
    if (percentage < 0 ) {
      return res
        .status(400)
        .json({ message: "Percentage must be greater than 0" });
    }
    let betPercentage = await BetPercentage.findOne();
    if (!betPercentage) {
      betPercentage = new BetPercentage();
    }
    betPercentage.percentage = percentage;
    await betPercentage.save();
    res.json({ message: "Bet percentage updated successfully", percentage });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating bet percentage", error: error.message });
  }
};

export const getWalletHistory = async (req, res) => {
  try {
    const { adminId } = req.params;
    const page = parseInt(req.query.page) || 1;

    const skip = page - 1;
    const totalTransactions = await WalletTransaction.countDocuments({
      adminId,
    });

    let transactions = await WalletTransaction.find({ adminId })
      .sort({ timestamp: -1 })
      .skip(skip);

    // Format the timestamp to Maharashtra time (GMT+5:30)
    transactions = transactions.map((t) => ({
      ...t._doc,
      timestamp: t.timestamp.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "medium",
      }),
    }));

    // .limit(limit);
    const totalPages = Math.ceil(totalTransactions);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          currentPage: page,
          totalPages,
          totalTransactions,
          hasNextPage,
          hasPrevPage,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching wallet history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const setWithdrawalAmount = async (req, res) => {
  try {
    const { adminId, amount } = req.body;
    if (!adminId || !amount || amount <= 0) {
      return res.status(400).json({
        error:
          "Invalid input. Please provide a valid adminId and a positive amount.",
      });
    }
    const admin = await Admin.findOne({ adminId });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    if (admin.wallet < amount) {
      return res.status(400).json({
        error: "Insufficient funds in admin's wallet",
        currentBalance: admin.wallet,
      });
    }
    admin.wallet -= Number(amount);
    await admin.save();
    const transaction = new WalletTransaction({
      adminId: admin.adminId,
      amount: amount,
      transactionType: "withdraw",
    });
    await transaction.save();
    res.status(200).json({
      message: "Withdrawal processed successfully",
      adminId: admin.adminId,
      withdrawnAmount: amount,
      newBalance: admin.wallet,
      transaction: {
        amount: transaction.amount,
        transactionType: transaction.transactionType,
        timestamp: transaction.timestamp,
      },
    });
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAdminWinnings = async (req, res) => {
  try {
    const adminId = req.params;
    console.log(adminId);

    // Ensure the requesting admin can only access their own data
    // Uncomment and adjust this check if necessary
    if (adminId !== adminId) {
      return res.status(403).json({
        success: false,
        error: "You can only view your own winnings",
      });
    }

    // Use an object as a filter for the query
    const winnings = await AdminWinnings.find(adminId).sort({
      timestamp: -1,
    });

    console.log("winnings ", winnings);

    // If no winnings found, handle that case
    // if (!winnings.length) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "No winnings found for this admin",
    //   });
    // }

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
