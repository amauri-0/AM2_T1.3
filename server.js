/**
 * server.js
 *
 * Servidor Express para cadastro e listagem de usuários usando armazenamento em arquivo JSON com controle de concorrência.
 *
 * Funcionalidades:
 * - Servir arquivos estáticos da pasta /public (ex: index.html).
 * - Rota GET /list-users/:count? para listar até N usuários cadastrados.
 * - Rota POST /cadastrar-usuario para cadastrar novo usuário com ID único.
 * - Persistência em arquivo JSON com bloqueio de escrita/leitura seguro (via proper-lockfile).
 *
 * Autor: Wellington (com pitacos do Braniac 😎)
 * Data: 2025
 */

// -----------------------------------------------------------------------------
// IMPORTAÇÃO DE MÓDULOS
// -----------------------------------------------------------------------------

const express = require("express"); // Framework para criação de APIs e servidores HTTP
const cors = require("cors"); // Middleware para permitir requisições de outras origens (CORS)
const path = require("path"); // Lida com caminhos de arquivos e diretórios
const { v4: uuidv4 } = require("uuid"); // Gera IDs únicos universais (UUID v4)

const { lerUsuarios, salvarUsuarios } = require("./users-control.js"); // Módulo de controle de leitura/escrita com lock

// -----------------------------------------------------------------------------
// CONFIGURAÇÃO DO SERVIDOR
// -----------------------------------------------------------------------------

const app = express(); // Cria uma aplicação Express

// Define o host e a porta (usa variáveis de ambiente se existirem)
const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT || 3000;

// Ativa o parser de JSON para o corpo das requisições
app.use(express.json());

// Define a pasta "public" como estática (servirá arquivos HTML, CSS, etc.)
app.use(express.static(path.join(__dirname, "public")));

// Habilita CORS para permitir requisições de outras origens
app.use(cors());

// -----------------------------------------------------------------------------
// ROTAS
// -----------------------------------------------------------------------------

/**
 * Rota principal - GET /
 * Retorna o arquivo HTML inicial (index.html) da pasta "public"
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/**
 * Rota GET /list-users/:count?
 * Retorna um número limitado de usuários do arquivo usuarios.json
 *
 * @param {number} count (opcional) - número máximo de usuários a retornar (default: 100)
 */
app.get("/list-users/:count?", async (req, res) => {
  let num = parseInt(req.params.count, 10); // Converte o parâmetro para número inteiro
  if (isNaN(num)) num = 100; // Valor padrão se não for fornecido
  num = Math.max(1, Math.min(10000, num)); // Garante que o número esteja entre 1 e 10.000

  console.log(`🔍 Solicitando até ${num} usuários...`);
  try {
    const todos = await lerUsuarios(); // Lê todos os usuários do arquivo
    const slice = todos.slice(0, num); // Pega os primeiros N usuários
    console.log(`✔️  Primeiro usuário: ${JSON.stringify(slice[0])}`);
    res.json(slice); // Retorna os usuários como JSON
  } catch (err) {
    console.error("❌ Falha ao ler usuários:", err);
    res.status(500).json({ error: "Não foi possível ler usuários." });
  }
});

/**
 * Rota POST /cadastrar-usuario
 * Recebe dados no corpo da requisição e adiciona um novo usuário ao arquivo JSON.
 *
 * @body {string} nome - Nome do usuário
 * @body {number} idade - Idade do usuário
 * @body {string} endereco - Endereço
 * @body {string} email - E-mail
 */
app.post("/cadastrar-usuario", async (req, res) => {
  try {
    const usuarios = await lerUsuarios(); // Garante dados atualizados

    const novoUsuario = {
      id: uuidv4(), // Gera um UUID para o novo usuário
      nome: req.body.nome,
      idade: req.body.idade,
      endereco: req.body.endereco,
      email: req.body.email,
    };

    usuarios.push(novoUsuario); // Adiciona à lista
    await salvarUsuarios(usuarios); // Salva no arquivo com lock
    console.log(`✔️ Usuário cadastrado: ${JSON.stringify(novoUsuario)}`);
    res.status(201).json({
      ok: true,
      message: "Usuário cadastrado com sucesso!",
      usuario: novoUsuario,
    });
  } catch (err) {
    console.error("❌ Erro ao cadastrar usuário:", err);
    res.status(500).json({ error: "Não foi possível cadastrar usuário." });
  }
});

app.delete("/users/:id", async (req, res) => {
  try {
    const usuarios = await lerUsuarios();
    const filtrados = usuarios.filter(u => u.id !== req.params.id);
    if (filtrados.length === usuarios.length) {
      return res.status(404).json({ ok: false, message: "Usuário não encontrado." });
    }
    await salvarUsuarios(filtrados);
    res.json({ ok: true, message: "Usuário excluido com sucesso." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Erro ao excluir usuário." });
  }
});

app.put("/users/:id", async (req, res) => {
  try {
    const usuarios = await lerUsuarios();
    const idx = usuarios.findIndex(u => u.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ ok: false, message: "Usuário não encontrado." });
    }
    usuarios[idx] = {
      ...usuarios[idx],
      ...req.body,
      idade: Number(req.body.idade)
    };
    await salvarUsuarios(usuarios);
    res.json({ ok: true, usuario: usuarios[idx] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Erro ao atualizar usuário." });
  }
});

// -----------------------------------------------------------------------------
// EXECUÇÃO DO SERVIDOR
// -----------------------------------------------------------------------------

// Inicia o servidor e escuta na porta especificada
app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor rodando em http://${HOST}:${PORT}`);
});
