import React, { useEffect, useState, useContext } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import Input from '../../shared/components/FormElements/Input';
import Button from '../../shared/components/FormElements/Button';
import {
	VALIDATOR_REQUIRE,
	VALIDATOR_MINLENGTH,
} from '../../shared/util/validators';
import { useForm } from '../../shared/hooks/form-hook';
import Card from '../../shared/components/UIElements/Card';
import './PlaceForm.css';
import { useHttpClient } from '../../shared/hooks/http-hook';
import ErrorModal from '../../shared/components/UIElements/ErrorModal';
import LoadingSpinner from '../../shared/components/UIElements/LoadingSpinner';
import { AuthContext } from '../../shared/context/auth-context';

const UpdatePlace = (props) => {
	const { isLoading, error, sendRequest, clearError } = useHttpClient();
	const [loadedPlace, setLoadedPlace] = useState();
	const placeId = useParams().placeId;
	const history = useHistory();
	const auth = useContext(AuthContext);

	const [formState, inputHandler, setFormData] = useForm(
		{
			title: {
				value: '',
				isValid: false,
			},
			description: {
				value: '',
				isValid: false,
			},
		},
		false
	);

	useEffect(() => {
		const fetchPlace = async () => {
			try {
				const responseData = await sendRequest(
					`http://localhost:5000/api/places/${placeId}`
				);
				setLoadedPlace(responseData.place);
				setFormData(
					{
						title: {
							value: responseData.place.title,
							isValid: true,
						},
						description: {
							value: responseData.place.description,
							isValid: true,
						},
					},
					true
				);
			} catch (err) {}
		};
		fetchPlace();
	}, [sendRequest, placeId, setFormData]);

	const placeUpdateSubmitHandler = async (event) => {
		event.preventDefault();
		try {
			await sendRequest(
				`http://localhost:5000/api/places/${placeId}`,
				'PATCH',
				JSON.stringify({
					title: formState.inputs.title.value,
					description: formState.inputs.description.value,
				}),
				{
					'Content-Type': 'application/json',
					Authorization: 'Bearer ' + auth.token,
				}
			);
			history.push('/' + auth.userId + '/places');
		} catch (err) {}
	};

	if (isLoading) {
		return (
			<div className="center">
				<Card>
					<LoadingSpinner />
				</Card>
			</div>
		);
	}

	if (!loadedPlace && !error) {
		return (
			<div className="center">
				<Card>
					<h2>Nie znaleziono miejsca!</h2>
				</Card>
			</div>
		);
	}

	return (
		<React.Fragment>
			<ErrorModal error={error} onClear={clearError} />
			{!isLoading && loadedPlace && (
				<form className="place-form" onSubmit={placeUpdateSubmitHandler}>
					<Input
						id="title"
						element="input"
						type="text"
						label="Tytuł"
						validators={[VALIDATOR_REQUIRE()]}
						errorText="Proszę o wpisanie poprawnego tytułu"
						onInput={inputHandler}
						value={loadedPlace.title}
						valid={true}
					/>
					<Input
						id="description"
						element="textarea"
						label="Opis"
						validators={[VALIDATOR_MINLENGTH(5)]}
						errorText="Opis musi zawierać conajmniej 5 znaków"
						onInput={inputHandler}
						value={loadedPlace.description}
						valid={true}
					/>
					<Button type="submit" disabled={!formState.isValid}>
						ZAPISZ
					</Button>
				</form>
			)}
		</React.Fragment>
	);
};

export default UpdatePlace;
