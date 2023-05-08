const HttpError = require('../models/http-error')

// encrypt password, hashcode it
const bcrypt = require('bcryptjs')

// to create token for authentication and authorization
const jwt = require('jsonwebtoken')

// For server side validation
const { validationResult } = require('express-validator')

const User = require('../models/user')

// -------------------------------------------------------------------------------------------------------------------------------------

const getUsers = async (req, res, next) => {
    
    let users;
    try {
        users = await User.find({}, '-password');
    } catch(err) {
        const error = new HttpError('Fetching users failed, please try again', 500)
        return next(error)
    }

    res.json({users: users.map(user => user.toObject({ getters: true }))})
}

// -------------------------------------------------------------------------------------------------------------------------------------

const signup = async (req, res, next) => {
    // Server side input validation
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return next(new HttpError('Invalid inputs passed, please check the values', 422))
    }

    const { name, email, password } = req.body;

    let existingUser
    try {
        existingUser = await User.findOne({ email: email })
    } catch(err) {
        const error = new HttpError('Signing up failed, please try again', 500);
        return next(error);
    }

    if(existingUser) {
        const error = new HttpError('Email already exist', 422);
        return next(error);
    }

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 12)   // hash 12 times
    } catch(err) {
        const error = new HttpError('Could not create user, please try again', 500)
        return next(error);
    }

    const createdUser = new User({
        name,
        email,
        password: hashedPassword,
        image: req.file.path.replace("\\", "/"),
        places: []
    })

    try {
        await createdUser.save();
    } catch (err) {
        const error = new HttpError('Signing up failed, please try again later', 500)
        return next(error);
    }

    // Creating token
    let token;
    try {
        token = jwt.sign(
            {userId: createdUser.id, email: createdUser.email}, 
            'supersecret_dont_share', 
            {expiresIn: '1h'}
        )
    } catch(err) {
        const error = new HttpError('Signing up failed, please try again later', 500)
        return next(error);
    }

    res.status(201).json({userId: createdUser.id, email: createdUser.email, token: token})
}

// -------------------------------------------------------------------------------------------------------------------------------------

const login = async (req, res, next) => {
    const { email, password } = req.body;

    let existingUser
    try {
        existingUser = await User.findOne({ email: email })
    } catch(err) {
        const error = new HttpError('Logging in failed, please try again', 500);
        return next(error);
    }

    if(!existingUser) {
        const error = new HttpError("Invalid credentials, could not log you in", 403)
        return next(error)
    }
 
    let isValidPassword = false
    try {
        isValidPassword = await bcrypt.compare(password, existingUser.password)
    } catch(err) {
        const error = new HttpError('Could not log you in, please check credentials', 500)
        return next(error)
    }

    if(!isValidPassword) {
        const error = new HttpError('Could not log you in, please check credentials', 403)
        return next(error)
    }

    // Creating token
    let token;
    try {
        token = jwt.sign(
            {userId: existingUser.id, email: existingUser.email}, 
            'supersecret_dont_share', 
            {expiresIn: '1h'}
        )
    } catch(err) {
        const error = new HttpError('Logging in failed, please try again later', 500)
        return next(error);
    }

    res.json({userId: existingUser.id, email: existingUser.email, token: token});
}

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;