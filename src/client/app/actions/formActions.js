import axios from 'axios';
import {
    SET_FORM_FIELDS,
    UPDATE_FORM_FIELD,
    SET_USER_AUTOCOMPLETE,
    FORM_SUCCESS,
    SUBMIT_ERROR,
    TOGGLE_MODAL,
    DELETE_MODEL,
    SET_SONG_FORM,
    UPDATE_SONG_FORM,
    UPDATE_USER_SETTINGS_FIELD,
    SNACKBAR_MESSAGE,
    CLEAR_INPUT_FIELDS,
    SHOW_VALIDATION_ERRORS
} from '../constants';
import { updateModelData } from './modelActions';
import {
    formTypesToHttpVerbs,
    API_ENDPOINT,
    GENERIC_ERROR_MESSAGE
} from '../utils/constants';
import { getTokenFromLocalStorage } from '../utils/helperFunctions';
import validateModelForm from '../utils/formValidation';
import Models from '../data';
import { snackbarMessage } from './feedbackActions';

const updateFormField = (fieldName, value) => ({
    type: UPDATE_FORM_FIELD,
    data: {
        fieldName,
        value
    }
});

const receiveFormData = data => ({
    type: SET_FORM_FIELDS,
    data
});

const updateSongForm = data => ({
    type: UPDATE_SONG_FORM,
    data
});


const setUpdateFormData = (formType, modelName, data) => {
    const fields = Models[modelName][formType].fields;

    const newFields = Object.keys(fields).reduce((memo, v) => {
        memo[v] = fields[v];
        memo[v].value = data[v];
        return memo;
    }, {});

    const formMetadata = {
        fields: newFields,
        modelName,
        formType
    };

    return receiveFormData(formMetadata);
};

const setFormData = (formType, modelName) => {
    const fields = Models[modelName][formType].fields;
    const formMetadata = {
        fields,
        modelName,
        formType
    };
    // TODO see if we can live without this
    if (formType === 'new') {
        return receiveFormData(formMetadata);
    }
};

const receiveUserAutocomplete = data => ({
    type: SET_USER_AUTOCOMPLETE,
    data: {
        autocompleteResults: data
    }
});


const getUserAutoComplete = (text) => {
    const url = `${API_ENDPOINT}/search/users?text=${text}`;
    const idToken = getTokenFromLocalStorage();

    return async (dispatch) => {
        try {
            const { data } = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${idToken}`
                }
            });

            dispatch(receiveUserAutocomplete(data));
        } catch (e) {
            dispatch(snackbarMessage(GENERIC_ERROR_MESSAGE));
        }
    };
};

// write a test for this!
const addUsersToShow = data => (dispatch, getState) => {
    const { form } = getState();
    const { fields } = form;
    const { users } = fields;
    const { value } = users;

    if (value && Array.isArray(value)) {
        const nextValue = [...value, data];
        return dispatch(updateFormField('users', nextValue));
    }

    const firstValue = [data];
    dispatch(updateFormField('users', firstValue));
};


const formSubmitError = message => ({
    type: SUBMIT_ERROR,
    data: {
        message
    }
});

const receiveFormResult = data => ({
    type: FORM_SUCCESS,
    data
});

const receiveValidationErrors = data => ({
    type: SHOW_VALIDATION_ERRORS,
    data
});

const prepareFormSubmit = (type, modelName) => {
    const idToken = getTokenFromLocalStorage();
    const method = formTypesToHttpVerbs[type];
    const formUrl = `${API_ENDPOINT}/${modelName}`;

    return async (dispatch, getState) => {
        const { form } = getState();
        const { fields } = form;
        const formData = Object.keys(fields).reduce((memo, f) => {
            memo[f] = fields[f].value;

            return memo;
        }, {});

        /* we only need one transofrm so far, but we need to extract this logic
         * into a separate function should we have additional cases later.
        */
        const hasUserProperty = Object.prototype.hasOwnProperty.call(formData, 'users');
        const dataToSend = hasUserProperty ? {
            ...formData,
            users: formData.users.map(user => user._id)
        } : formData;

        const validationErrors = validateModelForm(modelName, type, dataToSend);

        if (validationErrors.length) {
            return dispatch(receiveValidationErrors(validationErrors));
        }

        try {
            const { data } = await axios[method](formUrl, dataToSend, {
                headers: {
                    Authorization: `Bearer ${idToken}`
                }
            });

            if (data.code === 401) {
                return dispatch(formSubmitError(data.message));
            }

            // dispatch action to update model.data
            if (method === 'put') {
                dispatch(updateModelData(formData));
            }

            dispatch(receiveFormResult(data));
            dispatch({
                type: TOGGLE_MODAL,
                data: {
                    showModal: false
                }
            });
        } catch (err) {
            dispatch(snackbarMessage(GENERIC_ERROR_MESSAGE));
        }
    };
};

const deleteForm = (id, modelName) => {
    const url = `${API_ENDPOINT}/${modelName}?id=${id}`;
    const idToken = getTokenFromLocalStorage();

    return async (dispatch) => {
        try {
            await axios.delete(url, {
                headers: {
                    Authorization: `Bearer ${idToken}`
                }
            });

            dispatch({
                type: DELETE_MODEL,
                data: {
                    id
                }
            });
        } catch (err) {
            dispatch(snackbarMessage(GENERIC_ERROR_MESSAGE));
        }

        dispatch({
            type: TOGGLE_MODAL,
            data: {
                showModal: false
            }
        });
    };
};

const clearInputFields = () => ({ type: CLEAR_INPUT_FIELDS });

const updateUserPassword = (obj) => {
    const { name, fields, id } = obj;
    const url = `${API_ENDPOINT}/users/${id}`;
    const idToken = getTokenFromLocalStorage();

    return async (dispatch) => {
        try {
            const { data } = await axios.patch(url, { name, fields }, {
                headers: {
                    Authorization: `Bearer ${idToken}`
                }
            });
            const message = data.success ? 'Update was successful!' : 'Update Failed.';

            dispatch(clearInputFields());

            dispatch({
                type: SNACKBAR_MESSAGE,
                data: { message }
            });
        } catch (e) {
            dispatch(snackbarMessage(GENERIC_ERROR_MESSAGE));
        }
    };
};

const updateUserSettingsInput = data => ({
    type: UPDATE_USER_SETTINGS_FIELD,
    data
});

const setSongForm = songs => ({
    type: SET_SONG_FORM,
    data: songs
});

const fileUpload = (formData) => {
    const url = `${API_ENDPOINT}/upload`;
    const idToken = getTokenFromLocalStorage();

    return async (dispatch) => {
        try {
            const { data } = await axios.post(url, formData, {
                headers: {
                    Authorization: `Bearer ${idToken}`
                }
            });

            const newData = {
                fieldName: 'primaryImage',
                value: data.filePath
            };

            dispatch({
                type: UPDATE_FORM_FIELD,
                data: newData
            });
        } catch (err) {
            dispatch(snackbarMessage(GENERIC_ERROR_MESSAGE));
        }
    };
};

const removeUserFromShow = val => (dispatch, getState) => {
    const { form } = getState();
    const { fields } = form;
    const { users } = fields;
    const { value } = users;

    const data = value.filter(item => item._id !== val);

    return dispatch(updateFormField('users', data));
};

export {
    prepareFormSubmit,
    setFormData,
    setSongForm,
    updateSongForm,
    updateFormField,
    getUserAutoComplete,
    addUsersToShow,
    setUpdateFormData,
    deleteForm,
    updateUserSettingsInput,
    updateUserPassword,
    fileUpload,
    removeUserFromShow
};
