import { IconeAlerta } from "./icones";

const README = "https://github.com/Rubatto-Dev/nf-extractor#the-number";

// Com EXTRACTOR=fake o app devolve sempre a mesma nota fictícia; sem este aviso, quem envia
// uma foto própria vê dados que não são dela e acha que a IA errou.
export function AvisoSemIa() {
  return (
    <div
      role="note"
      className="flex gap-2.5 rounded-xl bg-info-fundo px-4 py-3 text-[13px] leading-relaxed text-info"
    >
      <IconeAlerta tamanho={18} className="mt-px shrink-0" />
      <p>
        <b>Leitura por IA desligada nesta demo.</b> Qualquer arquivo enviado devolve a mesma nota de
        exemplo, para mostrar a revisão, os alertas e o CSV sem custo. A extração real com o Claude
        foi medida em 30 notas, com os números no{" "}
        <a href={README} className="font-medium underline underline-offset-2">
          README do projeto
        </a>
      </p>
    </div>
  );
}
