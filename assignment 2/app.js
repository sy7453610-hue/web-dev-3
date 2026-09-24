const express = require("express");
const studentRoutes = require("./routes/studentRoutes");
const logger = require("./middleware/logger");

const app = express();
const PORT = 3000;

// Middleware to read JSON data
app.use(express.json());

// Custom logger middleware
app.use(logger);

// Student routes
app.use("/students", studentRoutes);

// Handle unknown routes
app.use((req, res) => {
    res.status(404).json({
        message: "Route not found"
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});