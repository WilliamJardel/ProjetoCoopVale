import React, { useState } from "react";
import Login from "./Components/login";
import Dashboard from "./Components/Dashboard";
import Contratos from "./Components/Contratos";
import Financeiro from "./Components/Financeiro";
import CadastrarInstituicao from "./Components/CadastrarInstituicao";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Relatorios from "./Components/Relatorios";
import NotasFiscais from "./Components/NotasFiscais";
import Produtos from "./Components/Produtos";
import Entregas from "./Components/Entregas";
import Perfil from "./Components/Perfil";

function MainContent() {
  const { session, loading } = useAuth();

  const [currentScreen, setCurrentScreen] = useState("dashboard");


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


  if (!session) {
    return <Login />;
  }


  switch (currentScreen) {
    case "contratos":
      return <Contratos onNavigate={setCurrentScreen} />;
    case "financeiro":
      return <Financeiro onNavigate={setCurrentScreen} />;
    case "relatorios":
      return <Relatorios onNavigate={setCurrentScreen} />;
    case "instituicoes":
      return <CadastrarInstituicao onNavigate={setCurrentScreen} />;
    case "notas-fiscais":
      return <NotasFiscais onNavigate={setCurrentScreen} />;
    case "produtos":
      return <Produtos onNavigate={setCurrentScreen} />;
    case "entregas":
      return <Entregas onNavigate={setCurrentScreen} />;
    case "perfil":
      return <Perfil onNavigate={setCurrentScreen} />;
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
