// Array que armazenará os usuários carregados da API
let usuarios = [];

// Página inicial da tabela
let paginaAtual = 1;

// Define quantos usuários serão exibidos por página
const usuariosPorPagina = 20;

// Define o campo e a ordem (crescente ou decrescente) para a ordenação
let ordemAtual = {campo: null, crescente: true};

// Função assíncrona que carrega os usuários da API
async function carregarUsuarios() {
  // Faz uma requisição para a API que retorna 200 usuários
  const resposta = await fetch("http://localhost:3000/list-users/10000"); //Testar passando como parâmetro 1000000

  // Converte a resposta em JSON e armazena no array global
  usuarios = await resposta.json();

  console.log("Carregando usuários...");
  console.log("Resposta da API:", resposta.status, resposta.statusText);
  console.log("Resposta da API:", resposta.headers.get("Content-Type"));
  console.log("Total de usuários carregados:", usuarios.length);

  // Atualiza a interface com os dados recebidos
  atualizarPaginacao();
}

// Função que compara duas strings, com ou sem normalização completa
function comparaStrings(a, b, fullCompare = true) {
  // Normaliza as strings para remover acentos e coloca em minúsculas
  const sa = a
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  const sb = b
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  // Determina quantos caracteres serão comparados: todos ou apenas 3
  const len = fullCompare ? Math.max(sa.length, sb.length) : 3;

  // Compara caractere por caractere
  for (let i = 0; i < len; i++) {
    const c1 = sa.charCodeAt(i) || 0;
    const c2 = sb.charCodeAt(i) || 0;

    if (c1 < c2) return -1;
    if (c1 > c2) return 1;
  }

  // Se todos os caracteres comparados forem iguais
  return 0;
}

// Função de ordenação com o algoritmo da bolha
function bubbleSort(arr, campo, crescente) {
  for (let i = 0; i < arr.length - 1; i++) {
    for (let j = 0; j < arr.length - 1 - i; j++) {
      // Se for crescente: swap quando arr[j] > arr[j+1]
      // Se for decrescente: swap quando arr[j] < arr[j+1]
      const deveTrocar = crescente
        ? arr[j][campo] > arr[j + 1][campo]
        : arr[j][campo] < arr[j + 1][campo];
      if (deveTrocar) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
}

// Função que ordena a tabela com base no campo clicado
function ordenarTabela(campo) {
  // Inverte a ordem se o mesmo campo for clicado novamente
  if (ordemAtual.campo === campo) {
    ordemAtual = { campo, crescente: !ordemAtual.crescente };
  } else {
    ordemAtual = { campo, crescente: true };
  }

  // Ordena o array de usuários
  bubbleSort(usuarios, ordemAtual.campo, ordemAtual.crescente);

  // Atualiza a tabela com os dados ordenados
  atualizarPaginacao();
}

// Atualiza os dados exibidos na página atual
function atualizarPaginacao() {
  const totalPaginas = Math.ceil(usuarios.length / usuariosPorPagina); // Calcula o total de páginas

  // Garante que o número da página esteja dentro dos limites válidos
  paginaAtual = Math.max(1, Math.min(paginaAtual, totalPaginas));

  // Atualiza os elementos de interface que mostram os números de página
  document.getElementById("paginaAtual").innerText = paginaAtual;
  document.getElementById("totalPaginas").innerText = totalPaginas;

  // Define os índices de início e fim para o slice do array
  const inicio = (paginaAtual - 1) * usuariosPorPagina;
  const fim = inicio + usuariosPorPagina;

  // Renderiza apenas os usuários da página atual
  renderizarTabela(usuarios.slice(inicio, fim));
}

// Função chamada ao clicar em "Página Anterior"
function paginaAnterior() {
  paginaAtual--;
  atualizarPaginacao();
}

// Função chamada ao clicar em "Próxima Página"
function proximaPagina() {
  paginaAtual++;
  atualizarPaginacao();
}

// Função que desenha a tabela com os dados de usuários
function renderizarTabela(data) {
  const tbody = document.querySelector("#tabelaUsuarios tbody"); // Seleciona o corpo da tabela

  tbody.innerHTML = ""; // Limpa o conteúdo anterior da tabela

  // Insere uma linha HTML para cada usuário no array recebido
  data.forEach((u) => {
    tbody.innerHTML += `
      <tr>
        <td>${u.nome}</td>
        <td>${u.idade}</td>
        <td>${u.endereco}</td>
        <td>${u.email}</td>
        <td>
          <button type="button" onclick="alterarUsuario('${u.id}')">Alterar</button>
          <button type="button" onclick="excluirUsuario('${u.id}')">Excluir</button>
        </td>
      </tr>`;
  });
}

async function excluirUsuario(id) {
  if (!confirm("Confirma a exclusão deste usuário?")) return;
  try {
    const resp = await fetch(`http://localhost:3000/users/${id}`, { method: "DELETE" });
    const data = await resp.json();
    if (!data.ok) throw new Error(data.message);
    usuarios = usuarios.filter(u => u.id !== id);
    const total = Math.ceil(usuarios.length / usuariosPorPagina);
    paginaAtual = Math.min(paginaAtual, total);
    atualizarPaginacao();
  } catch (err) {
    alert("Falha ao excluir: " + err.message);
  }
}

async function alterarUsuario(id) {
  const usuario = usuarios.find(u => u.id === id);
  if (!usuario) return alert("Usuário não encontrado.");
  const novoNome = prompt("Nome:", usuario.nome);
  if (novoNome === null) return;
  const novaIdade = prompt("Idade:", usuario.idade);
  if (novaIdade === null) return;
  const novoEndereco = prompt("Endereço:", usuario.endereco);
  if (novoEndereco === null) return;
  const novoEmail = prompt("E‑mail:", usuario.email);
  if (novoEmail === null) return;

  const payload = {
    nome: novoNome,
    idade: Number(novaIdade),
    endereco: novoEndereco,
    email: novoEmail
  };

  try {
    const resp = await fetch(`http://localhost:3000/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (!data.ok) throw new Error(data.message);
    Object.assign(usuario, data.usuario);
    atualizarPaginacao();
  } catch (err) {
    alert("Falha ao alterar: " + err.message);
  }
}

// Quando a página for carregada, executa a função que busca os usuários
window.onload = carregarUsuarios;
