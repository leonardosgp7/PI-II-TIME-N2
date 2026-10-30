const form = document.getElementById('formLogin');
const campoEmail = document.getElementById('email');
const campoSenha = document.getElementById('password');
const erroEmail = document.getElementById('erroEmail');
const btnLogin = document.getElementById('btnLogin');
const btnTexto = document.getElementById('btnTexto');
const btnSpinner = document.getElementById('btnSpinner');

const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mostrarAlerta(mensagem) {
    esconderAlerta();

    const alerta = document.createElement('div');
    alerta.id = 'alertaLogin';
    alerta.className = 'alert alert-danger alert-dismissible fade show';
    alerta.setAttribute('role', 'alert');
    alerta.innerHTML =
        '<i class="bi bi-exclamation-triangle-fill me-2"></i>' +
        '<span></span>' +
        '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>';
    alerta.querySelector('span').textContent = mensagem;

    form.parentNode.insertBefore(alerta, form);
}

function esconderAlerta() {
    const alerta = document.getElementById('alertaLogin');
    if (alerta) {
        alerta.remove();
    }
}


function validarEmail() {
    const valor = campoEmail.value.trim();

    if (valor === '') {
        erroEmail.textContent = 'Informe seu email.';
        campoEmail.classList.add('is-invalid');
        return false;
    }

    if (!regexEmail.test(valor)) {
        erroEmail.textContent = 'Digite um email válido (ex: nome@empresa.com).';
        campoEmail.classList.add('is-invalid');
        return false;
    }

    campoEmail.classList.remove('is-invalid');
    return true;
}

function validarSenha() {
    if (campoSenha.value.trim() === '') {
        campoSenha.classList.add('is-invalid');
        return false;
    }

    campoSenha.classList.remove('is-invalid');
    return true;
}

function botaoCarregando(carregando) {
    btnLogin.disabled = carregando;
    btnSpinner.classList.toggle('d-none', !carregando);
    btnTexto.textContent = carregando ? 'Entrando...' : 'Login';
}

form.addEventListener('submit', function (event) {
    campoEmail.value = campoEmail.value.trim();

    const emailOk = validarEmail();
    const senhaOk = validarSenha();

    if (!emailOk || !senhaOk) {
        event.preventDefault();
        mostrarAlerta('Confira os campos destacados e tente de novo.');
        (emailOk ? campoSenha : campoEmail).focus();
        return;
    }

    event.preventDefault();
    esconderAlerta();
    botaoCarregando(true);
    fazerLogin(campoEmail.value, campoSenha.value);
});

async function fazerLogin(email, senha) {
    try {
        const resposta = await api.post('/auth/login', { email: email, senha: senha });

        salvarSessao(resposta.token, resposta.usuario);
        window.location.href = 'dashboard.html';
    } catch (erro) {
        botaoCarregando(false);
        mostrarAlerta(erro.message);
    }
}

campoEmail.addEventListener('input', function () {
    if (campoEmail.classList.contains('is-invalid')) {
        validarEmail();
    }
    esconderAlerta();
});

campoSenha.addEventListener('input', function () {
    if (campoSenha.classList.contains('is-invalid')) {
        validarSenha();
    }
    esconderAlerta();
});

window.addEventListener('pageshow', function () {
    botaoCarregando(false);
});

if (new URLSearchParams(window.location.search).get('erro') === '1') {
    mostrarAlerta('Email ou senha incorretos.');
}