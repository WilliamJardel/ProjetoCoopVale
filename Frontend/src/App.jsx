import React, { useState } from "react";
import Login from "./Components/login";
import Dashboard from "./Components/Dashboard";
import Contratos from "./Components/Contratos";
import { AuthProvider, useAuth } from "./context/AuthContext";

function MainContent() {
  const { session, loading } = useAuth();
  // Estado para controlar a tela atual quando o usuário está logado ('dashboard' ou 'contratos')
  const [currentScreen, setCurrentScreen] = useState("dashboard");

  // Exibe tela de carregamento rápida enquanto verifica se há sessão ativa no SQLite/Rust
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f4f6f8",
          fontFamily: "sans-serif",
          color: "#334155"
        }}
      >
        Carregando sessão...
      </div>
    );
  }

  // Se NÃO existir sessão ativa, exibe o Login
  if (!session) {
    return <Login />;
  }

  // Se existir sessão ativa, renderiza a tela selecionada
  switch (currentScreen) {
    case "contratos":
      return <Contratos onNavigate={setCurrentScreen} />;
    case "dashboard":
    default:
      return <Dashboard onNavigate={setCurrentScreen} />;
  }
}

function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}

export default App;