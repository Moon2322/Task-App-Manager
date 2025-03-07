import axios from "axios";

const API_BASE_URL = "http://localhost:5000/";

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: false,
});

api.interceptors.request.use(
    (config) => {
        console.log("Entering interceptor configuration");
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        console.debug("Returning interceptor configuration");
        return config;
    },
    (error) => {
        console.log("Error in returning interceptor configuration", error);
        return Promise.reject(error);
    }
);

export default api;
