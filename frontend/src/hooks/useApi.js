// frontend/src/hooks/useApi.js
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react'; // ¡Importamos useMemo!

const useApi = () => {
  const navigate = useNavigate();

  // Usamos useMemo para que el objeto 'api' solo se cree una vez
  const api = useMemo(() => {
    const axiosInstance = axios.create({
      baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
    });

    axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        }
        return Promise.reject(error);
      }
    );

    return axiosInstance;
  }, [navigate]); // La dependencia es 'navigate', que es muy estable

  return api;
};

export default useApi;