/* 
Autor: Vittor Maia Hagge
RA: 26025923
*/
interface Feriado {
  date: string;
  name: string;
  type: string;
}

export async function buscarFeriado(data: string) {
    const ano = data.substring(0, 4);

    const endereco = "https://brasilapi.com.br/api/feriados/v1/" + ano;

    const resposta = await fetch(endereco);

    if (!resposta.ok) {
        throw new Error("Não foi possível consultar os feriados.");
    }

    const feriados: Feriado[] = await resposta.json();

    const feriado = feriados.find((item) => item.date === data);

    return feriado;
}







