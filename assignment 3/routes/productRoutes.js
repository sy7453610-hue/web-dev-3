const express = require("express");
const router = express.Router();

const Product = require("../models/Product");

// 1. CREATE PRODUCT
router.post("/", async (req, res, next) => {
    try {
        const product = await Product.create(req.body);

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: product
        });
    } catch (error) {
        next(error);
    }
});


// 2. GET ALL PRODUCTS - FILTERING, SORTING AND PAGINATION
router.get("/", async (req, res, next) => {
    try {
        const {
            category,
            search,
            minPrice,
            maxPrice,
            sortBy = "createdAt",
            order = "desc",
            page = 1,
            limit = 10
        } = req.query;

        let filter = {};

        if (category) {
            filter.category = category;
        }

        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }

        if (minPrice || maxPrice) {
            filter.price = {};

            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        const pageNumber = Math.max(1, Number(page) || 1);
        const limitNumber = Math.min(100, Math.max(1, Number(limit) || 10));

        const sortOrder = order.toLowerCase() === "asc" ? 1 : -1;

        const allowedSortFields = [
            "name", "price", "quantity", "createdAt"
        ];

        const sortField = allowedSortFields.includes(sortBy)
            ? sortBy
            : "createdAt";

        const products = await Product.find(filter)
            .sort({ [sortField]: sortOrder })
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber);

        const totalProducts = await Product.countDocuments(filter);

        res.json({
            success: true,
            totalProducts,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalProducts / limitNumber),
            data: products
        });

    } catch (error) {
        next(error);
    }
});


// 3. LOW STOCK REPORT
router.get("/low-stock", async (req, res, next) => {
    try {
        const products = await Product.find({
            $expr: {
                $lte: ["$quantity", "$reorderLevel"]
            }
        });

        res.json({
            success: true,
            count: products.length,
            data: products
        });
    } catch (error) {
        next(error);
    }
});


// 4. CATEGORY-WISE INVENTORY SUMMARY
router.get("/category-summary", async (req, res, next) => {
    try {
        const summary = await Product.aggregate([
            {
                $group: {
                    _id: "$category",
                    totalProducts: { $sum: 1 },
                    totalQuantity: { $sum: "$quantity" },
                    totalStockValue: {
                        $sum: {
                            $multiply: ["$price", "$quantity"]
                        }
                    }
                }
            },
            {
                $sort: { _id: 1 }
            },
            {
                $project: {
                    _id: 0,
                    category: "$_id",
                    totalProducts: 1,
                    totalQuantity: 1,
                    totalStockValue: 1
                }
            }
        ]);

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        next(error);
    }
});


// 5. RESTOCK PRODUCT
router.patch("/:id/restock", async (req, res, next) => {
    try {
        const amount = Number(req.body.amount);

        if (!Number.isInteger(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Restock amount must be a positive integer"
            });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { $inc: { quantity: amount } },
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.json({
            success: true,
            message: "Stock increased successfully",
            data: product
        });
    } catch (error) {
        next(error);
    }
});


// 6. RECORD PRODUCT SALE
router.patch("/:id/sale", async (req, res, next) => {
    try {
        const amount = Number(req.body.amount);

        if (!Number.isInteger(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Sale amount must be a positive integer"
            });
        }

        const product = await Product.findOneAndUpdate(
            {
                _id: req.params.id,
                quantity: { $gte: amount }
            },
            {
                $inc: { quantity: -amount }
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!product) {
            const exists = await Product.exists({ _id: req.params.id });

            return res.status(exists ? 400 : 404).json({
                success: false,
                message: exists
                    ? "Insufficient stock"
                    : "Product not found"
            });
        }

        res.json({
            success: true,
            message: "Sale recorded successfully",
            data: product
        });
    } catch (error) {
        next(error);
    }
});


// 7. GET SINGLE PRODUCT BY ID
router.get("/:id", async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        next(error);
    }
});


// 8. UPDATE PRODUCT
router.put("/:id", async (req, res, next) => {
    try {
        const allowedFields = [
            "name",
            "sku",
            "category",
            "price",
            "quantity",
            "reorderLevel",
            "supplier"
        ];

        const updates = {};

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            updates,
            {
                new: true,
                runValidators: true
            }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.json({
            success: true,
            message: "Product updated successfully",
            data: product
        });
    } catch (error) {
        next(error);
    }
});


// 9. DELETE PRODUCT
router.delete("/:id", async (req, res, next) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.json({
            success: true,
            message: "Product deleted successfully"
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;