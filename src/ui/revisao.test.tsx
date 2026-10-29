// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Nota } from "@/nf/domain/nota";
import { Revisao } from "./revisao";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("next/link", () => ({
  default: (p: AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...p} />,
}));

// O modelo leu 91,98 onde a nota diz 91,93: soma e item ficam inconsistentes.
const notaLida: Nota = {
  cnpjEmitente: "65543552000191",
  dataEmissao: "2026-01-08",
  valorTotal: 9193,
  desconto: 0,
  frete: 0,
  itens: [
    { descricao: "QUEIJO MUSSARELA", quantidade: 2.086, valorUnitario: 44.07, valorTotal: 9198 },
  ],
};

const documento = {
  id: "11111111-1111-1111-1111-111111111111",
  nomeArquivo: "nota-23.jpg",
  mime: "image/jpeg",
  status: "revisao",
  erro: null,
  modelo: "claude-opus-5-5",
};

function renderizar(parcial: Partial<Parameters<typeof Revisao>[0]> = {}) {
  return render(
    <Revisao documento={documento} nota={notaLida} hoje="2026-10-28" fila={[]} {...parcial} />,
  );
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ sinalizacoes: [] })));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Revisao", () => {
  it("mostra os alertas do domínio e bloqueia a aprovação", () => {
    renderizar();
    expect(screen.getByText("2 alertas")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Item 1: 2,086 × 44,07 = R$ 91,93");
    expect(screen.getByLabelText("Total do item 1")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Aprovar" })).toBeDisabled();
  });

  it("libera a aprovação quando a pessoa corrige e envia a nota corrigida", async () => {
    const user = userEvent.setup();
    renderizar();
    const total = screen.getByLabelText("Total do item 1");
    await user.clear(total);
    await user.type(total, "91,93");

    expect(screen.getByText("Sem alertas")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Aprovar" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`/api/notas/${documento.id}`);
    expect(JSON.parse(init.body)).toMatchObject({
      aprovar: true,
      nota: { itens: [{ valorTotal: 9193 }] },
    });
  });

  it("aponta campo digitado errado e não deixa salvar", async () => {
    const user = userEvent.setup();
    renderizar();
    await user.clear(screen.getByLabelText("Valor total (R$)"));
    await user.type(screen.getByLabelText("Valor total (R$)"), "abc");
    expect(screen.getByRole("alert")).toHaveTextContent('Valor total: "abc" não é um valor.');
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("mostra o erro da API ao salvar", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ erro: { mensagem: "Banco fora do ar." } }), { status: 503 }),
    );
    const user = userEvent.setup();
    renderizar();
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Banco fora do ar.")).toBeInTheDocument();
  });

  it("adiciona e remove itens", async () => {
    const user = userEvent.setup();
    renderizar();
    await user.click(screen.getByRole("button", { name: "+ Adicionar item" }));
    expect(screen.getByText("Itens (2)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remover item 2" }));
    expect(screen.getByText("Itens (1)")).toBeInTheDocument();
  });

  it("explica a falha quando a extração não deu certo", () => {
    renderizar({
      nota: null,
      documento: { ...documento, status: "falhou", erro: "nao_e_nota: não parece nota" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível extrair esta nota.");
    expect(screen.queryByRole("button", { name: "Aprovar" })).not.toBeInTheDocument();
  });

  it("nota aprovada fica só para leitura", () => {
    renderizar({
      documento: { ...documento, status: "aprovada" },
      nota: { ...notaLida, itens: [{ ...notaLida.itens[0]!, valorTotal: 9193 }] },
    });
    expect(screen.getByLabelText("Valor total (R$)")).toBeDisabled();
    expect(screen.getByText("Nota aprovada.")).toBeInTheDocument();
  });
});
