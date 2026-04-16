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
const adminRoutes = require("./routes/admin.routes");
const employeeRoutes = require("./routes/employee.routes");
const companyRoutes = require("./routes/company.routes");
const filterRoutes = require("./routes/filter.routes");

app.use("/user", userRoutes);
app.use("/admin", adminRoutes);
app.use("/employee", employeeRoutes);
app.use("/company", companyRoutes);
app.use("/filters", filterRoutes);

app.get("/", (req, res) => {
    res.send("Auth API Running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});