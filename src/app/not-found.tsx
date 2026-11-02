import Link from "next/link";

export default function NaoEncontrada() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Nota não encontrada</h1>
      <p className="text-sm text-secundario">
        Ela pode ter sido apagada: a demo apaga uma vez por dia as notas com mais de 24 horas.
      </p>
      <Link href="/" className="text-sm font-medium text-link">
        Voltar para as notas
      </Link>
    </main>
  );
}
