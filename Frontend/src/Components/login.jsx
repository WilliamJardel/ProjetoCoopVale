import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "../Styles/login.css";
import { useAuth } from "../context/AuthContext"; // Importação do contexto
import iconCoopVale from "../public/img/iconCoopVale.png";

function Login({ onLoginSuccess }) {
  const { login } = useAuth(); // Hook de autenticação
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!user.trim() || !password.trim()) {
      setMessage("Informe o usuário e a senha para prosseguir.");
      return;
    }

    setMessage("");
    setIsSubmitting(true);

    try {
      if (isRegistering) {
        if (!name.trim()) {
          setMessage("Informe seu nome.");
          return;
        }
        if (password.length < 6) {
          setMessage("A senha deve ter pelo menos 6 caracteres.");
          return;
        }
        if (password !== passwordConfirmation) {
          setMessage("As senhas não conferem.");
          return;
        }

        await invoke("register_user", {
          name: name.trim(),
          email: user.trim(),
          password,
        });
      }

      await login(user.trim(), password);

      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      // Exibe o erro retornado do Rust (ex: senha errada ou bloqueio por limite)
      if (typeof err === "string") {
        setMessage(err);
      } else {
        setMessage("E-mail ou senha inválidos.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="brand-panel">
        <div className="brand-content">
          <div className="logo-mark" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>

          <h1>CoopVale</h1>

          <p className="tagline">
            Gestão que fortalece
            <br />
            <strong>quem produz.</strong>
          </p>

          <p className="description">
            Sistema completo para gestão de contratos, entregas,
            produtos, estoque e finanças.
          </p>
        </div>

        <footer className="brand-footer">
          <div>
            <b>ORGANIZAÇÃO</b>
            <span>Informações centralizadas<br />e seguras</span>
          </div>

          <div>
            <b>CONTROLE</b>
            <span>Acompanhamento de<br />entregas e finanças.</span>
          </div>

          <div>
            <b>COOPERAÇÃO</b>
            <span>Facilitando a gestão<br />da CoopVale.</span>
          </div>
        </footer>
      </section>

      <section className="login-panel">
        <img
          className="coopvale-logo"
          src={iconCoopVale}
          alt="CoopVale"
        />

        <div className="login-card">
          <h2>{isRegistering ? "Criar conta" : "Acesse sua conta"}</h2>
          <p className="subtitle">
            {isRegistering
              ? "Cadastre seus dados para acessar o CoopVale"
              : "Informe suas credenciais para prosseguir"}
          </p>

          <form onSubmit={handleSubmit}>
            {isRegistering && (
              <>
                <label htmlFor="name">Nome</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  required
                  disabled={isSubmitting}
                />
              </>
            )}

            <label htmlFor="user">E-mail</label>
            <input
              id="user"
              type="email"
              value={user}
              onChange={(event) => setUser(event.target.value)}
              autoComplete="email"
              required
              disabled={isSubmitting}
            />

            <label htmlFor="password">Senha</label>

            <div className="password-wrap">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isRegistering ? "new-password" : "current-password"}
                minLength={isRegistering ? 6 : undefined}
                required
                disabled={isSubmitting}
              />

              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? "○" : "◉"}
              </button>
            </div>

            {isRegistering ? (
              <>
                <label htmlFor="password-confirmation">Confirme a senha</label>
                <input
                  id="password-confirmation"
                  type={showPassword ? "text" : "password"}
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                  disabled={isSubmitting}
                />
              </>
            ) : (
              <button
                type="button"
                className="forgot"
                onClick={() =>
                  setMessage("A recuperação de senha será disponibilizada nesta etapa.")
                }
              >
                Esqueceu minha senha
              </button>
            )}

            <button type="submit" className="submit-button" disabled={isSubmitting}>
              {isSubmitting
                ? isRegistering
                  ? "Criando conta..."
                  : "Entrando..."
                : isRegistering
                  ? "Criar conta e entrar"
                  : "Entrar"}
            </button>
          </form>

          <button
            type="button"
            className="account-toggle"
            disabled={isSubmitting}
            onClick={() => {
              setIsRegistering((current) => !current);
              setMessage("");
              setPassword("");
              setPasswordConfirmation("");
            }}
          >
            {isRegistering ? "Já tenho uma conta. Entrar" : "Criar uma conta"}
          </button>

          <div className="divider"><span>ou</span></div>

          <button
            type="button"
            className="offline-button"
            onClick={() =>
              setMessage("Modo offline ativado: acesso somente para leitura.")
            }
          >
            Acessar offline (somente leitura)
          </button>

          <p className="message" role="status">{message}</p>
        </div>

        <div className="copyright">
          2026 CoopVale. Todos os direitos reservados.
          <br />
          CoopVale - Cooperativa dos Agricultores Familiares do Vale do Forquilha
          <br />
          <span>Versão 1.0.0</span>
        </div>
      </section>
    </main>
  );
}

export default Login;