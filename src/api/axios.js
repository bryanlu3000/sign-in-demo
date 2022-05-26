import axios from "axios";
// const BASE_URL = 'http://localhost:8000';
const BASE_URL = ''; // For Heroku deployment

export default axios.create({
  baseURL: BASE_URL
});

export const axiosPrivate = axios.create({
  baseURL: BASE_URL,
  headers: {'Content-Type': 'application/json'},
  withCredentials: true // allow to send cookies with request
});