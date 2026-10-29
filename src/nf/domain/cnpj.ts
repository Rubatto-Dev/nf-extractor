// Vale para o CNPJ numérico e para o alfanumérico (IN RFB 2.229/2024): cada caractere
// conta como (código ASCII − 48), e os dois dígitos verificadores continuam numéricos.
const PESOS_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_DV2 = [6, ...PESOS_DV1];
const FORMATO = /^[0-9A-Z]{12}[0-9]{2}$/;

export function normalizarCnpj(valor: string): string {
  return valor.replace(/[.\-/\s]/g, "").toUpperCase();
}

function digitoVerificador(base: string, pesos: number[]): number {
  const soma = [...base].reduce((acc, c, i) => acc + (c.charCodeAt(0) - 48) * (pesos[i] ?? 0), 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cnpjValido(valor: string): boolean {
  const cnpj = normalizarCnpj(valor);
  if (!FORMATO.test(cnpj) || /^(.)\1+$/.test(cnpj)) return false;
  return gerarCnpj(cnpj.slice(0, 12)) === cnpj;
}

export function gerarCnpj(raiz: string): string {
  if (!/^[0-9A-Z]{12}$/.test(raiz)) throw new Error("a raiz do CNPJ tem 12 caracteres");
  const dv1 = digitoVerificador(raiz, PESOS_DV1);
  const dv2 = digitoVerificador(raiz + dv1, PESOS_DV2);
  return `${raiz}${dv1}${dv2}`;
}

export function formatarCnpj(valor: string): string {
  const c = normalizarCnpj(valor);
  if (c.length !== 14) return valor;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}
