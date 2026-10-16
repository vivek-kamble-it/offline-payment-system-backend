//name,email,password,walletBalance,createdAt

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name:{
            type: String,
            required: true
        },
        email:{
            type: String,
            required: true,
            unique: true
        },
        password:{
            type: String,
            required:true
        },
        walletBalance:{
            type: Number,
            default: 0 
        },

        offlineLimit: {
            type: Number,
            default: 500
        },

        offlineSpent: {
            type: Number,
        default: 0
        }
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User",userSchema);

export default User;