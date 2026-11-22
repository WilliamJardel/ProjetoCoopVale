import React from "react";
import iconCoopVale from "../public/img/iconCoopVale.png";
import { MenuIcon } from "./Icons";

const navigationItems = [
  ["dashboard", "Início"],
  ["contratos", "Contratos / Chamadas"],
  ["financeiro", "Financeiro"],
  ["instituicoes", "Instituições"],
  ["notas-fiscais", "Notas Fiscais"],
  ["relatorios", "Relatórios"],
  ["produtos", "Produtos"],
  ["entregas", "Entregas"],
  ["perfil", "Perfil"],
];

export default function SidebarNavigation({ onNavigate, activeScreen, activeAction }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={iconCoopVale} alt="CoopVale Logo" className="sidebar-logo" />
        <span className="sidebar-subbrand">ValeGestão</span>
      </div>
      <nav className="sidebar-nav" aria-label="Navegação principal">
        {navigationItems.map(([screen, label]) => {
          const isActive = screen === activeScreen;
          const handleClick = isActive && activeAction
            ? activeAction
            : () => onNavigate?.(screen);
          return (
            <button
              key={screen}
              type="button"
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={handleClick}
              aria-current={isActive ? "page" : undefined}
            >
              <MenuIcon name={screen} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
