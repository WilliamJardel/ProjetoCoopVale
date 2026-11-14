import { invoke } from "@tauri-apps/api/core";

export interface Session {
  user_id: number;
  name: string;
  email: string;
  logged_in_at: string;
}

export const authService = {
  async login(email: string, password: string): Promise<Session> {
    return await invoke<Session>("login", { email, password });
  },

  async logout(): Promise<void> {
    await invoke<void>("logout");
  },

  async getCurrentSession(): Promise<Session | null> {
    return await invoke<Session | null>("current_session");
  },

  async isAuthenticated(): Promise<boolean> {
    return await invoke<boolean>("is_authenticated");
  },
};