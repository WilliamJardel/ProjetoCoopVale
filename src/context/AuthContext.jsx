import React, { createContext, useContext, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const activeSession = await invoke("current_session");
        setSession(activeSession);
      } catch (err) {
        console.error("Erro ao recuperar sessão:", err);
        setSession(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const newSession = await invoke("login", { email, password });
    setSession(newSession);
  };

  const logout = async () => {
    await invoke("logout");
    setSession(null);
  };

  const updateSession = (updatedSession) => {
    setSession(updatedSession);
  };

  return (
    <AuthContext.Provider value={{ session, loading, login, logout, updateSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
