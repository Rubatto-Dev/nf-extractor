"use client";

const LADO_MAXIMO = 2000;
const QUALIDADE = 0.85;

// Foto de celular passa fácil de 4 MB. Reduzir no navegador cabe no limite de upload da
// Vercel (4,5 MB) e gasta menos token: o modelo reduz imagens grandes de qualquer jeito.
export async function reduzirImagem(arquivo: File): Promise<File> {
  if (!arquivo.type.startsWith("image/")) return arquivo;
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  if (escala === 1 && arquivo.size < 3_500_000) {
    bitmap.close();
    return arquivo;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", QUALIDADE));
  if (!blob) return arquivo;
  const nome = arquivo.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], nome, { type: "image/jpeg" });
}
