import axios from 'axios';

// Пустая строка = относительные пути → same-origin через nginx/vite-proxy
export const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? '',
    headers: {
        'Content-Type': 'application/json',
    },
});