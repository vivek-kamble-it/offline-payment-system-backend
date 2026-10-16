import mongoose from "mongoose";
//import User from "./user";

const transactionSchema = new mongoose.Schema(
    {
        transactionId :{
            type: String,
            required: true,
            unique: true
        },
        sender :{
            type: mongoose.Schema.Types.ObjectId, // Store the MongoDB ObjectId of the sender
            ref: "User",
            required: true
        },
        receiver :{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        amount :{
            type: Number,
            required: true,
            min: 1 //minimum transaction amount is 1
        },
        status :{
            type: String,
            enum: ["PENDING","SUCCESS","FAILED"],
            default: "PENDING"
        },
        type :{
            type: String,
            enum: ["ONLINE","OFFLINE"],
            required: true
        },

        nonce: { //unique random value that helps prevent replaying the same transaction
            type: String,
            required: true,
            unique: true
        }   
    },
     // Automatically creates createdAt and updatedAt fields
    {
        timestamps: true
    }
);


// Create a Mongoose model using the transaction schema
const Transaction = mongoose.model(
    // Model name
    "Transaction",
    // Schema used by this model
    transactionSchema
);

export default Transaction;
