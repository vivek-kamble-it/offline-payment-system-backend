//Controller = contains the actual logic

import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Transaction from "../models/Transaction.js";
import crypto from "crypto";
import QRCode from "qrcode";

export const registerUser = async (req, res) => {
    try {
        const {name, email, password}= req.body;

        const hashPassword = await bcrypt.hash(password,10);

        const user = await User.create({
            name,
            email,
            password: hashPassword
        });

        
        res.status(201).json({
            message: "User Registeration Successfuly",
            user
        });

    } catch (error) {
        res.status(500).json({
            message:"Registration failled",
            error: error.message
        });
    }
};

export const loginUser = async (req, res) => {
    console.log("LOGIN API CALLED");
 try{
     const {email, password} = req.body;

     //Find one user whose email matches the email provided by the user
     const user = await User.findOne({ email});

     if(!user){
         return res.status(404).json({
                message: "User not found"
            });
     }

     const isPasswordCorrect = await bcrypt.compare(
        password,
        user.password
     );

     if(!isPasswordCorrect){
         return res.status(401).json({
                message: "Invalid password"
            });
     };

     //JWT TOKEN
    const token = jwt.sign(//creates token
        {userId: user._id},//Stores the user's ID inside the token
        process.env.JWT_SECRET,//Uses a secret key to sign the token
        {expiresIn: "1D"}//Makes the token expire after 1 day.
    );


    res.status(200).json({
            message: "Login successful",
            token,//token
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                walletBalance: user.walletBalance
            }
        });


} catch(error){
    res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    }
};


export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "Profile fetched successfully",
            user
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch profile",
            error: error.message
        });
    }
};


export const getWalletBalance = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "Wallet balance fetched successfully",
            walletBalance: user.walletBalance
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch wallet balance",
            error: error.message
        });
    }
};

export const addMoney = async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                message: "Enter a valid amount"
            });
        }

        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        user.walletBalance += amount;

        await user.save();

        res.status(200).json({
            message: "Money added successfully",
            walletBalance: user.walletBalance
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to add money",
            error: error.message
        });
    }
};



//-----Transaction Part-------
export const createTransaction = async (req, res) =>{
    try {
        const {receiverId, amount} = req.body;

        //check amount
        if(!amount || amount <= 0){ //If amount is missing OR amount is zero/negative, reject the transaction
            return res.status(400).json({
                message: "Enter a valid amount"
            });
        }

        // Find sender using logged-in user's ID
        const sender = await User.findById(req.user.userId);

        if(!sender){
            return res.status(404).json({
                message: "Sender not found"
            });
        }

        //Find Receiver 
        const receiver = await User.findById(receiverId);

        if(!receiver){
            return res.status(404).json({
                message: "Receiver not found"
            });
        }

        // Prevent sending money to yourself
    if (sender._id.toString() === receiver._id.toString()) {
        return res.status(400).json({
            message: "You cannot send money to yourself"
        });
    }

         // Check sender's balance
         if(sender.walletBalance < amount){
            return res.status(400).json({
                message:"Insufficient wallet Balance"
            });
         }

         //Deduct money from sender 
         sender.walletBalance -= amount;

         //Add money to receiver
         receiver.walletBalance += amount;

         // Save both users
        await sender.save();
        await receiver.save();


        // Create unique transaction ID
        const transactionId = "TXN" + Date.now();

        // Create unique nonce
        const nonce = crypto.randomBytes(16).toString("hex");
        //Nonce = a unique random value attached to a transaction to help prevent/identify duplicate or replayed transaction requests.

        //Create transaction record 
        const transaction = await Transaction.create({
            transactionId,
            sender: sender._id,
            receiver: receiver._id,
            amount,
            status:"SUCCESS",
            type: "ONLINE",
            nonce
        });

         res.status(201).json({
            message: "Transaction successful",
            transaction
        });
    } catch (error) {
         res.status(500).json({
            message: "Transaction failed",
            error: error.message
        });
    }
}

//------Transaction History----- 

//all offline transactions:
// GET http://localhost:5000/api/user/transactions?type=OFFLINE

// Successful transactions:
// GET http://localhost:5000/api/user/transactions?status=SUCCESS

// Successful offline transactions:
// GET http://localhost:5000/api/user/transactions?type=OFFLINE&status=SUCCESS
export const getTransactionHistory = async (req, res) => {
    try {
        const { type, status } = req.query;
        
        // Find transactions where the logged-in user
        // is either the sender or receiver
        const filter = {
            $or: [//sender = logged-in user OR receiver = logged-in user
                { sender: req.user.userId },
                { receiver: req.user.userId }
            ]//Find documents where at least one of these conditions is true
        }
        // Optional filters
        if (type) {
            filter.type = type;
        }

        if (status) {
            filter.status = status;
        }

        const transactions = await Transaction.find(filter)
        // The .populate() part will show the user's name and email instead of only MongoDB IDs
        .populate("sender", "name email")
        .populate("receiver", "name email")
        // The newest transaction appears first because we used:
        .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Transaction history fetched successfully",
            count: transactions.length,
            transactions
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch transaction history",
            error: error.message
        });
    }
};

//-----Offline Transaction ---
export const createOfflineTransaction = async (req, res) => {
    try {
        const { receiverId, amount } = req.body;

        // Check amount
        if (!amount || amount <= 0) {
            return res.status(400).json({
                message: "Enter a valid amount"
            });
        }

        // Find sender
        const sender = await User.findById(req.user.userId);

        if (!sender) {
            return res.status(404).json({
                message: "Sender not found"
            });
        }

        // Find receiver
        const receiver = await User.findById(receiverId);

        if (!receiver) {
            return res.status(404).json({
                message: "Receiver not found"
            });
        }

        // Prevent self-payment
        if (sender._id.toString() === receiver._id.toString()) {
            return res.status(400).json({
                message: "You cannot send money to yourself"
            });
        }

        // Calculate remaining offline limit
        const remainingOfflineLimit =
            sender.offlineLimit - sender.offlineSpent;

        // Check offline limit
        if (amount > remainingOfflineLimit) {
            return res.status(400).json({
                message: "Offline transaction limit exceeded",
                remainingOfflineLimit
            });
        }

        

        // Increase offline spent amount
        sender.offlineSpent += amount;

        await sender.save();

        // Create transaction ID
        const transactionId = "OFF" + Date.now();

        const nonce = crypto.randomBytes(16).toString("hex");


        // Create pending transaction
        const transaction = await Transaction.create({
            transactionId,
            sender: sender._id,
            receiver: receiver._id,
            amount,
            status: "PENDING",
            type: "OFFLINE",
            nonce
        });

        return res.status(201).json({
            message: "Offline transaction created",
            transaction,
            remainingOfflineLimit:
                sender.offlineLimit - sender.offlineSpent
        });

    } catch (error) {
        return res.status(500).json({
            message: "Offline transaction failed",
            error: error.message
        });
    }
};

/// Sync offline transaction
export const syncOfflineTransaction = async (req, res) => {
    try {
        const { transactionId } = req.body;

        // Find pending offline transaction
        const transaction = await Transaction.findOne({
            transactionId,
            status: "PENDING",
            type: "OFFLINE"
        });

        if (!transaction) {
            return res.status(404).json({
                message: "Pending offline transaction not found"
            });
        }

        // Find sender
        const sender = await User.findById(transaction.sender);

        if (!sender) {
            return res.status(404).json({
                message: "Sender not found"
            });
        }

        // Find receiver
        const receiver = await User.findById(transaction.receiver);

        if (!receiver) {
            return res.status(404).json({
                message: "Receiver not found"
            });
        }

        // Check sender's wallet balance
        if (sender.walletBalance < transaction.amount) {

            transaction.status = "FAILED";

            // Release the reserved offline limit
            sender.offlineSpent -= transaction.amount;

            if (sender.offlineSpent < 0) {
                sender.offlineSpent = 0;
            }

            await sender.save();
            await transaction.save();

            return res.status(400).json({
                message: "Insufficient wallet balance",
                transaction
            });
        }

        // Deduct money from sender
        sender.walletBalance -= transaction.amount;

        // Add money to receiver
        receiver.walletBalance += transaction.amount;

        // Release offline spending reservation
        sender.offlineSpent -= transaction.amount;

        if (sender.offlineSpent < 0) {
            sender.offlineSpent = 0;
        }

        // Mark transaction successful
        transaction.status = "SUCCESS";

        await sender.save();
        await receiver.save();
        await transaction.save();

        return res.status(200).json({
            message: "Offline transaction synchronized successfully",
            transaction
        });

    } catch (error) {
        return res.status(500).json({
            message: "Offline transaction synchronization failed",
            error: error.message
        });
    }
};


//------Transaction Status
export const getTransactionStatus = async (req, res) => {
    try {
        const { transactionId } = req.params;

        const transaction = await Transaction.findOne({
            transactionId
        })
            .populate("sender", "name email")
            .populate("receiver", "name email");

        if (!transaction) {
            return res.status(404).json({
                message: "Transaction not found"
            });
        }

        // Check whether logged-in user is sender or receiver
        const userId = req.user.userId;

        const senderId = transaction.sender._id.toString();
        const receiverId = transaction.receiver._id.toString();

        if (userId !== senderId && userId !== receiverId) {
            return res.status(403).json({
                message: "You are not authorized to view this transaction"
            });
        }

        return res.status(200).json({
            message: "Transaction status fetched successfully",
            transaction
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch transaction status",
            error: error.message
        });
    }
};

//------QR-code---- 
export const generateQRCode = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // QR contains only receiver ID
        const qrData = `PAYAPP:USER:${user._id}`;

        // Generate QR as Base64 image
        const qrCode = await QRCode.toDataURL(qrData);

        return res.status(200).json({
            message: "QR code generated successfully",
            qrData,
            qrCode
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to generate QR code",
            error: error.message
        });
    }
};

//----verify QR code 
export const verifyQRCode = async (req, res) => {
    try {
        const { qrData } = req.body;

        if (!qrData) {
            return res.status(400).json({
                message: "QR data is required"
            });
        }

        // Check QR format
        if (!qrData.startsWith("PAYAPP:USER:")) {
            return res.status(400).json({
                message: "Invalid QR code"
            });
        }

        // Extract receiver ID
        const receiverId = qrData.replace("PAYAPP:USER:", "");

        const receiver = await User.findById(receiverId)
            .select("-password");

        if (!receiver) {
            return res.status(404).json({
                message: "Receiver not found"
            });
        }

        return res.status(200).json({
            message: "QR code verified successfully",
            receiver: {
                id: receiver._id,
                name: receiver.name,
                email: receiver.email
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: "QR verification failed",
            error: error.message
        });
    }
};


//---- Wellet Summary----
export const getWalletSummary = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const remainingOfflineLimit =
            user.offlineLimit - user.offlineSpent;

        return res.status(200).json({
            message: "Wallet summary fetched successfully",
            wallet: {
                walletBalance: user.walletBalance,
                offlineLimit: user.offlineLimit,
                offlineSpent: user.offlineSpent,
                remainingOfflineLimit
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: "Failed to fetch wallet summary",
            error: error.message
        });
    }
};