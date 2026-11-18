import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function CadastrarInstituicao({ onInstituicaoCadastrada, onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    institution_type: "Publica",
    telephone: "",
    location: "",
  });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErro("");
    setLoading(true);
    const payload = {
      id: null,
      name: formData.name.trim(),
      cnpj: formData.cnpj.trim(),
      institution_type: formData.institution_type,
      telephone: formData.telephone.trim() || null,
      location: formData.location.trim() || null,
    };

    try {
      const institution = await invoke("create_institution", { institution: payload });
      onInstituicaoCadastrada?.(institution);
    } catch (error) {
      console.error("Erro ao cadastrar instituição:", error);
      setErro(typeof error === "string" ? error : error?.message || String(error));
    } finally {
      setLoading(false);
    }
  };

  return <>
    <div className="modal-header">
      <div><h2>Cadastrar nova instituição</h2><p>Preencha os dados para adicioná-la ao contrato.</p></div>
      <button type="button" className="modal-close" onClick={onCancel} aria-label="Voltar à seleção de instituições">✕</button>
    </div>
    <form onSubmit={handleSubmit}>
      <div className="modal-body contract-institution-form">
        {erro && <div className="contract-institution-error" role="alert">{erro}</div>}
        <div className="form-grid-2">
          <div className="form-group full-width"><label htmlFor="institution-name">Nome da instituição *</label><input id="institution-name" type="text" name="name" value={formData.name} onChange={handleChange} maxLength={150} required autoFocus /></div>
          <div className="form-group"><label htmlFor="institution-cnpj">CNPJ *</label><input id="institution-cnpj" type="text" name="cnpj" placeholder="11.222.333/0001-81" value={formData.cnpj} onChange={handleChange} required /></div>
          <div className="form-group"><label htmlFor="institution-type">Tipo *</label><select id="institution-type" name="institution_type" value={formData.institution_type} onChange={handleChange} required><option value="Publica">Pública</option><option value="Privada">Privada</option></select></div>
          <div className="form-group"><label htmlFor="institution-phone">Telefone</label><input id="institution-phone" type="tel" name="telephone" value={formData.telephone} onChange={handleChange} /></div>
          <div className="form-group"><label htmlFor="institution-location">Endereço / Localização</label><input id="institution-location" type="text" name="location" value={formData.location} onChange={handleChange} maxLength={200} /></div>
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn-cancel" onClick={onCancel} disabled={loading}>Voltar</button>
        <button type="submit" className="btn-save-contract" disabled={loading}>{loading ? "Salvando..." : "Salvar e selecionar"}</button>
      </div>
    </form>
  </>;
}
