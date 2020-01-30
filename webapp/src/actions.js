import {getConfig} from 'mattermost-redux/selectors/entities/general';

import {id as pluginId} from './manifest';
import {OPEN_ROOT_MODAL, CLOSE_ROOT_MODAL, RECEIVED_SHOW_RHS_ACTION, GET_ITEMS, GET_IN_ITEMS, GET_OUT_ITEMS} from './action_types';

export const openRootModal = (postID) => (dispatch) => {
    dispatch({
        type: OPEN_ROOT_MODAL,
        postID,
    });
};

export const closeRootModal = () => (dispatch) => {
    dispatch({
        type: CLOSE_ROOT_MODAL,
    });
};

/**
 * Stores`showRHSPlugin` action returned by
 * registerRightHandSidebarComponent in plugin initialization.
 */
export function setShowRHSAction(showRHSPluginAction) {
    return {
        type: RECEIVED_SHOW_RHS_ACTION,
        showRHSPluginAction,
    };
}

// TODO: Move this into mattermost-redux or mattermost-webapp.
export const getPluginServerRoute = (state) => {
    const config = getConfig(state);

    let basePath = '/';
    if (config && config.SiteURL) {
        basePath = new URL(config.SiteURL).pathname;

        if (basePath && basePath[basePath.length - 1] === '/') {
            basePath = basePath.substr(0, basePath.length - 1);
        }
    }

    return basePath + '/plugins/' + pluginId;
};

export const add = (message) => async (dispatch, getState) => {
    await fetch(getPluginServerRoute(getState()) + '/add', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({message}),
    });

    dispatch(list());
};

export const list = (reminder = false, listName = 'my') => async (dispatch, getState) => {
    let resp;
    let data;
    try {
        resp = await fetch(getPluginServerRoute(getState()) + '/list?reminder=' + reminder + '&list=' + listName, {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        data = await resp.json();
    } catch (error) {
        return {error};
    }

    let actionType = GET_ITEMS;
    switch (listName) {
    case 'my':
        actionType = GET_ITEMS;
        break;
    case 'in':
        actionType = GET_IN_ITEMS;
        break;
    case 'out':
        actionType = GET_OUT_ITEMS;
        break;
    }

    dispatch({
        type: actionType,
        data,
    });

    return {data};
};

export const remove = (id) => async (dispatch, getState) => {
    await fetch(getPluginServerRoute(getState()) + '/remove', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({id}),
    });

    dispatch(list(false, 'my'));
    dispatch(list(false, 'in'));
    dispatch(list(false, 'out'));
};

export const complete = (id) => async (dispatch, getState) => {
    await fetch(getPluginServerRoute(getState()) + '/complete', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({id}),
    });

    dispatch(list(false, 'my'));
    dispatch(list(false, 'in'));
    dispatch(list(false, 'out'));
};

export const enqueue = (id) => async (dispatch, getState) => {
    await fetch(getPluginServerRoute(getState()) + '/enqueue', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({id}),
    });

    dispatch(list(false, 'my'));
    dispatch(list(false, 'in'));
    dispatch(list(false, 'out'));
};