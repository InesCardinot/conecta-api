const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../db'); // ajuste o caminho conforme sua estrutura

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
      issuer: 'sua-api',
      subject: usuario.id.toString()
    }
  );
};

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

const login = async (email, senha) => {
  const usuario = await db.query(
    'SELECT id, email, nome, senha FROM usuarios WHERE email = ?',
    [email]
  );

  if (!usuario) {
    throw new Error('Usuário não encontrado');
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha);
  if (!senhaValida) {
    throw new Error('Senha incorreta');
  }

  const token = gerarToken(usuario);

  return {
    token,
    usuario: {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome
    }
  };
};

const registrar = async (email, senha, nome) => {
  const usuarioExistente = await db.query(
    'SELECT id FROM usuarios WHERE email = ?',
    [email]
  );

  if (usuarioExistente) {
    throw new Error('Email já cadastrado');
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const resultado = await db.query(
    'INSERT INTO usuarios (email, senha, nome) VALUES (?, ?, ?)',
    [email, senhaHash, nome]
  );

  const novoUsuario = {
    id: resultado.insertId,
    email,
    nome
  };

  const token = gerarToken(novoUsuario);

  return {
    token,
    usuario: novoUsuario
  };
};

const renovarToken = (tokenAntigo) => {
  const decoded = jwt.decode(tokenAntigo);

  if (!decoded) {
    throw new Error('Token inválido');
  }

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
};

module.exports = {
  gerarToken,
  verificarToken,
  login,
  registrar,
  renovarToken
};
