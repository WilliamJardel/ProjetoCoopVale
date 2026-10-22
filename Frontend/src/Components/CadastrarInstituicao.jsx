import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function CadastrarInstituicao({ onInstituicaoCadastrada }) {
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    institution_type: "Publica",
    telephone: "",
    location: "",
  });

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setLoading(true);

    // Estrutura exata esperada pela struct Institution do Rust
    const payload = {
      id: null,
      name: formData.name,
      cnpj: formData.cnpj,
      institution_type: formData.institution_type, // "Publica" ou "Privada"
      telephone: formData.telephone.trim() ? formData.telephone : null,
      location: formData.location.trim() ? formData.location : null,
    };

    try {
      const novaInstituicao = await invoke("create_institution", {
        institution: payload,
      });

      setSucesso(`Instituição "${novaInstituicao.name}" cadastrada com sucesso!`);
      
      // Reseta o formulário
      setFormData({
        name: "",
        cnpj: "",
        institution_type: "Publica",
        telephone: "",
        location: "",
      });

      // Se houver callback para atualizar listas pai (ex: na tela de Contratos)
      if (onInstituicaoCadastrada) {
        onInstituicaoCadastrada(novaInstituicao);
      }
    } catch (err) {
      console.error("Erro ao cadastrar instituição:", err);
      // Exibe mensagens retornadas pelo service.rs (ex: "CNPJ inválido", "CNPJ já cadastrado")
      setErro(err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto", padding: "20px" }}>
      <h2>Cadastrar Nova Instituição</h2>

      {erro && (
        <div style={{ color: "red", padding: "8px", marginBottom: "10px", border: "1px solid red" }}>
          {erro}
        </div>
      )}

      {sucesso && (
        <div style={{ color: "green", padding: "8px", marginBottom: "10px", border: "1px solid green" }}>
          {sucesso}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", marginBottom: "4px" }}>Nome da Instituição *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", marginBottom: "4px" }}>CNPJ *</label>
          <input
            type="text"
            name="cnpj"
            placeholder="11.222.333/0001-81"
            value={formData.cnpj}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", marginBottom: "4px" }}>Tipo *</label>
          <select
            name="institution_type"
            value={formData.institution_type}
            onChange={handleChange}
            style={{ width: "100%", padding: "8px" }}
          >
            <option value="Publica">Pública</option>
            <option value="Privada">Privada</option>
          </select>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", marginBottom: "4px" }}>Telefone</label>
          <input
            type="text"
            name="telephone"
            value={formData.telephone}
            onChange={handleChange}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", marginBottom: "4px" }}>Endereço / Localização</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: "10px", cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Salvando..." : "Salvar Instituição"}
        </button>
      </form>
    </div>
  );
}