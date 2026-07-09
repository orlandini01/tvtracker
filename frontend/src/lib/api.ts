import axios from "axios";

// Nunca hardcode a URL do backend: vem de variável de ambiente do Vite,
// configurada em frontend/.env (veja .env.example).
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
});
