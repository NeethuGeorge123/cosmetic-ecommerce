const User = require("../../models/userSignupSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Order = require("../../models/orderSchema");

const pageerror = async (req, res) => {
    res.render("admin/admin-error");
};

const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect("/admin/dashboard");
    }
    res.render("admin/admin-login.ejs", { message: null });
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });
        console.log("Admin found:", admin ? true : false);

        if (!admin) {
            return res.redirect("/admin/login");
        }

        const passwordMatch = await bcrypt.compare(password, admin.password);

        if (!passwordMatch) {
            return res.redirect("/admin/login");
        }

        req.session.admin = true;
        return res.redirect("/admin/dashboard");
    } catch (error) {
        console.log("Login Error:", error);
        return res.redirect("/pageerror");
    }
};

const getAdminDashboard = async (req, res) => {
    try {
        console.log("inside dashboard");
        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const initialData = await getDashboardData('monthly', startOfMonth, endOfMonth);

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            ...initialData
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).json({ success: false, message: 'Error loading dashboard' });
    }
};

const getDashboardAnalytics = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        let start, end;
        const currentDate = new Date();

        switch (filter) {
            case 'yearly':
                start = new Date(currentDate.getFullYear(), 0, 1);
                end = new Date(currentDate.getFullYear(), 11, 31);
                break;
            case 'monthly':
                start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                break;
            case 'weekly':
                const startOfWeek = currentDate.getDate() - currentDate.getDay();
                start = new Date(currentDate.setDate(startOfWeek));
                end = new Date(currentDate.setDate(startOfWeek + 6));
                break;
            case 'daily':
                start = new Date(currentDate.setHours(0, 0, 0, 0));
                end = new Date(currentDate.setHours(23, 59, 59, 999));
                break;
            case 'custom':
                start = new Date(startDate);
                end = new Date(endDate);
                break;
            default:
                start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        }

        const data = await getDashboardData(filter, start, end);
        res.json(data);
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Error fetching analytics data' });
    }
};

const getDashboardData = async (filter, startDate, endDate) => {
    try {
        
        const matchCondition = {
            createdOn: { $gte: startDate, $lte: endDate },
            status: { $in: ['delivered', 'Shipped', 'Processing'] },
            paymentMethod: { $in: ['online payment', 'cash on delivery', 'wallet'] } // Include all payment methods
        };

        
        const matchedOrders = await Order.find(matchCondition).limit(3);
        console.log('Matched Orders Sample:', JSON.stringify(matchedOrders, null, 2));

        
        const categoryDebug = await Order.aggregate([
            { $match: matchCondition },
            { $unwind: '$orderedItems' },
            { $match: { 'orderedItems.cancellationStatus': { $ne: 'cancelled' } } },
            {
                $group: {
                    _id: '$orderedItems.product.category',
                    count: { $sum: 1 },
                    categoryType: { $first: { $type: '$orderedItems.product.category' } }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        console.log('Category IDs in Orders:', JSON.stringify(categoryDebug, null, 2));

        
        const categoryCount = await mongoose.connection.db.collection('categories').countDocuments();
        console.log('Total Categories in DB:', categoryCount);

        
        const unmatchedCategories = await Order.aggregate([
            { $match: matchCondition },
            { $unwind: '$orderedItems' },
            {
                $match: {
                    'orderedItems.cancellationStatus': { $ne: 'cancelled' },
                    'orderedItems.product.category': { $exists: true, $ne: null }
                }
            },
            {
                $addFields: {
                    'orderedItems.product.categoryObjectId': {
                        $cond: [
                            { $eq: [{ $type: '$orderedItems.product.category' }, 'string'] },
                            { $toObjectId: '$orderedItems.product.category' },
                            '$orderedItems.product.category'
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'orderedItems.product.categoryObjectId',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $match: { categoryInfo: { $size: 0 } } },
            { $group: { _id: '$orderedItems.product.categoryObjectId', count: { $sum: 1 } } },
            { $limit: 10 }
        ]);
        console.log('Unmatched Category IDs:', JSON.stringify(unmatchedCategories, null, 2));

        
        const brandSample = await Order.aggregate([
            { $match: matchCondition },
            { $unwind: '$orderedItems' },
            { $match: { 'orderedItems.cancellationStatus': { $ne: 'cancelled' } } },
            {
                $group: {
                    _id: '$orderedItems.product.brand',
                    count: { $sum: 1 },
                    brandType: { $first: { $type: '$orderedItems.product.brand' } }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 15 }
        ]);
        console.log('Brand Distribution:', JSON.stringify(brandSample, null, 2));

        
        const bestSellingProducts = await Order.aggregate([
            { $match: matchCondition },
            { $unwind: '$orderedItems' },
            {
                $match: {
                    'orderedItems.cancellationStatus': { $ne: 'cancelled' },
                    'orderedItems.product._id': { $exists: true, $ne: null },
                    'orderedItems.product.productName': { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: {
                        productId: '$orderedItems.product._id',
                        productName: '$orderedItems.product.productName'
                    },
                    totalQuantity: { $sum: '$orderedItems.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$orderedItems.quantity', '$orderedItems.price'] } }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 },
            {
                $project: {
                    _id: 0,
                    productName: '$_id.productName',
                    totalQuantity: 1,
                    totalRevenue: 1
                }
            }
        ]);
        console.log('Best Selling Products:', JSON.stringify(bestSellingProducts, null, 2));

        
        const bestSellingCategories = await Order.aggregate([
            { $match: matchCondition },
            { $unwind: '$orderedItems' },
            {
                $match: {
                    'orderedItems.cancellationStatus': { $ne: 'cancelled' }
                }
            },
            
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product._id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            {
                $unwind: {
                    path: '$productInfo',
                    preserveNullAndEmptyArrays: false 
                }
            },
            
            {
                $addFields: {
                    'orderedItems.product.category': {
                        $cond: [
                            { $ne: ['$productInfo.category', null] },
                            '$productInfo.category',
                            null
                        ]
                    }
                }
            },
            {
                $match: {
                    'orderedItems.product.category': { $exists: true, $ne: null }
                }
            },
            
            {
                $addFields: {
                    'orderedItems.product.categoryObjectId': {
                        $cond: [
                            { $eq: [{ $type: '$orderedItems.product.category' }, 'string'] },
                            { $toObjectId: '$orderedItems.product.category' },
                            '$orderedItems.product.category'
                        ]
                    }
                }
            },
            
            ...(categoryCount > 0 ? [
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'orderedItems.product.categoryObjectId',
                        foreignField: '_id',
                        as: 'categoryInfo'
                    }
                },
                {
                    $unwind: {
                        path: '$categoryInfo',
                        preserveNullAndEmptyArrays: false
                    }
                },
                {
                    $match: {
                        'categoryInfo.isListed': { $ne: false }
                    }
                },
                {
                    $group: {
                        _id: {
                            categoryId: '$categoryInfo._id',
                            categoryName: '$categoryInfo.name' 
                        },
                        totalQuantity: { $sum: '$orderedItems.quantity' },
                        totalRevenue: { $sum: { $multiply: ['$orderedItems.quantity', '$orderedItems.price'] } }
                    }
                }
            ] : [
                {
                    $group: {
                        _id: {
                            categoryId: '$orderedItems.product.categoryObjectId',
                            categoryName: { $toString: '$orderedItems.product.category' }
                        },
                        totalQuantity: { $sum: '$orderedItems.quantity' },
                        totalRevenue: { $sum: { $multiply: ['$orderedItems.quantity', '$orderedItems.price'] } }
                    }
                }
            ]),
            {
                $match: {
                    '_id.categoryName': { $exists: true, $ne: null, $ne: '' }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 },
            {
                $project: {
                    _id: 0,
                    categoryName: '$_id.categoryName',
                    totalQuantity: 1,
                    totalRevenue: 1
                }
            }
        ]);
        console.log('Best Selling Categories:', JSON.stringify(bestSellingCategories, null, 2));

        
        const bestSellingBrands = await Order.aggregate([
            { $match: matchCondition },
            { $unwind: '$orderedItems' },
            {
                $match: {
                    'orderedItems.cancellationStatus': { $ne: 'cancelled' }
                }
            },
            
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product._id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            {
                $unwind: {
                    path: '$productInfo',
                    preserveNullAndEmptyArrays: false 
                }
            },
            
            {
                $addFields: {
                    'orderedItems.product.brand': {
                        $cond: [
                            { $ne: ['$productInfo.brand', null] },
                            { $trim: { input: '$productInfo.brand' } },
                            null
                        ]
                    }
                }
            },
            {
                $match: {
                    'orderedItems.product.brand': { $exists: true, $ne: null, $ne: '' }
                }
            },
            {
                $group: {
                    _id: '$orderedItems.product.brand',
                    totalQuantity: { $sum: '$orderedItems.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$orderedItems.quantity', '$orderedItems.price'] } }
                }
            },
            {
                $match: {
                    '_id': { $exists: true, $ne: null, $ne: '' },
                    'totalQuantity': { $gt: 0 }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 },
            {
                $project: {
                    _id: 0,
                    brandName: '$_id',
                    totalQuantity: 1,
                    totalRevenue: 1
                }
            }
        ]);
        console.log('Best Selling Brands:', JSON.stringify(bestSellingBrands, null, 2));

        
        const salesOverview = await getSalesOverview(filter, startDate, endDate);

        return {
            bestSellingProducts,
            bestSellingCategories,
            bestSellingBrands,
            salesOverview,
            filter,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        };
    } catch (error) {
        console.error('Error in getDashboardData:', error);
        throw error;
    }
};

const getSalesOverview = async (filter, startDate, endDate) => {
    let groupBy, dateFormat;

    switch (filter) {
        case 'yearly':
            groupBy = { $month: '$createdOn' };
            dateFormat = 'month';
            break;
        case 'monthly':
            groupBy = { $dayOfMonth: '$createdOn' };
            dateFormat = 'day';
            break;
        case 'weekly':
            groupBy = { $dayOfWeek: '$createdOn' };
            dateFormat = 'day';
            break;
        default:
            groupBy = { $dayOfMonth: '$createdOn' };
            dateFormat = 'day';
    }

    const salesData = await Order.aggregate([
        {
            $match: {
                createdOn: { $gte: startDate, $lte: endDate },
                status: { $in: ['delivered', 'Shipped', 'Processing'] }
            }
        },
        {
            $group: {
                _id: groupBy,
                totalSales: { $sum: '$finalAmount' },
                orderCount: { $sum: 1 }
            }
        },
        { $sort: { '_id': 1 } }
    ]);

    return { salesData, dateFormat };
};

const generateLedgerBook = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = new Date(startDate);
        const end = new Date(endDate);

        const ledgerData = await Order.aggregate([
            {
                $match: {
                    createdOn: { $gte: start, $lte: end },
                    status: { $in: ['delivered', 'Shipped', 'Processing', 'cancelled', 'returned'] }
                }
            },
            {
                $project: {
                    orderId: 1,
                    createdOn: 1,
                    finalAmount: 1,
                    discount: 1,
                    totalPrice: 1,
                    paymentMethod: 1,
                    status: 1,
                    'address.name': 1
                }
            },
            { $sort: { createdOn: 1 } }
        ]);

        const totalRevenue = ledgerData.reduce((sum, order) => {
            return order.status === 'delivered' ? sum + order.finalAmount : sum;
        }, 0);

        const totalDiscount = ledgerData.reduce((sum, order) => sum + (order.discount || 0), 0);
        const totalOrders = ledgerData.length;

        res.render('admin/ledger', {
            title: 'Ledger Book',
            ledgerData,
            totalRevenue,
            totalDiscount,
            totalOrders,
            startDate: startDate,
            endDate: endDate
        });
    } catch (error) {
        console.error('Error generating ledger:', error);
        res.status(500).render('admin/error', { message: 'Error generating ledger book' });
    }
};

const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                return res.redirect("/pageerror");
            }
            res.redirect("/admin/login");
        });
    } catch (error) {
        console.log("unexpected error during logout", error);
        res.redirect("/pageerror");
    }
};

module.exports = {
    loadLogin,
    login,
    pageerror,
    logout,
    getAdminDashboard,
    getDashboardAnalytics,
    generateLedgerBook
};