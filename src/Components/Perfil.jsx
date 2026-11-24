import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { KeyRound, LogOut, Save, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import SidebarNavigation from "./SidebarNavigation";
import UserProfileButton from "./UserProfileButton";
import "../Styles/Dashboard.css";
import "../Styles/Perfil.css";

function Perfil({ onNavigate }) {
  const { session, updateSession, logout } = useAuth();
  const [name, setName] = useState(session?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSuccess, setNameSuccess] = useState("");
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [logoutError, setLogoutError] = useState("");

  const saveName = async (event) => {
    event.preventDefault();
    setNameError("");
    setNameSuccess("");
    const normalizedName = name.trim();
    if (!normalizedName) {
      setNameError("Informe um nome válido.");
      return;
    }
    setSavingName(true);
    try {
      const updatedSession = await invoke("update_profile_name", { name: normalizedName });
      updateSession(updatedSession);
      setNameSuccess("Nome atualizado com sucesso.");
    } catch (error) {
      setNameError(String(error));
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (passwordForm.next.length < 6) {
      setPasswordError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError("A confirmação não corresponde à nova senha.");
      return;
    }
    setSavingPassword(true);
    try {
      await invoke("change_password", {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      });
      setPasswordForm({ current: "", next: "", confirm: "" });
      setPasswordSuccess("Senha alterada com sucesso.");
    } catch (error) {
      setPasswordError(String(error));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    setLogoutError("");
    try {
      await logout();
    } catch (error) {
      setLogoutError(`Não foi possível sair da conta: ${error}`);
    }
  };

  return (
    <div className="dashboard-container profile-screen">
      <SidebarNavigation onNavigate={onNavigate} activeScreen="perfil" />
      <div className="main-wrapper">
        <main className="profile-content">
          <header className="profile-page-header">
            <div>
              <h1>Meu perfil</h1>
              <p>Gerencie seu nome, senha e acesso à conta.</p>
            </div>
            <UserProfileButton onClick={() => onNavigate?.("perfil")} />
          </header>

          <div className="profile-settings-grid">
            <section className="profile-card">
              <div className="profile-card-heading"><span className="profile-card-icon"><UserRound size={19} /></span><div><h2>Dados pessoais</h2><p>Atualize como seu nome aparece no sistema.</p></div></div>
              <form onSubmit={saveName} className="profile-form">
                <label>Nome completo<input type="text" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} autoComplete="name" required /></label>
                <label>E-mail<input type="email" value={session?.email || ""} readOnly /></label>
                {nameError && <p className="profile-message error" role="alert">{nameError}</p>}
                {nameSuccess && <p className="profile-message success" role="status">{nameSuccess}</p>}
                <div className="profile-card-actions"><button type="submit" className="profile-primary-button" disabled={savingName}><Save size={16} />{savingName ? "Salvando..." : "Salvar nome"}</button></div>
              </form>
            </section>

            <section className="profile-card">
              <div className="profile-card-heading"><span className="profile-card-icon"><KeyRound size={19} /></span><div><h2>Alterar senha</h2><p>Use sua senha atual para definir uma nova.</p></div></div>
              <form onSubmit={changePassword} className="profile-form">
                <label>Senha atual<input type="password" value={passwordForm.current} onChange={(event) => setPasswordForm((current) => ({ ...current, current: event.target.value }))} autoComplete="current-password" required /></label>
                <label>Nova senha<input type="password" value={passwordForm.next} onChange={(event) => setPasswordForm((current) => ({ ...current, next: event.target.value }))} minLength={6} autoComplete="new-password" required /><small>A senha deve ter pelo menos 6 caracteres.</small></label>
                <label>Confirmar nova senha<input type="password" value={passwordForm.confirm} onChange={(event) => setPasswordForm((current) => ({ ...current, confirm: event.target.value }))} minLength={6} autoComplete="new-password" required /></label>
                {passwordError && <p className="profile-message error" role="alert">{passwordError}</p>}
                {passwordSuccess && <p className="profile-message success" role="status">{passwordSuccess}</p>}
                <div className="profile-card-actions"><button type="submit" className="profile-primary-button" disabled={savingPassword}><KeyRound size={16} />{savingPassword ? "Alterando..." : "Alterar senha"}</button></div>
              </form>
            </section>
          </div>

          <section className="profile-logout-card">
            <div><h2>Sair da conta</h2><p>Encerre sua sessão neste dispositivo.</p></div>
            <button type="button" className="profile-logout-button" onClick={handleLogout}><LogOut size={16} />Sair</button>
            {logoutError && <p className="profile-message error" role="alert">{logoutError}</p>}
          </section>
        </main>
      </div>
    </div>
  );
}

export default Perfil;
