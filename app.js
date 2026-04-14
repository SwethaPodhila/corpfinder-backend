const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

const userRoutes = require("./routes/user.routes");

app.use("/user", userRoutes);

app.get("/", (req, res) => {
    res.send("Auth API Running...");
});

const PORT = 5000;

app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});