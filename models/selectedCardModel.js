import mongoose from 'mongoose';
// import moment from 'moment-timezone';

const SelectedCardSchema = new mongoose.Schema({
    gameId: { type: String },
    cardId: { type: String },
    multiplier: { type: Number }, // Use Number for multiplier
    amount: { type: Number },
    drowTime: {
        type: String,
        default: Date.now
    }
});


export default mongoose.model('SelectedCard', SelectedCardSchema);