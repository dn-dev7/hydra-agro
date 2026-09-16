import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyAccount } from "../src/lib/hydra-types";
import { PropertyRoutine } from "../src/features/home/property-routine";

vi.mock("../src/features/climate/home-science-summary", () => ({ HomeScienceSummary: ({ compact }: { compact: boolean }) => <section aria-label="Clima">{compact ? "Clima compacto" : "Clima completo"}</section> }));
afterEach(cleanup);
function fixture() {
  const account = createEmptyAccount({ id: "test", email: "test@example.com", name: "Produtor" });
  account.activities = [{ id: "later", title: "Verificar cerca", category: "Manejo", date: "2026-10-02", done: false }, { id: "next", title: "Verificar água", category: "Inspeção", date: "2026-10-01", done: false }];
  return account;
}
describe("Rotina da propriedade", () => {
  it("usa quatro atalhos reais e somente um resumo climático", () => {
    const navigate = vi.fn();
    render(<PropertyRoutine account={fixture()} navigate={navigate} announcements={[]} updateAccount={vi.fn()} greeting="Bom dia" unread={false} onNutriCiclo={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Ler tag" }));
    expect(navigate).toHaveBeenCalledWith("nfc");
    expect(screen.getAllByRole("region", { name: "Clima" })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Verificar água");
    expect(screen.queryByText(/Fontes de água ativas/)).not.toBeInTheDocument();
  });
  it("conclui a tarefa pela atualização existente sem mudar as outras", async () => {
    const account = fixture();
    const update = vi.fn(async (updater) => { const next = updater(account); expect(next.activities.find((item: { id: string }) => item.id === "next").done).toBe(true); expect(next.activities.find((item: { id: string }) => item.id === "later").done).toBe(false); });
    render(<PropertyRoutine account={account} navigate={vi.fn()} announcements={[]} updateAccount={update} greeting="Bom dia" unread={false} onNutriCiclo={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Concluir Verificar água" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Tarefa concluída"));
    expect(update).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).not.toHaveTextContent("Sincronizado");
  });
  it("mostra erro em vez de anunciar sucesso", async () => {
    render(<PropertyRoutine account={fixture()} navigate={vi.fn()} announcements={[]} updateAccount={vi.fn().mockRejectedValue(new Error("Sem permissão para salvar"))} greeting="Bom dia" unread={false} onNutriCiclo={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Concluir Verificar água" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Sem permissão para salvar"));
    expect(screen.getByRole("status")).not.toHaveTextContent("Tarefa concluída");
  });
});
