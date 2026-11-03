/* 
Autor: Vittor Maia Hagge
RA: 26025923
*/
const formulario = document.querySelector("#formulario");

const campoTitulo = document.querySelector("#titulo");
const campoDescricao = document.querySelector("#descricao");
const campoProjeto = document.querySelector("#projeto");
const campoResponsavel = document.querySelector("#responsavel");
const campoTipo = document.querySelector("#tipo");
const campoPrioridade = document.querySelector("#prioridade");
const campoData = document.querySelector("#data");

const erroTitulo = document.querySelector("#erroTitulo");
const erroDescricao = document.querySelector("#erroDescricao");
const erroProjeto = document.querySelector("#erroProjeto");
const erroResponsavel = document.querySelector("#erroResponsavel");
const erroTipo = document.querySelector("#erroTipo");
const erroPrioridade = document.querySelector("#erroPrioridade");
const erroData = document.querySelector("#erroData");

const camposComErro = [
    campoTitulo,
    campoDescricao,
    campoProjeto,
    campoResponsavel,
    campoTipo,
    campoPrioridade,
    campoData
];

const mensagensDeErro = [
    erroTitulo,
    erroDescricao,
    erroProjeto,
    erroResponsavel,
    erroTipo,
    erroPrioridade,
    erroData
];

function mostrarErro(campo, elementoErro, mensagem) {
    campo.classList.add("is-invalid");
    elementoErro.innerText = mensagem;
}

function limparErros() {
    camposComErro.forEach(function (campo) {
        campo.classList.remove("is-invalid");
    });

    mensagensDeErro.forEach(function (elementoErro) {
        elementoErro.innerText = "";
    });
}

formulario.addEventListener("submit", async function (event) {
    event.preventDefault();
    limparErros();

    const titulo = campoTitulo.value.trim();
    const descricao = campoDescricao.value.trim();
    const projeto = campoProjeto.value;
    const responsavel = campoResponsavel.value.trim();
    const tipo = campoTipo.value;
    const prioridade = campoPrioridade.value;
    const data = campoData.value;

    let formValido = true;

    if (titulo === "") {
        mostrarErro(campoTitulo, erroTitulo, "Digite o título.");
        formValido = false;
    }

    if (descricao === "") {
        mostrarErro(campoDescricao, erroDescricao, "Digite uma descrição.");
        formValido = false;
    }

    if (projeto === "") {
        mostrarErro(campoProjeto, erroProjeto, "Selecione um projeto.");
        formValido = false;
    }

    if (tipo === "") {
        mostrarErro(campoTipo, erroTipo, "Selecione um tipo.");
        formValido = false;
    }

    if (prioridade === "") {
        mostrarErro(campoPrioridade, erroPrioridade, "Selecione uma prioridade.");
        formValido = false;
    }

    if (data === "") {
        mostrarErro(campoData, erroData, "Digite uma data.");
        formValido = false;
    }

    if (!formValido) {
        return;
    }

    try {
        await api.post("/demandas", {
            titulo: titulo,
            descricao: descricao,
            projetoId: projeto,
            responsavelId: responsavel,
            tipo: tipo,
            prioridade: prioridade,
            prazo: data
        });

        alert("Demanda cadastrada com sucesso!");
        formulario.reset();
    } catch (erro) {
        if (erro.message.includes("feriado")) {
            mostrarErro(campoData, erroData, erro.message);
        } else {
            alert(erro.message);
        }
    }
});

formulario.addEventListener("reset", limparErros);


async function carregarProjetos() {
    try {
        const projetos = await api.get("/projetos");

        projetos.forEach(function (projeto) {
            campoProjeto.innerHTML += '<option value="' + projeto.id + '">' + projeto.nome + '</option>';
        });
    } catch (erro) {
        mostrarErro(campoProjeto, erroProjeto, "Não foi possível carregar os projetos.");
    }
}

carregarProjetos();


async function carregarUsuarios() {
    try {
        const usuarios = await api.get("/usuarios");

        usuarios.forEach(function (usuario) {
            if (usuario.ativo && usuario.perfil !== "ADMINISTRADOR") {
                campoResponsavel.innerHTML += '<option value="' + usuario.id + '">' + usuario.nome + '</option>';
            }
        });
    } catch (erro) {
        mostrarErro(campoResponsavel, erroResponsavel, "Não foi possível carregar os responsáveis.");
    }
}

carregarUsuarios();