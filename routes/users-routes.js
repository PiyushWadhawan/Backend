const express = require('express');

const router = express.Router();

const userControllers = require('../controllers/users-controller')

const fileUpload = require('../middleware/file-upload')

// For server side validation
const { check } = require('express-validator')

router.get('/', userControllers.getUsers);

router.post(
    '/signup', 
    fileUpload.single('image'),
    [
        check('name').not().isEmpty(),
        check('email').normalizeEmail().isEmail(),
        check('password').isLength({min: 5})
    ],
userControllers.signup);

router.post('/login', userControllers.login)

module.exports = router;