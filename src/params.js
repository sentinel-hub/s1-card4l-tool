import store, { authSlice, paramsSlice } from './store';
import jwt_dec from 'jwt-decode';

export const configureParams = (params) => {
  if (params['extended-settings'] !== undefined) {
    store.dispatch(paramsSlice.actions.setProMode(true));
  }
  if (params['debug-mode'] !== undefined) {
    store.dispatch(paramsSlice.actions.setDebugMode());
  }
  if (params['set-output'] !== undefined) {
    store.dispatch(paramsSlice.actions.setIsSettingOutput());
  }
  if (params['impersonator_token'] !== undefined) {
    const token = params['impersonator_token'];
    const decoded = jwt_dec(token);
    const user = { userdata: decoded, access_token: token };
    store.dispatch(authSlice.actions.setUser(user));
  }
};

export const getUrlParams = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return Object.fromEntries(urlParams.entries());
};
