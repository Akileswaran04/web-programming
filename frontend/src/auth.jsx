import { createContext, useContext, useEffect, useState } from "react";
import api from "./api.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Also primes the XSRF-TOKEN cookie before the first POST.
  useEffect(() => {
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const u = (await api.post("/auth/login", { email, password })).data;
    setUser(u);
    return u;
  };
  const register = (name, email, password) => api.post("/auth/register", { name, email, password });
  const logout = async () => { await api.post("/auth/logout"); setUser(null); };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
