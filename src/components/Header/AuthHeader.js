import React, { useEffect } from 'react';
import ClientOAuth2 from 'client-oauth2';
import axios from 'axios';
import { connect } from 'react-redux';

import {
  getTokenFromLocalStorage,
  decodeToken,
  saveTokenToLocalStorage,
  removeTokenFromLocalStorage,
} from './utils';
import store, { authSlice } from '../../store';
import { getUrlParams } from '../../params';

const oauth = new ClientOAuth2({
  clientId: process.env.REACT_APP_CLIENTID,
  accessTokenUri: process.env.REACT_APP_AUTH_BASEURL + 'oauth/token',
  authorizationUri: process.env.REACT_APP_AUTH_BASEURL + 'oauth/auth',
  redirectUri: `${process.env.REACT_APP_ROOT_URL}oauthCallback.html`,
});

export const doLogin = () => {
  return new Promise((resolve, reject) => {
    window.authorizationCallback = { resolve, reject };
    window.open(oauth.token.getUri(), 'popupWindow', 'width=800,height=600');
  }).then((token) => {
    saveTokenToLocalStorage(token);
    store.dispatch(
      authSlice.actions.setUser({ userdata: decodeToken(token), access_token: token.access_token }),
    );
    return token.access_token;
  });
};

export const doLogout = () => {
  axios
    .get(process.env.REACT_APP_AUTH_BASEURL + 'oauth/logout', {
      withCredentials: true,
    })
    .catch((e) => {
      console.error(e);
    })
    .finally(() => {
      store.dispatch(authSlice.actions.resetUser());
      removeTokenFromLocalStorage();
    });
};

const AuthHeader = ({ user, isEdcUser }) => {
  useEffect(() => {
    const urlParams = getUrlParams();
    if (!urlParams['impersonator_token'] && !isEdcUser) {
      signInOnLoad();
    }
  }, [isEdcUser]);

  const signInOnLoad = async () => {
    try {
      const token = await getTokenFromLocalStorage();
      if (token) {
        store.dispatch(
          authSlice.actions.setUser({ userdata: decodeToken(token), access_token: token.access_token }),
        );
      }
    } catch (err) {
      console.error(err);
    }
  };
  return (
    <>
      {!isEdcUser && (
        <div>
          {user.userdata !== null ? (
            <button onClick={doLogout} className="primary-button primary-button--inactive">
              Logout
            </button>
          ) : (
            <button onClick={doLogin} className="primary-button primary-button--inactive">
              Login
            </button>
          )}
        </div>
      )}
      <ClosablePermissionsWarning userdata={user.userdata} isEdcUser={isEdcUser} />
    </>
  );
};

const ClosablePermissionsWarning = ({ userdata, isEdcUser }) => {
  // not logged in
  if (!userdata) {
    return null;
  }

  const accountType = userdata?.d && userdata.d['1']?.t;
  if (isEdcUser || !accountType || accountType < 14000) {
    return (
      <div className="info-banner info-banner--warning info-banner--fixed rounded-md ml-3 flex items-center">
        <p>
          WARNING! To use this application you need an <b>Enterprise</b> account. You can check the pricing{' '}
          <a href="https://www.sentinel-hub.com/pricing/" target="__blank" rel="noopener noreferrer">
            here
          </a>
          .
        </p>
      </div>
    );
  }

  return null;
};

const mapStateToProps = (store) => ({
  user: store.auth.user,
  isEdcUser: store.auth.isEdcUser,
});

export default connect(mapStateToProps, null)(AuthHeader);
