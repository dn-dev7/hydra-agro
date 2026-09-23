import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HydraCodeAuthFlow } from "../src/features/auth/hydra-code-auth";

const actions = {
  onCodeLogin: vi.fn(async () => ({ ok: true, message: "ok" })),
  onStaffLogin: vi.fn(async () => ({ ok: true, message: "ok" })),
};

describe("entrada por código do Hydra Agro", () => {
  it("exibe apenas o código privado, sem solicitar e-mail ou senha", () => {
    render(<HydraCodeAuthFlow initialView="auth" {...actions} />);
    expect(screen.getByRole("heading", { name: "Entre no Hydra Agro" })).toBeInTheDocument();
    expect(screen.getByLabelText("Código de acesso")).toBeInTheDocument();
    expect(screen.queryByLabelText(/e-mail|senha/i)).not.toBeInTheDocument();
  });

  it("mantém criação de conta e recuperação por código separadas", () => {
    render(<HydraCodeAuthFlow initialView="auth" {...actions} />);
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(screen.getByRole("heading", { name: "Crie sua conta" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    fireEvent.click(screen.getByRole("button", { name: "Perdi meu código" }));
    expect(screen.getByLabelText("Código de recuperação")).toBeInTheDocument();
  });

  it("preserva o código de funcionários no mesmo fluxo", () => {
    render(<HydraCodeAuthFlow {...actions} />);
    fireEvent.click(screen.getByRole("button", { name: /Acesso de funcionário/i }));
    expect(screen.getByLabelText("Código de funcionário")).toBeInTheDocument();
  });
});
