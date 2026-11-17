const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
        statusCode = 400;
        message = "SKU already exists. Please use a unique SKU.";
    }

    // Handle invalid MongoDB ID
    if (err.name === "CastError") {
        statusCode = 400;
        message = "Invalid product ID";
    }

    // Handle Mongoose validation errors
    if (err.name === "ValidationError") {
        statusCode = 400;
        message = Object.values(err.errors)
            .map(error => error.message)
            .join(", ");
    }

    res.status(statusCode).json({
        success: false,
        message: message
    });
};

module.exports = errorHandler;