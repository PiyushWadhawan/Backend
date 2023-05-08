const fs = require('fs')
const HttpError = require('../models/http-error')
const { v4: uuidv4 } = require('uuid');
const getCoordsForAddress = require('../util/location')

// For server side validation
const { validationResult } = require('express-validator')

const Place = require('../models/place')
const User = require('../models/user');
const mongoose = require('mongoose');

// -------------------------------------------------------------------------------------------------------------------------------------

const getPlaceById = async (req, res, next) => {
    const placeId = req.params.pid;
    
    let place;
    try {
        place = await Place.findById(placeId);
    } catch (err) {
        const error = new HttpError('Could not find a place', 500)
        return next(error);
    }

    if(!place) {
        const error = new HttpError('Could not find a place for the provided place id', 404);
        return next(error)
    }

    res.json({ place: place.toObject({ getters: true }) })          // same as => ({place: place})
}

// -------------------------------------------------------------------------------------------------------------------------------------

const getPlacesByUserId = async (req, res, next) => {
    const userId = req.params.uid;
    
    let places
    try {
        places = await Place.find({ creator: userId })
    } catch (err) {
        const error = new HttpError('Fetching places failed, please try again later', 500)
        return next(error)
    }

    if(!places || places.length === 0) {
        return next(new HttpError('Could not find places for the provided user id', 404));
    }

    res.json({places: places.map(place => place.toObject({ getters: true }) )})
}

// -------------------------------------------------------------------------------------------------------------------------------------

const createPlace = async (req, res, next) => {
    
    // Server side input validation
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return next(new HttpError('Invalid inputs passed, please check the values', 422))
    }

    const { title, description, address, creator} = req.body;

    let coordinates
    try {
        coordinates = await getCoordsForAddress(address)
    }
    catch(error) {
        return next(error);
    }

    const createdPlace = new Place({
        title,
        description,
        address,
        location: coordinates,
        image: req.file.path,
        creator
    })

    let user;
    try {
        user = await User.findById(creator)
    } catch(err) {
        const error = new HttpError('Creating place failed, please try again', 500)
        return next(error)
    }

    if(!user) {
        const error = new HttpError('Could not find user for provided id, please try again', 500)
        return next(error)
    }

    // Using transaction as it rolls back the changes if any of the operations give an error
    try {
        const sess = await mongoose.startSession();    // Start session
        sess.startTransaction();                       // Start transaction
        await createdPlace.save({ session: sess })     // Save place to database
        user.places.push(createdPlace)                 // mongoose by default adds just the id from createdPlace i.e. mongodb object id
        await user.save({ session: sess });            // Save updated user
        await sess.commitTransaction();                // All changes are saved in the database if both the above operations are successfull else every change is rolled back
    } catch (err) {
        const error = new HttpError('Creating place failed, please try again', 500)
        return next(error)
    }

    res.status(201).json({place: createdPlace})
}

// -------------------------------------------------------------------------------------------------------------------------------------

const updatePlace = async (req, res, next) => {
    // Server side input validation
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return next(new HttpError('Invalid inputs passed, please check the values', 422))
    }

    const { title, description } = req.body;
    const placeId = req.params.pid;
    
    let place;
    try {
        place = await Place.findById(placeId)
    } catch (err){
        const error = new HttpError('Something went wrong, could not update place', 500);
        return next(error);
    }

    if(place.creator.toString() !== req.userData.userId) {
        const error = new HttpError('You are not allowed to edit this place', 401);
        return next(error);
    }

    place.title = title;
    place.description = description;

    try {
        await place.save();
    } catch (err) {
        const error = new HttpError('Something went wrong, could not update place', 500)
        return next(error);
    }
    
    res.status(200).json({place: place.toObject({ getters: true}) })
}

// -------------------------------------------------------------------------------------------------------------------------------------

const deletePlace = async (req, res, next) => {
    const placeId = req.params.pid;
    
    let place;
    try {
        place = await Place.findById(placeId).populate('creator')                // place.creator = entire user model object which it references
    } catch(err) {
        const error = new HttpError('Something went wrong, could not delete place id', 500)
        return next(error)
    }

    if(!place) {
        const error = new HttpError('Could not find place', 404)
        return next(error)
    }

    if(place.creator.id !== req.userData.userId) {
        const error = new HttpError('You are not allowed to delete this place', 401);
        return next(error);
    }

    const imagePath = place.image;

    try {
        const sess = await mongoose.startSession()
        sess.startTransaction()
        await place.deleteOne({ session: sess})
        place.creator.places.pull(place);
        await place.creator.save({ session: sess })
        await sess.commitTransaction();
    } catch(err) {
        const error = new HttpError('Something went wrong, could not delete place', 500)
        return next(error)
    }

    fs.unlink(imagePath, err => {
        console.log(err)
    });                         // Rollback image upload - deletes the image from the node-express server

    res.status(200).json({ message: 'Deleted place successfully' })
}

// -------------------------------------------------------------------------------------------------------------------------------------

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
