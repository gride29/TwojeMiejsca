const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const HttpError = require('../models/http-error');
const Place = require('../models/place');
const User = require('../models/user');

const getPlaceById = async (req, res, next) => {
	const placeId = req.params.pid;

	let place;

	try {
		place = await Place.findById(placeId);
	} catch (err) {
		const error = new HttpError('Coś poszło nie tak, spróbuj ponownie.', 500);
		return next(error);
	}

	if (!place) {
		const error = new HttpError('Nie znaleziono miejsca o podanym ID.', 404);
		return next(error);
	}

	res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
	const userId = req.params.uid;

	let userWithPlaces;

	try {
		userWithPlaces = await User.findById(userId).populate('places');
	} catch (err) {
		const error = new HttpError('Coś poszło nie tak, spróbuj ponownie.', 500);
		return next(error);
	}

	if (!userWithPlaces || userWithPlaces.places.length === 0) {
		const error = new HttpError(
			'Nie znaleziono miejsc dla podanego użytkownika.',
			404
		);
		return next(error);
	}

	res.json({
		places: userWithPlaces.places.map((place) =>
			place.toObject({ getters: true })
		),
	});
};

const createPlace = async (req, res, next) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		throw new HttpError('Wprowadzone dane są niewłaściwe!');
	}

	const { title, description, coordinates, address } = req.body;

	const createdPlace = new Place({
		title,
		description,
		address,
		location: coordinates,
		image: req.file.path,
		creator: req.userData.userId,
	});

	let user;

	try {
		user = await User.findById(req.userData.userId);
	} catch (err) {
		const error = new HttpError('Nie udało się utworzyć miejsca.', 500);
		return next(error);
	}

	if (!user) {
		const error = new HttpError(
			'Nie znaleziono użytkownika o podanym id.',
			404
		);
		return next(error);
	}

	console.log(user);

	try {
		const sess = await mongoose.startSession();
		sess.startTransaction();
		await createdPlace.save({ session: sess });
		user.places.push(createdPlace);
		await user.save({ session: sess });
		await sess.commitTransaction();
	} catch (err) {
		const error = new HttpError(
			'Nie udało się utworzyć miejsca, spróbuj ponownie.'
		);
		console.log(err);
		return next(error);
	}

	res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		throw new HttpError('Wprowadzone dane są niewłaściwe!');
	}

	const { title, description } = req.body;
	const placeId = req.params.pid;

	let place;

	try {
		place = await Place.findById(placeId);
	} catch (err) {
		const error = new HttpError('Coś poszło nie tak, spróbuj ponownie.', 500);
		return next(error);
	}

	if (place.creator.toString() !== req.userData.userId) {
		const error = new HttpError(
			'Nie masz uprawnień do edycji tego miejsca.',
			401
		);
		return next(error);
	}

	place.title = title;
	place.description = description;

	try {
		await place.save();
	} catch (err) {
		const error = new HttpError('Coś poszło nie tak, spróbuj ponownie.', 500);
		return next(error);
	}

	res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
	const placeId = req.params.pid;

	let place;
	try {
		place = await Place.findById(placeId).populate('creator');
	} catch (err) {
		const error = new HttpError('Coś poszło nie tak, spróbuj ponownie.', 500);
		return next(error);
	}

	if (!place) {
		const error = new HttpError('Nie znaleziono miejsca o podanym id.', 404);
		return next(error);
	}

	if (place.creator.id.toString() !== req.userData.userId) {
		const error = new HttpError(
			'Nie masz uprawnień do usunięcia tego miejsca.',
			401
		);
		return next(error);
	}

	const imagePath = place.image;

	try {
		const sess = await mongoose.startSession();
		sess.startTransaction();
		await place.remove({ session: sess });
		place.creator.places.pull(place);
		await place.creator.save({ session: sess });
		await sess.commitTransaction();
	} catch (err) {
		const error = new HttpError('Coś poszło nie tak, spróbuj ponownie.', 500);
		return next(error);
	}

	// Remove the image.
	fs.unlink(imagePath, (err) => {
		console.log(err);
	});

	res.status(200).json({ message: 'Usunięto miejsce.' });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
