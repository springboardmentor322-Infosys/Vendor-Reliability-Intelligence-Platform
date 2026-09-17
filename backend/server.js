 const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const vendorCategoryRoutes = require("./routes/vendorCategoryRoutes");
const vendorPerformanceRoutes = require("./routes/vendorPerformanceRoutes");
const vendorReliabilityRoutes = require("./routes/vendorReliabilityRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const procurementRoutes = require("./routes/procurementRoutes");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");
const contractRoutes = require("./routes/contractRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const communicationRoutes = require("./routes/communicationRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminDashboardRoutes = require("./routes/adminDashboardRoutes");
const auditorRoutes = require("./routes/auditorRoutes");

require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Authentication routes
app.use("/api/auth", authRoutes);

app.use("/api/dashboard", dashboardRoutes);

// Vendor routes
app.use("/api/vendors", vendorRoutes);

app.use("/api/vendor-categories", vendorCategoryRoutes);

app.use(
  "/api/vendor-performance",
  vendorPerformanceRoutes
);

app.use(
  "/api/vendor-reliability",
  vendorReliabilityRoutes
);

app.use("/api/invoices", invoiceRoutes);

// Procurement routes
app.use("/api/procurement", procurementRoutes);

// Purchase Order routes
app.use("/api/purchase-orders", purchaseOrderRoutes);

app.use("/api/contracts", contractRoutes);

app.use("/api/analytics", analyticsRoutes);

app.use("/api/deliveries", deliveryRoutes);


app.use(
  "/api/communications",
  communicationRoutes
);

app.use("/api/notifications", notificationRoutes);

app.use("/api/admin/dashboard", adminDashboardRoutes);

app.use("/api/auditor", auditorRoutes);

// Test route
app.get("/", (req, res) => {
    res.send("Vendor Reliability Backend Running");
});


// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        console.log("Database Connection Failed");
        console.log(err.message);
    } else {
        console.log("PostgreSQL Connected Successfully");
        release();
    }
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});