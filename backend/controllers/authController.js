const User = require('../models/user');

const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const sendToken = require('../utils/jwtToken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

//Register a User => /api/v1/register
exports.registerUser = catchAsyncErrors ( async(req, res, next) => {

    const {name, email, password} = req.body;

    const user = await User.create({
        name, 
        email, 
        password,
        avatar: {
            public_id: 'ANd9GcT_4TfPNWILUAhTZpROTDfuyiYBMntr1ZT00A',
            url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_4TfPNWILUAhTZpROTDfuyiYBMntr1ZT00A&usqp=CAU'
        }
    })

    sendToken(user, 200, res)
})

//Login user with Token /api/v1/login
exports.loginUser = catchAsyncErrors( async(req, res, next) => {
    const { email, password } = req.body;
    
    //Check if email and password entered by user
    if(!email || !password) {
        return next(new ErrorHandler('Please enter email and password', 400))
    }

    //Finding user in db
    const user = await User.findOne({email}).select('+password')

    if(!user) {
        return next (new ErrorHandler('User not Found', 401))
    }

    //Check if password correct or not
    const isPasswordMatched = await user.comparePassword(password);

    if(!isPasswordMatched) {
        return next (new ErrorHandler('Invalid User Password', 401))
    }

    sendToken(user, 200, res)
})

//Forgot Password => api/v1/forgot/password
exports.forgotPassword = catchAsyncErrors( async(req, res, next) => {
    
    const user = await User.findOne({ email: req.body.email});
    if(!user) {
        return next (new ErrorHandler('Email not registered with us !', 404))
    }

    //get reset Token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false })

    //create password reset URL
    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/password/reset/${resetToken}`

    const message = `Your Password reset token is (Valid for 30 Mins): \n\n ${resetUrl} \n\n If this is not requested by you then contact Admin and ignore this mail.`

    try {
        await sendEmail({
            email: user.email,
            subject: 'ShopIT Password Reset Mail',
            message
        })
        res.status(200).json({
            success: true,
            message: `Email Sent to: ${user.email}`
        })
        
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave: false })

        return next(new ErrorHandler(error.message, 500))
    }
})

//Reset Password => api/v1/reset/:token
exports.resetPassword = catchAsyncErrors( async(req, res, next) => {

    //Hash URL token
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest
    ('hex')

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: {$gt: Date.now()}
    })

    if(!user){
        return next(new ErrorHandler('Invalid Token/Password Link or is expired', 400))
    }

    if(req.body.password !== req.body.confirmPassword){
        return next(new ErrorHandler('Password Does not match', 400))
    }

    //setup new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    sendToken(user, 200, res)
})

//get currently logged in user => api/v1/me
exports.getUserProfile = catchAsyncErrors( async(req, res, next) => {
    const user = await User.findById(req.user.id);

    res.status(200).json({
        success: true,
        user
    })
})

//Update / Change User Password => api/v1/password/Update
exports.updatePassword = catchAsyncErrors( async(req, res, next) => {
    const user = await User.findById(req.user.id).select('+password')

    //check previous password
    const isMatched = await user.comparePassword(req.body.oldPassword)
    if(!isMatched){
        return next (new ErrorHandler('Old Password is incorrect', 400));
    }

    user.password = req.body.password;
    await user.save();

    sendToken(user, 200, res)

})

//Update user profile => api/v1/me/update
exports.updateProfile = catchAsyncErrors( async(req, res, next) => {
    const newUserData = {
        name: req.body.name,
        email: req.body.email
    }

    //Update Avatar : TODO

    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false
    })

    res.status(200).json({
        success: true
    })

})

//Logout User => /api/v1/logout
exports.logout = catchAsyncErrors( async (req, res, next) => {
    res.cookie('token', null, { 
        expires: new Date(Date.now()),
        httpOnly: true
    })

    res.status(200).json({
        success: true,
        message: 'Logged out'
    })
})

//Admin Routes 

//Get all Users => /api/v1/admin/users
exports.allUsers = catchAsyncErrors( async (req, res, next) => {
    const users = await User.find();

    res.status(200).json({
        success: true,
        users
    })
})

//Get User Details => /api/v1/admin/user/:id
exports.getUserDetails = catchAsyncErrors( async (req, res, next) =>{
    const user = await User.findById(req.params.id);

    if(!user){
        return next (new ErrorHandler('User not Found', 401))
    }

    res.status(200).json({
        success: true,
        user
    })
})

//Update user profile => api/v1/admin/user/:id
exports.updateUser = catchAsyncErrors( async(req, res, next) => {
    const newUserData = {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role
    }

    const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false
    })

    res.status(200).json({
        success: true
    })

})