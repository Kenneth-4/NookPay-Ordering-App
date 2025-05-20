import cookie from 'cookie';
import { parseCookies, setCookie, destroyCookie } from 'nookies';

export const COOKIE_NAME = 'auth_token';

export const getCookie = (key: string = COOKIE_NAME) => {
  const cookies = parseCookies();
  return cookies[key];
};

export const setCookieValue = (value: string, key: string = COOKIE_NAME) => {
  setCookie(null, key, value, {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
};

export const removeCookie = (key: string = COOKIE_NAME) => {
  destroyCookie(null, key, {
    path: '/',
  });
};