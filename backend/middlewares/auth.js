const catchAsyncErrors = require("./catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const jwt = require("jsonwebtoken");
const User = require('../models/user')

//check if user is authenticated or not
exports.isAuthenticatedUser = catchAsyncErrors ( async (req, res, next) => {

    const { token } = req.cookies

    if(!token) {
        return next(new ErrorHandler('Access Denied, please Login', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(decoded.id);

    next()
}) 

//Handling User Roles for api
exports.authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if(!roles.includes(req.user.role)) {
            return next(new ErrorHandler('Access Denied, please Login as Administrator', 403)) 
        }

        next()
    }
}