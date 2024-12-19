// models/Admin.js
import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        adminId: { type: String, required: true, unique: true },
        lastname: { type: String, default: "XYZ" },
        type: { type: String, default: "admin"},
        device: { type: String, enum: ['PC', 'Phone'], default: "PC"},
        isVerified: { type: Boolean, default: false },
        commission: {type: Number, default: 0},
        otp: { type: String },
        otpExpiry: { type: Date },
        wallet: { type: Number, default: 0 },
        isBlocked: { type: Boolean, default: false },
        ked: { type: Boolean, default: false },
        isLoggedIn: {type: Boolean, default: false}
    },
    { timestamps: true }
);

export default mongoose.model("Admin", AdminSchema);