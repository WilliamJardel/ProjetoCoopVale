import { icon } from "./icons";
import { escapeHtml } from "../utils/format";

export function renderLogin(error = ""): string {
  return `
    <main class="login-page">
      <section class="login-card">
        <div class="login-brand">
          <span class="brand-mark" aria-hidden="true"><span>✦</span></span>
          <span class="brand-name">Coopvale</span>
          <span class="brand-caption">ValeGestão</span>
        </div>
        <h1>Acesse sua conta</h1>
        <p>Entre para gerenciar as entregas da cooperativa.</p>
        <form id="login-form">
          <label class="login-field">E-mail<input name="email" type="email" autocomplete="username" required placeholder="seu@email.com" /></label>
          <label class="login-field">Senha<input name="password" type="password" autocomplete="current-password" required placeholder="Sua senha" /></label>
          ${error ? `<div class="login-error" role="alert">${icon("info")}<span>${escapeHtml(error)}</span></div>` : ""}
          <button class="button button-primary login-submit" type="submit">Entrar</button>
        </form>
      </section>
    </main>
  `;
}
