const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (HTML, CSS, JS)
app.use(express.static(__dirname));
app.use('/pages', express.static(__dirname + '/pages'));

const sequelize = new Sequelize({ dialect: 'sqlite', storage: './valorem.sqlite' });

// ============= MODELOS =============

// Usuario Table
const Usuario = sequelize.define('Usuario', {
  id_usuario: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nome: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  senha: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'Usuario',
  timestamps: false
});

// Categoria Table
const Categoria = sequelize.define('Categoria', {
  id_categoria: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nome: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  }
}, {
  tableName: 'Categoria',
  timestamps: false
});

// Transacao Table
const Transacao = sequelize.define('Transacao', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  descricao: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  valor: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    validate: { min: 0.01 }
  },
  data: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  tipo: {
    type: DataTypes.ENUM('despesa', 'receita'),
    allowNull: false,
    defaultValue: 'despesa'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  id_categoria: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Categoria',
      key: 'id_categoria'
    }
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Usuario',
      key: 'id_usuario'
    }
  }
}, {
  tableName: 'Transacao',
  timestamps: false
});

// Auditoria_Valorem Table
const Auditoria = sequelize.define('Auditoria_Valorem', {
  id_log: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  mensagem: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  data_log: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Auditoria_Valorem',
  timestamps: false
});

// ============= RELACIONAMENTOS =============
Transacao.belongsTo(Categoria, { foreignKey: 'id_categoria' });
Transacao.belongsTo(Usuario, { foreignKey: 'id_usuario' });
Categoria.hasMany(Transacao, { foreignKey: 'id_categoria' });
Usuario.hasMany(Transacao, { foreignKey: 'id_usuario' });

// ============= HELPER FUNCTIONS =============
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const verifyPassword = (password, hash) => {
  return hashPassword(password) === hash;
};

// ============= MIDDLEWARE DE AUTENTICAÇÃO =============
const checkAuth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  req.userId = parseInt(userId);
  next();
};

// ============= INICIALIZAÇÃO DO BANCO =============
sequelize.sync({ force: false }).then(async () => {
  try {

    await sequelize.query(`
      CREATE VIEW IF NOT EXISTS vw_extrato_detalhado AS
      SELECT
        t.id,
        t.id_usuario,
        t.id_categoria,
        u.nome AS usuario,
        strftime('%d/%m/%Y', t.data) AS data_formatada,
        t.descricao,
        c.nome AS categoria,
        t.tipo,
        CASE
          WHEN t.tipo = 'despesa' THEN t.valor * -1
          ELSE t.valor
        END AS valor_contabil,
        t.valor,
        t.data
      FROM Transacao t
      INNER JOIN Categoria c ON t.id_categoria = c.id_categoria
      INNER JOIN Usuario u ON t.id_usuario = u.id_usuario
    `);


    await sequelize.query(`
      CREATE TRIGGER IF NOT EXISTS trg_alerta_despesa_alta
      AFTER INSERT ON Transacao
      FOR EACH ROW
      WHEN NEW.tipo = 'despesa' AND NEW.valor > 1000.00
      BEGIN
        INSERT INTO Auditoria_Valorem (mensagem, data_log)
        VALUES ('ALERTA: Despesa de alto valor cadastrada pelo Usuário ID: ' || NEW.id_usuario || ' | ID Transação: ' || NEW.id || ' | Valor: R$ ' || NEW.valor, CURRENT_TIMESTAMP);
      END;
    `);

    // Inserir categorias padrão
    const categoriesCount = await Categoria.count();
    if (categoriesCount === 0) {
      await Categoria.bulkCreate([
        { nome: 'Alimentação' },
        { nome: 'Transporte' },
        { nome: 'Saúde' },
        { nome: 'Educação' },
        { nome: 'Entretenimento' },
        { nome: 'Moradia' },
        { nome: 'Utilities' },
        { nome: 'Outros' }
      ]);
    }

    console.log('✅ Banco de dados sincronizado com sucesso!');
  } catch (error) {
    console.error('Erro ao sincronizar banco:', error);
  }
});

// ============= ENDPOINTS DE AUTENTICAÇÃO =============

// CADASTRO
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const usuario = await Usuario.create({
      nome,
      email,
      senha: hashPassword(senha)
    });

    res.json({ id_usuario: usuario.id_usuario, nome: usuario.nome, email: usuario.email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario || !verifyPassword(senha, usuario.senha)) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    res.json({ id_usuario: usuario.id_usuario, nome: usuario.nome, email: usuario.email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= ENDPOINTS DE CATEGORIAS =============

// LISTAR CATEGORIAS
app.get('/api/categorias', async (req, res) => {
  try {
    const categorias = await Categoria.findAll();
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRIAR CATEGORIA
app.post('/api/categorias', checkAuth, async (req, res) => {
  try {
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const categoriaExistente = await Categoria.findOne({ where: { nome } });
    if (categoriaExistente) {
      return res.status(400).json({ error: 'Categoria já existe' });
    }

    const categoria = await Categoria.create({ nome });
    res.json(categoria);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ATUALIZAR CATEGORIA
app.put('/api/categorias/:id', checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    await Categoria.update({ nome }, { where: { id_categoria: id } });
    res.json({ mensagem: 'Categoria atualizada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// EXCLUIR CATEGORIA
app.delete('/api/categorias/:id', checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await Categoria.destroy({ where: { id_categoria: id } });
    res.json({ mensagem: 'Categoria excluída com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= ENDPOINTS DE TRANSAÇÕES =============

// LISTAR TRANSAÇÕES DO USUÁRIO
app.get('/api/transacoes', checkAuth, async (req, res) => {
  try {
    const [results] = await sequelize.query(
      `SELECT *
       FROM vw_extrato_detalhado
       WHERE id_usuario = ?
       ORDER BY data DESC`,
      { replacements: [req.userId] }
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// LISTAR LOGS DA AUDITORIA DE DESPESAS ALTAS
app.get('/api/auditoria', checkAuth, async (req, res) => {
  try {
    const results = await sequelize.query(
      `SELECT id_log, mensagem, data_log
       FROM Auditoria_Valorem
       WHERE mensagem LIKE :pattern
       ORDER BY data_log DESC`,
      { 
        replacements: { pattern: `%Usuário ID: ${req.userId} |%` },
        type: Sequelize.QueryTypes.SELECT
      }
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SALDO TOTAL DO USUÁRIO
app.get('/api/transacoes/saldo', checkAuth, async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) as total_receitas,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) as total_despesas,
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) as saldo_total
      FROM Transacao
      WHERE id_usuario = ?
    `, { replacements: [req.userId] });
    res.json(results[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OBTER TRANSAÇÃO ESPECÍFICA
app.get('/api/transacoes/:id', checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const transacao = await Transacao.findByPk(id);
    if (!transacao || transacao.id_usuario !== req.userId) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }
    res.json(transacao);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRIAR TRANSAÇÃO
app.post('/api/transacoes', checkAuth, async (req, res) => {
  try {
    const { descricao, valor, data, tipo, id_categoria } = req.body;

    if (!descricao || !valor || !data || !tipo || !id_categoria) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    if (valor <= 0) {
      return res.status(400).json({ error: 'Valor não pode ser zero ou negativo' });
    }

    const transacao = await Transacao.create({
      descricao,
      valor,
      data,
      tipo,
      id_categoria,
      id_usuario: req.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.json(transacao);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// EDITAR TRANSAÇÃO
app.put('/api/transacoes/:id', checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao, valor, data, tipo, id_categoria } = req.body;

    if (valor && valor <= 0) {
      return res.status(400).json({ error: 'Valor não pode ser zero ou negativo' });
    }

    const transacao = await Transacao.findByPk(id);
    if (!transacao || transacao.id_usuario !== req.userId) {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    await Transacao.update(
      { descricao, valor, data, tipo, id_categoria, updatedAt: new Date() },
      { where: { id } }
    );

    res.json({ mensagem: 'Transação atualizada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// EXCLUIR TRANSAÇÃO
app.delete('/api/transacoes/:id', checkAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const transacao = await Transacao.findByPk(id);
    if (!transacao || transacao.id_usuario !== req.userId) {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    await sequelize.query('DELETE FROM Transacao WHERE id = ?', {
      replacements: [id]
    });
    res.json({ mensagem: 'Transação excluída com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('🚀 Servidor rodando em http://localhost:3000'));