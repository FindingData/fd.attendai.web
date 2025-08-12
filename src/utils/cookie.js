import Cookies from 'js-cookie'

export function getCookie(key) {
  return Cookies.get(key)
}

export function setCookie(key, value) {
  return Cookies.set(key, value)
}

export function remove(key) {
  Cookies.remove(key)
}

export function getAllCookie() {
  return Cookies.get()
}
