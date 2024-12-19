// import mongoose from 'mongoose';

// // UserCount Schema
// const userCountSchema = new mongoose.Schema({
//   date: {
//     type: Date,
//     default: Date.now,
//     unique: true
//   },
//   totalLogins: {
//     type: Number,
//     default: 0
//   },
//   uniqueUsers: [{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Admin'
//   }],
//   loggedInUsers: {
//     type: Number,
//     default: 0
//   }
// }, { timestamps: true });

// export default userCountSchema;


import mongoose from 'mongoose';

const userCountSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now,
    unique: true
  },
  totalLogins: {
    type: Number,
    default: 0
  },
  uniqueUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }],
  loggedInUsers: {
    type: Number,
    default: 0
  }
}, 
// { timestamps: true }
);

// Method to initialize the first record if no record exists
userCountSchema.statics.initializeIfEmpty = async function() {
  const count = await this.countDocuments();
  if (count === 0) {
    const initialRecord = new this({
      date: new Date(),
      totalLogins: 0,
      uniqueUsers: [],
      loggedInUsers: 0
    });
    await initialRecord.save();
    console.log('Initial UserCount record created');
  }
};

const UserCount = mongoose.model('UserCount', userCountSchema);

// Call initialization when the model is defined
UserCount.initializeIfEmpty().catch(err => {
  console.error('Error initializing UserCount:', err);
});

export default UserCount;