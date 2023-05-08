const fs = require('fs')
const path = require('path')
const express = require('express');
const mongoose = require('mongoose');

const password = "7qfBLT9I4hAG61H9"
const database = "placekeep"
const url = `mongodb+srv://piyush:${password}@cluster0.zyrt8sn.mongodb.net/${database}?retryWrites=true&w=majority`

const bodyParser = require("body-parser");
const HttpError = require('./models/http-error')

const placesRoutes = require('./routes/places-routes');
const usersRoutes = require('./routes/users-routes')


const app = express();

app.use(bodyParser.json())

app.use('/uploads/images', express.static(path.join('uploads', 'images')));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE')
    next();
})

app.use('/api/places',placesRoutes)

app.use('/api/users', usersRoutes)

app.use((req, res, next) => {                    // If none of the above middlewares send a response i.e none of the above routes are given as input then print our own error message
    const error = new HttpError('Could not find this route', 404);
    throw error;
})

app.use((error, req, res, next) => {             // Error handling middleware function
    if(req.file) {
        fs.unlink(req.file.path, (err) => {      // Rollback image upload - deletes the image from the node-express server
            console.log(err);
        })
    }
    if(res.headerSent) {                         // if a response has already been sent
        return next(error)
    }
    res.status(error.code || 500);
    res.json({message: error.message || 'An unknown error occurred'})
})

mongoose.connect(url)
    .then(() => {
        app.listen(5000);
        console.log('Connected successfully to database')
    })
    .catch((err) => {
        console.log("Can't connect to server")
        console.log(err)
    })


// npm init => to create package.json
// npm install --save express body-parser 
// npm install nodemon --save-dev
// In package.json add to script => "start": "nodemon app.js"
// npm install uuid
// npm install --save express-validator
// npm install --save axios
// npm install --save mongoose
// npm install --save mongoose-unique-validator
// npm install --save multer
// npm install --save bcryptjs
// npm install --save jsonwebtoken



   