import React, { useState } from "react";
import "../Styles/login.css";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!user.trim() || !password.trim()) {
      setMessage("Informe o usuário e a senha para prosseguir.");
      return;
    }

    setMessage("Demonstração: credenciais recebidas.");
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
          src="./public/img/iconCoopVale.png"
          alt="CoopVale"
        />

        <div className="login-card">
          <h2>Acesse sua conta</h2>
          <p className="subtitle">Informe suas credenciais para prosseguir</p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="user">E-mail ou usuário</label>
            <input
              id="user"
              type="text"
              value={user}
              onChange={(event) => setUser(event.target.value)}
              autoComplete="username"
            />

            <label htmlFor="password">Senha</label>

            <div className="password-wrap">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
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

            <button
              type="button"
              className="forgot"
              onClick={() =>
                setMessage("A recuperação de senha será disponibilizada nesta etapa.")
              }
            >
              Esqueci minha senha
            </button>

            <button type="submit" className="submit-button">
              Entrar
            </button>
          </form>

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
