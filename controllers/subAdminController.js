import SubAdmin from '../models/SubAdmin.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import UserCount  from '../models/UserCount.js';
import { getIO } from '../socket/sockectServer.js'; 

// New
export const create = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Assuming logged-in Admin's ID is available in `req.admin.adminId`
        const adminId = req.admin.adminId;

        // Check if SubAdmin already exists with this email
        const existingSubAdmin = await SubAdmin.findOne({ email });

        if (existingSubAdmin) {
            return res.status(400).send({ error: "Email already in use" });
        }
        
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
                adminId: subAdmin.adminId,
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
                message: 'Admin not found' 
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
export const logout = async (req, res) => {
    try {
        const admin = await SubAdmin.findById(req.admin._id);

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