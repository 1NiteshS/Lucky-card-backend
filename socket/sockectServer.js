// import Game from "../models/gameModel.js";
// import { Server } from "socket.io";
// import {
//   calculateAmounts as calcAmounts,
//   getCurrentGame,
//   placeAutomatedBet,
// } from "../controllers/cardController.js";
// let mainTime = 40;
// let timer = {
//   remainingTime: mainTime,
//   isRunning: false,
// };
// // Increased the calculation start time to ensure results arrive before last 5 seconds
// const CALCULATION_START_TIME = 10; // Increased from 9 to 15 seconds
// const RESULT_DEADLINE = 5; // Results must be ready by this many seconds before end
// let timerInterval;
// let calculationPromise = null; // To store ongoing calculation
// // Start and manage the timer
// const startTimer = (socket) => {
//   if (!timer.isRunning) {
//     timer.isRunning = true;
//     timer.remainingTime = mainTime;
//     let calculatedAmounts = null;
//     let gameID = null;
//     let previousGameID = null;
//     let calculationStarted = false;
//     broadcastTimerUpdate(socket);
//     timerInterval = setInterval(async () => {
//       try {
//         if (timer.remainingTime > 0) {
//           timer.remainingTime -= 1;
//           console.log(timer.remainingTime);
//           // Start calculation earlier and store the promise
//           if (
//             timer.remainingTime === CALCULATION_START_TIME &&
//             !calculationStarted
//           ) {
//             console.log("Starting calculations early...");
//             calculationStarted = true;
//             calculationPromise = calcAmounts(timer.remainingTime).catch(
//               (error) => {
//                 console.error("Calculation error:", error);
//                 return null;
//               }
//             );
//           }
//           // Call placeAutomatedBet API only in the last 12 seconds
//           if (timer.remainingTime == 30) {
//             await placeAutomatedBet();
//           }
//           // Check if calculation is complete by RESULT_DEADLINE
//           if (timer.remainingTime === RESULT_DEADLINE && calculationPromise) {
//             console.log("Ensuring calculation completion...");
//             calculatedAmounts = await Promise.race([
//               calculationPromise,
//               new Promise((_, reject) =>
//                 setTimeout(() => reject(new Error("Calculation timeout")), 2000)
//               ),
//             ]).catch((error) => {
//               console.error("Failed to get results by deadline:", error);
//               return null;
//             });
//           }
//           if (timer.remainingTime === mainTime - 2) {
//             const result = await getCurrentGame();
//             if (result.success) {
//               gameID = result.data.gameId;
//               if (gameID === previousGameID) {
//                 console.log("GameID unchanged, retrieving data again...");
//                 const refreshedResult = await getCurrentGame();
//                 if (refreshedResult.success) {
//                   gameID = refreshedResult.data.gameId;
//                 } else {
//                   console.error(
//                     "Failed to refresh game data:",
//                     refreshedResult.message
//                   );
//                 }
//               }
//               previousGameID = gameID;
//             } else {
//               console.error("Failed to get current game:", result.message);
//             }
//           }
//           // Broadcast calculated amounts if available
//           if (
//             timer.remainingTime <= CALCULATION_START_TIME &&
//             calculatedAmounts
//           ) {
//             broadcastTimerUpdate(socket, gameID, calculatedAmounts);
//           } else {
//             broadcastTimerUpdate(socket, gameID);
//           }
//         } else {
//           // Timer hit zero
//           clearInterval(timerInterval);
//           timer.isRunning = false;
//           calculationPromise = null;
//           calculatedAmounts = null;
//           const newGameId = await createNewGame();
//           broadcastTimerUpdate(socket, newGameId);
//           setTimeout(() => {
//             resetAndRestartTimer(socket);
//           }, 1000);
//         }
//       } catch (error) {
//         console.error("Error during timer tick:", error);
//         clearInterval(timerInterval);
//         timer.isRunning = false;
//         calculationPromise = null;
//       }
//     }, 1000);
//   }
// };
// // Helper to reset and restart the timer
// const resetAndRestartTimer = (socket) => {
//   timer.remainingTime = mainTime;
//   timer.isRunning = false;
//   broadcastTimerUpdate(socket);
//   startTimer(socket);
// };
// const broadcastTimerUpdate = (
//   socket,
//   newGameId = null,
//   calculatedAmounts = null
// ) => {
//   const updateData = {
//     remainingTime: timer.remainingTime,
//     isRunning: timer.isRunning,
//   };
//   if (newGameId !== null) {
//     updateData.newGameId = newGameId;
//   }
//   if (calculatedAmounts !== null) {
//     updateData.calculatedAmounts = calculatedAmounts;
//   }
//   socket.emit("timerUpdate", updateData);
//   socket.broadcast.emit("timerUpdate", updateData);
// };
// const createNewGame = async () => {
//   const newGame = new Game({
//     Bets: [],
//   });
//   await newGame.save();
//   return newGame._id.toString();
// };
// const startSocket = (httpServer) => {
//   const io = new Server(httpServer, {
//     cors: {
//       origin: "*",
//     },
//   });
//   io.on("connection", (socket) => {
//     console.log("A user connected");
//     socket.emit("timerUpdate", {
//       remainingTime: timer.remainingTime,
//       isRunning: timer.isRunning,
//     });
//     socket.on("startTimer", () => {
//       startTimer(socket);
//     });
//     socket.on("disconnect", () => {
//       console.log("User disconnected");
//     });
//   });
// };
// export { startSocket };



import Game from '../models/gameModel.js';
import User from '../models/Admin.js';
import UserCount from '../models/UserCount.js'
import { Server } from "socket.io";
import { calculateAmounts as calcAmounts, getCurrentGame } from '../controllers/cardController.js';

let mainTime = 120;
let timer = {
    remainingTime: mainTime,
    isRunning: false
};
let connectedUsers = 0;

const CALCULATION_START_TIME = 10;
const RESULT_DEADLINE = 5;
let timerInterval;
let calculationPromise = null;
let io = null; // Add this to store socket instance globally

// Initialize timer at server start
const initializeTimer = (socket) => {
    if (!timer.isRunning) {
        startTimer(socket);
    }
};

const startTimer = (socketOrIO) => {
    if (!timer.isRunning) {
        timer.isRunning = true;
        timer.remainingTime = mainTime;
        let calculatedAmounts = null;
        let gameID = null;
        let previousGameID = null;
        let calculationStarted = false;
        
        broadcastTimerUpdate(socketOrIO);
        
        timerInterval = setInterval(async () => {
            try {
                if (timer.remainingTime > 0) {
                    timer.remainingTime -= 1;
                    console.log(timer.remainingTime);

                    if (timer.remainingTime === CALCULATION_START_TIME && !calculationStarted) {
                        console.log('Starting calculations early...');
                        calculationStarted = true;
                        calculationPromise = calcAmounts(timer.remainingTime).catch(error => {
                            console.error('Calculation error:', error);
                            return null;
                        });
                    }

                    if (timer.remainingTime === RESULT_DEADLINE && calculationPromise) {
                        console.log('Ensuring calculation completion...');
                        calculatedAmounts = await Promise.race([
                            calculationPromise,
                            new Promise((_, reject) =>
                                setTimeout(() => reject(new Error('Calculation timeout')), 2000)
                            )
                        ]).catch(error => {
                            console.error('Failed to get results by deadline:', error);
                            return null;
                        });
                        console.log('calculatedAmounts', calculatedAmounts);
                        
                    }

                    if (timer.remainingTime === mainTime - 2) {
                        const result = await getCurrentGame();
                        if (result.success) {
                            gameID = result.data.gameId;
                            if (gameID === previousGameID) {
                                console.log('GameID unchanged, retrieving data again...');
                                const refreshedResult = await getCurrentGame();
                                if (refreshedResult.success) {
                                    gameID = refreshedResult.data.gameId;
                                } else {
                                    console.error('Failed to refresh game data:', refreshedResult.message);
                                }
                            }
                            previousGameID = gameID;
                        } else {
                            console.error('Failed to get current game:', result.message);
                        }
                    }

                    if (timer.remainingTime <= CALCULATION_START_TIME && calculatedAmounts) {
                        broadcastTimerUpdate(socketOrIO, gameID, calculatedAmounts);
                    } else {
                        broadcastTimerUpdate(socketOrIO, gameID);
                    }
                } else {
                    clearInterval(timerInterval);
                    timer.isRunning = false;
                    calculationPromise = null;
                    calculatedAmounts = null;
                    const newGameId = await createNewGame();
                    broadcastTimerUpdate(socketOrIO, newGameId);
                    setTimeout(() => {
                        resetAndRestartTimer(socketOrIO);
                    }, 1000);
                }
            } catch (error) {
                console.error('Error during timer tick:', error);
                clearInterval(timerInterval);
                timer.isRunning = false;
                calculationPromise = null;
            }
        }, 1000);
    }
};

const resetAndRestartTimer = (socketOrIO) => {
    timer.remainingTime = mainTime;
    timer.isRunning = false;
    broadcastTimerUpdate(socketOrIO);
    startTimer(socketOrIO);
};

const broadcastTimerUpdate = async (socketOrIO, newGameId = null, calculatedAmounts = null) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const userCount = await UserCount.findOne({
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        }) || { loggedInUsers: 0, totalLogins: 0, uniqueUsers: [] };

        const updateData = {
            remainingTime: timer.remainingTime,
            isRunning: timer.isRunning,
            connectedUsers: userCount.loggedInUsers,
            totalLogins: userCount.totalLogins,
            uniqueUsers: userCount.uniqueUsers.length
        };
        
        if (newGameId !== null) {
            updateData.newGameId = newGameId;
        }
        if (calculatedAmounts !== null) {
            updateData.calculatedAmounts = calculatedAmounts;
        }

        // Check if we're dealing with a socket instance or the io server
        if (socketOrIO.broadcast) {
            // It's a socket instance
            socketOrIO.emit("timerUpdate", updateData);
            socketOrIO.broadcast.emit("timerUpdate", updateData);
        } else {
            // It's the io server
            socketOrIO.emit("timerUpdate", updateData);
        }
    } catch (error) {
        console.error('Error broadcasting timer update:', error);
        // Send update without user count in case of error
        const basicUpdateData = {
            remainingTime: timer.remainingTime,
            isRunning: timer.isRunning
        };
        
        if (socketOrIO.broadcast) {
            socketOrIO.emit("timerUpdate", basicUpdateData);
            socketOrIO.broadcast.emit("timerUpdate", basicUpdateData);
        } else {
            socketOrIO.emit("timerUpdate", basicUpdateData);
        }
    }
};


const createNewGame = async () => {
    const newGame = new Game({
        Bets: []
    });
    await newGame.save();
    return newGame._id.toString();
};

// Initialize socket connection
    const startSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*",
        },
    });

    io.on("connection", async (socket) => {
        console.log("A user connected");

        try {
            // Get initial user counts and send initial timer state
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const userCount = await UserCount.findOne({
                date: {
                    $gte: today,
                    $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                }
            }) || { loggedInUsers: 0, totalLogins: 0, uniqueUsers: [] };

            // Send initial state with user count
            socket.emit("timerUpdate", {
                remainingTime: timer.remainingTime,
                isRunning: timer.isRunning,
                connectedUsers: userCount.loggedInUsers,
                totalLogins: userCount.totalLogins,
                uniqueUsers: userCount.uniqueUsers.length
            });

            // Handle timer start
            socket.on("startTimer", () => {
                startTimer(socket);
            });

            // Add handler for stopping timer
            socket.on("stopTimer", () => {
                stopTimer();
                socket.emit("timerStopped", {
                    message: "Timer stopped successfully"
                });
            });

            // Handle force disconnect
            socket.on("forceDisconnect", async () => {
                stopTimer();
                socket.emit("timerStopped", {
                    message: "Timer stopped and disconnected"
                });
                socket.disconnect(true);
            });

            // Handle user login
            socket.on('userLogin', async (adminId) => {
                try {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const userCount = await UserCount.findOne({
                        date: {
                            $gte: today,
                            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                        }
                    });

                    if (userCount) {
                        // Broadcast updated counts to all clients
                        io.emit('userCountUpdate', {
                            loggedInUsers: userCount.loggedInUsers,
                            totalLogins: userCount.totalLogins,
                            uniqueUsers: userCount.uniqueUsers.length
                        });

                        // Trigger a timer update to include new user count
                        await broadcastTimerUpdate(io);
                    }
                } catch (error) {
                    console.error('Login count update error:', error);
                }
            });

            // Handle user logout
            socket.on('userLogout', async (adminId) => {
                try {
                    const admin = await User.findById(adminId);
                    if (admin) {
                        admin.isLoggedIn = false;
                        await admin.save();

                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const userCount = await UserCount.findOne({
                            date: {
                                $gte: today,
                                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                            }
                        });

                        if (userCount) {
                            userCount.loggedInUsers -= 1;
                            await userCount.save();

                            // Broadcast updated counts to all clients
                            io.emit('userCountUpdate', {
                                loggedInUsers: userCount.loggedInUsers,
                                totalLogins: userCount.totalLogins,
                                uniqueUsers: userCount.uniqueUsers.length
                            });

                            // Trigger a timer update to include new user count
                            await broadcastTimerUpdate(io);
                        }
                    }
                } catch (error) {
                    console.error('Logout count update error:', error);
                }
            });

        } catch (error) {
            console.error('Socket connection error:', error);
        }

        socket.on("disconnect", () => {
            console.log("User disconnected");
        });
    });
};

// Add function to stop timer
const stopTimer = () => {
    if (timer.isRunning) {
        clearInterval(timerInterval);
        timer.isRunning = false;
        timer.remainingTime = mainTime;
        calculationPromise = null;
        if (io) {
            broadcastTimerUpdate(io);
        }
        console.log('Timer stopped successfully');
    }
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized");
    }
    return io;
};

export { startSocket, 
    getIO, 
    startTimer, 
    stopTimer,
};