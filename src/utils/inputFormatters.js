export const formatCnpjInput = (value) => {
  const cnpj = value.replace(/[^a-z\d]/gi, "").toUpperCase().slice(0, 14);
  const parts = [
    cnpj.slice(0, 2),
    cnpj.slice(2, 5),
    cnpj.slice(5, 8),
    cnpj.slice(8, 12),
    cnpj.slice(12, 14),
  ];

  let formatted = parts[0];
  if (cnpj.length > 2) formatted += `.${parts[1]}`;
  if (cnpj.length > 5) formatted += `.${parts[2]}`;
  if (cnpj.length > 8) formatted += `/${parts[3]}`;
  if (cnpj.length > 12) formatted += `-${parts[4]}`;
  return formatted;
};

export const formatPhoneInput = (value) => {
  const digits = String(value).replace(/\D/g, "").slice(0, 11);

  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export const formatIntegerInput = (value) => {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";

  return Number(digits).toLocaleString("pt-BR");
};

export const parseIntegerInput = (value) =>
  Number(String(value).replace(/\D/g, ""));

export const formatCurrencyInput = (value) => {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";

  return (Number(digits) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const parseCurrencyInput = (value) => {
  const digits = String(value).replace(/\D/g, "");
  return digits ? Number(digits) / 100 : 0;
};
