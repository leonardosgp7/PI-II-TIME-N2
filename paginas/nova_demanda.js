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

formulario.addEventListener("submit", function (event) {
    event.preventDefault();
    limparErros();

    const titulo = campoTitulo.value.trim();
    const descricao = campoDescricao.value.trim();
    const projeto = campoProjeto.value;
    const responsavel = campoResponsavel.value;
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

    if (responsavel === "") {
        mostrarErro(campoResponsavel, erroResponsavel, "Selecione um responsável.");
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

    if (formValido) {
        alert("Demanda cadastrada com sucesso!");
    }
});

formulario.addEventListener("reset", limparErros);