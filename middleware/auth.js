// middleware/auth.js
import jwt from 'jsonwebtoken';
import SuperAdmin from '../models/SuperAdmin.js';
import Admin from '../models/Admin.js';
import SubAdmin from '../models/SubAdmin.js';

export const authSuperAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const superAdmin = await SuperAdmin.findById(decoded._id);

    if (!superAdmin) {
      throw new Error();
    }

    req.superAdmin = superAdmin;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).send({ error: 'Please authenticate as Super Admin' });
  }
};

// New
export const authAdmin = async (req, res, next) => {
  try {
    // Check if Authorization header exists
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: 'No Authorization header' 
      });
    }

    // Extract token, handling both ' Bearer token' and just 'token' formats
    const token = authHeader.includes('Bearer ') 
      ? authHeader.replace('Bearer ', '') 
      : authHeader;
      
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (verifyError) {
      // Handle different JWT errors
      if (verifyError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Token expired' 
        });
      }
      if (verifyError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid token' 
        });
      }
      throw verifyError;
    }

    // Find admin with decoded ID
    const admin = await Admin.findOne({
      _id: decoded._id,
    });
    
    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Please authenticate as Admin' 
      });
    }

    // Attach token and admin to request
    req.token = token;
    req.admin = admin;
    req.adminId = admin.adminId;

    next();
  } catch (error) {
    console.error('Authentication Error:', error);
    
    res.status(401).json({ 
      success: false, 
      message: 'Please authenticate as Admin',
      error: error.message 
    });
  }
};

// New
export const authSubAdmin = async (req, res, next) => {
  try {
    // Check if Authorization header exists
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: 'No Authorization header' 
      });
    }

    // Extract token, handling both ' Bearer token' and just 'token' formats
    const token = authHeader.includes('Bearer ') 
      ? authHeader.replace('Bearer ', '') 
      : authHeader;

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (verifyError) {
      // Handle different JWT errors
      if (verifyError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Token expired' 
        });
      }
      if (verifyError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid token' 
        });
      }
      throw verifyError;
    }

    // Find admin with decoded ID
    const admin = await SubAdmin.findOne({
      _id: decoded._id,
      // Optional: Add additional checks if needed
      // adminId: req.params.adminId, // Uncomment if you want to match adminId from params
      // isLoggedIn: true // Ensure admin is still logged in
    });

    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Please authenticate as Admin' 
      });
    }

    // Attach token and admin to request
    req.token = token;
    req.admin = admin;

    next();
  } catch (error) {
    console.error('Authentication Error:', error);
    
    res.status(401).json({ 
      success: false, 
      message: 'Please authenticate as Admin',
      error: error.message 
    });
  }
};