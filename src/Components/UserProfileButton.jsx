import React from "react";
import { useAuth } from "../context/AuthContext";
import "../Styles/UserProfile.css";

export default function UserProfileButton({ onClick }) {
  const { session } = useAuth();
  const name = session?.name || "Usuário";

  return (
    <button type="button" className="user-profile" onClick={onClick} aria-label={`Abrir perfil de ${name}`}>
      <span className="avatar">{name.charAt(0).toLocaleUpperCase("pt-BR")}</span>
      <span className="user-info">
        <span className="user-name">{name}</span>
        <span className="user-role">Administrador</span>
      </span>
      <span className="dropdown-arrow" aria-hidden="true">▼</span>
    </button>
  );
}
