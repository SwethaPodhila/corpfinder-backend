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
const employeeRoutes = require("./routes/employeesCompanies.routes");
const companyRoutes = require("./routes/company.routes");
const filterRoutes = require("./routes/filter.routes");
//const downloadRoutes = require("./routes/dowloads.routes");
const downloadRoutes = require("./routes/dowloads.routes");
const PaymentRoutes = require("./routes/payment.routes");

app.use("/user", userRoutes);
app.use("/admin", adminRoutes);
app.use("/employees", employeeRoutes);
app.use("/company", companyRoutes);
app.use("/filters", filterRoutes);
app.use("/downloads", downloadRoutes);
console.log("downloadRoutes:", typeof downloadRoutes);
app.use("/payment", PaymentRoutes);

app.get("/", (req, res) => {
    res.send("Auth API Running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});