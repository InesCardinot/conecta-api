const jwt = require('jsonwebtoken');
const db = require('../db'); // ajuste o caminho conforme sua estrutura

/**
 * Gera um token JWT para o usuário
 * @param {Object} usuario - Dados do usuário
 * @returns {string} Token JWT
 */
const gerarToken = (usuario) => {
  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome || null
    },
    process.env.JWT_SECRET || 'sua_chave_secreta_padrao',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'sua-api', // identifica quem gerou
      subject: usuario.id.toString() // ID do usuário
    }
  );
};

/**
 * Verifica e decodifica um token JWT
 * @param {string} token - Token JWT
 * @returns {Object} Dados do token decodificado
 * @throws {Error} Se token inválido ou expirado
 */
const verificarToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sua_chave_secreta_padrao');
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    }
    throw new Error('Erro ao verificar token');
  }
};

/**
 * Realiza login do usuário
 * @param {string} email - Email do usuário
 * @param {string} senha - Senha do usuário
 * @returns {Object} { token, usuario }
 * @throws {Error} Se credenciais inválidas
 */
const login = async (email, senha) => {
  try {
    // Busca usuário no banco
    const usuario = await db.query(
      'SELECT id, email, nome, senha FROM usuarios WHERE email = ?',
      [email]
    );

    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    // Valida senha
    // ⚠️ IMPORTANTE: Em produção, use bcrypt para comparar senhas!
    // const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (usuario.senha !== senha) {
      throw new Error('Senha incorreta');
    }

    // Gera token
    const token = gerarToken(usuario);

    // Retorna token e dados do usuário (SEM a senha)
    return {
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome
      }
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Registra um novo usuário
 * @param {string} email - Email do usuário
 * @param {string} senha - Senha do usuário
 * @param {string} nome - Nome do usuário
 * @returns {Object} { token, usuario }
 * @throws {Error} Se email já existe
 */
const registrar = async (email, senha, nome) => {
  try {
    // Verifica se email já existe
    const usuarioExistente = await db.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );

    if (usuarioExistente) {
      throw new Error('Email já cadastrado');
    }

    // Insere novo usuário
    const resultado = await db.query(
      'INSERT INTO usuarios (email, senha, nome) VALUES (?, ?, ?)',
      [email, senha, nome]
    );

    const novoUsuario = {
      id: resultado.insertId,
      email,
      nome
    };

    // Gera token
    const token = gerarToken(novoUsuario);

    return {
      token,
      usuario: novoUsuario
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Renova um token JWT expirado (se você quiser usar refresh tokens)
 * @param {string} tokenAntigo - Token anterior
 * @returns {string} Novo token JWT
 * @throws {Error} Se não conseguir renovar
 */
const renovarToken = (tokenAntigo) => {
  try {
    // Decodifica sem verificar expiração
    const decoded = jwt.decode(tokenAntigo);

    if (!decoded) {
      throw new Error('Token inválido');
    }

    // Gera novo token com os mesmos dados
    const novoToken = jwt.sign(
      {
        id: decoded.id,
        email: decoded.email,
        nome: decoded.nome
      },
      process.env.JWT_SECRET || 'sua_chave_secreta_padrao',
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    );

    return novoToken;
  } catch (error) {
    throw new Error('Não foi possível renovar o token');
  }
};

module.exports = {
  gerarToken,
  verificarToken,
  login,
  registrar,
  renovarToken
};
