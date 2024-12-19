import mongoose from 'mongoose';

const transactionHistorySchema = new mongoose.Schema({
    adminId: {
        type: String,
        required: true,
        index: true
    },
    subAdminId: {
        type: String,
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true
    },
    transactionType: {
        type: String,
        enum: ['TRANSFER'],
        default: 'TRANSFER'
    },
    status: {
        type: String,
        enum: ['SUCCESS', 'FAILED'],
        default: 'SUCCESS'
    },
    adminBalanceBefore: {
        type: Number,
        required: true
    },
    adminBalanceAfter: {
        type: Number,
        required: true
    },
    subAdminBalanceBefore: {
        type: Number,
        required: true
    },
    subAdminBalanceAfter: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add indexes for better query performance
transactionHistorySchema.index({ createdAt: -1 });
transactionHistorySchema.index({ adminId: 1, createdAt: -1 });
transactionHistorySchema.index({ subAdminId: 1, createdAt: -1 });

const TransactionHistory = mongoose.model('TransactionHistory', transactionHistorySchema);
export default TransactionHistory;