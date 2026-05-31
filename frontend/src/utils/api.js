import axios from 'axios';

const api = axios.create({
  baseURL: 'https://shujra-api.onrender.com',   // 👈 apna backend URL daalein
});

export default api;