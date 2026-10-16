import express from 'express'
import dotenv from 'dotenv'
import connectDB from './config/db.js';
import userRoutes from "./routes/userRoutes.js";
import logger from "./middleware/logger.js";
import cors from "cors";


dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
//mongoose
connectDB();

//middleware
app.use(logger);

// Allow frontend to communicate with backend
app.use(cors());

//routes
app.use(express.json());

app.use("/api/user",userRoutes);


app.get("/",(req,res)=>{
    res.send("offline-payment backend is running");
})

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});
