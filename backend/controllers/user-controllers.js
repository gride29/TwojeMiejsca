const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const HttpError = require('../models/http-error');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const getUsers = async (req, res, next) => {
	let users;
	try {
		users = await User.find({}, '-password');
	} catch (err) {
		const error = new HttpError(
			'Nie udało się pobrać listy użytkowników.',
			500
		);
		return next(error);
	}
	res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const error = new HttpError('Wprowadzone dane są niewłaściwe!');
		return next(error);
	}

	const { name, email, password } = req.body;

	let existingUser;
	try {
		existingUser = await User.findOne({ email: email });
	} catch (err) {
		const error = new HttpError(
			'Nie udało się zarejestrować użytkownika, spróbuj ponownie.',
			500
		);
		return next(error);
	}

	if (existingUser) {
		const error = new HttpError('Użytkownik już istnieje.', 500);
		return next(error);
	}

	let hashedPassword;
	try {
		hashedPassword = await bcrypt.hash(password, 12);
	} catch (err) {
		const error = new HttpError('Coś poszło nie tak, spróbuj ponownie.', 500);
		return next(error);
	}

	const createdUser = new User({
		name,
		email,
		image: req.file.path,
		password: hashedPassword,
		places: [],
	});

	try {
		await createdUser.save();
	} catch (err) {
		const error = new HttpError('Nie udało się utworzyć użytkownika.', 500);
		return next(error);
	}

	let token;
	try {
		token = jwt.sign(
			{ userId: createdUser.id, email: createdUser.email },
			'verysecretkey',
			{ expiresIn: '1h' }
		);
	} catch (err) {
		const error = new HttpError('Nie udało się utworzyć użytkownika.', 500);
		return next(error);
	}

	res
		.status(201)
		.json({ userId: createdUser.id, email: createdUser.email, token: token });
};

const login = async (req, res, next) => {
	const { email, password } = req.body;

	let existingUser;
	try {
		existingUser = await User.findOne({ email: email });
	} catch (err) {
		const error = new HttpError(
			'Nie udało się zalogować, spróbuj ponownie.',
			500
		);
		return next(error);
	}

	if (!existingUser) {
		const error = new HttpError(
			'Podany email lub hasło są nieprawidłowe.YAY',
			401
		);
		return next(error);
	}

	let isValidPassword = false;
	try {
		isValidPassword = await bcrypt.compare(password, existingUser.password);
	} catch (err) {
		const error = new HttpError('Coś poszło nie tak, spróbuj ponownie.', 500);
		return next(error);
	}

	if (!isValidPassword) {
		const error = new HttpError(
			'Podany email lub hasło są nieprawidłowe.',
			403
		);
		return next(error);
	}

	let token;
	try {
		token = jwt.sign(
			{ userId: existingUser.id, email: existingUser.email },
			'verysecretkey',
			{ expiresIn: '1h' }
		);
	} catch (err) {
		const error = new HttpError('Nie udało się zalogować.', 500);
		return next(error);
	}

	res.json({
		userId: existingUser.id,
		email: existingUser.email,
		token: token,
	});
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
