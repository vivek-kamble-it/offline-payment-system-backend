//Route = decides which function should run.

import express from 'express'
import {loginUser,
     registerUser,
     getProfile,
     getWalletBalance, 
     addMoney, 
     createTransaction, 
     getTransactionHistory, 
     createOfflineTransaction, 
     syncOfflineTransaction,
     getTransactionStatus,
     generateQRCode,
     verifyQRCode,
     getWalletSummary} from '../controller/userController.js';
import authMiddleware from "../middleware/authmiddleware.js";

const router = express.Router();

// router.get("/",getUsers);
router.post("/register",registerUser);
router.post("/login",loginUser);
router.get("/profile", authMiddleware, getProfile);
router.get("/wallet", authMiddleware, getWalletBalance);
router.post("/wallet/add", authMiddleware, addMoney);
//Transaction 
router.post("/transaction", authMiddleware, createTransaction);
//Transaction history
router.get("/transactionHistory",authMiddleware,getTransactionHistory);
//offline transaction route
router.post("/transaction/offline",authMiddleware,createOfflineTransaction);
//sync transaction
router.post(
    "/transaction/sync",
    authMiddleware,
    syncOfflineTransaction
);
// transaction status route http://localhost:5000/api/user/transaction/OFF1790422253946(transactionId)
router.get(
    "/transaction/:transactionId",
    authMiddleware,
    getTransactionStatus
);
//qr code route 
router.get(
    "/qr",
    authMiddleware,
    generateQRCode
);
//verify qr code 
router.post(
    "/qr/verify",
    authMiddleware,
    verifyQRCode
);
//Wallet Summary 
router.get(
    "/wallet/summary",
    authMiddleware,
    getWalletSummary
);

export default router