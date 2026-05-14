const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(cors());
app.use(express.json());

const sequelize = new Sequelize({ dialect: 'sqlite', storage: './transacoes.sqlite' });

const Despesa = sequelize.define('Transacao', {
  descricao: { type: DataTypes.STRING, allowNull: false },
  valor: { 
    type: DataTypes.DOUBLE, 
    allowNull: false,
    validate: { min: 0.01 } // Prevents zero or negative values
  },
  data: { type: DataTypes.DATEONLY },
  tipo: { type: DataTypes.ENUM('despesa', 'receita'), allowNull: false, defaultValue: 'despesa' }
});

sequelize.sync().then(async () => {
  // Create logging table for auditing
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS Auditoria_Valorem (
        id_log INTEGER PRIMARY KEY AUTOINCREMENT,
        mensagem TEXT,
        data_log DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create View
  await sequelize.query(`DROP VIEW IF EXISTS vw_extrato_detalhado;`);
  await sequelize.query(`
    CREATE VIEW vw_extrato_detalhado AS
    SELECT 
        id,
        strftime('%d/%m/%Y', data) AS data_formatada,
        descricao,
        tipo,
        CASE 
            WHEN tipo = 'despesa' THEN valor * -1 
            ELSE valor 
        END AS valor_contabil,
        data,
        valor
    FROM Transacaos;
  `);

  // Create Trigger
  await sequelize.query(`DROP TRIGGER IF EXISTS trg_alerta_despesa_alta;`);
  await sequelize.query(`
    CREATE TRIGGER trg_alerta_despesa_alta
    AFTER INSERT ON Transacaos
    FOR EACH ROW
    WHEN NEW.tipo = 'despesa' AND NEW.valor > 1000.00
    BEGIN
        INSERT INTO Auditoria_Valorem (mensagem)
        VALUES ('ALERTA: Despesa de alto valor registrada. ID: ' || NEW.id || ' - Valor: R$ ' || NEW.valor);
    END;
  `);
});

// LISTAR usando a View vw_extrato_detalhado
app.get('/api/transacoes', async (req, res) => {
  const [results] = await sequelize.query('SELECT * FROM vw_extrato_detalhado');
  res.json(results);
});

// SALDO TOTAL (Subquery logic)
app.get('/api/transacoes/saldo', async (req, res) => {
  const [results] = await sequelize.query(`
    SELECT 
        SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) - 
        SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) AS saldo_total
    FROM Transacaos
  `);
  res.json(results[0]);
});

// CADASTRAR
app.post('/api/transacoes', async (req, res) => {
  try {
    if (req.body.valor <= 0) return res.status(400).json({ error: 'Valor não pode ser zero ou negativo.' });
    res.json(await Despesa.create(req.body));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// EDITAR (NOVO)
app.put('/api/transacoes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (req.body.valor <= 0) return res.status(400).json({ error: 'Valor não pode ser zero ou negativo.' });
    await Despesa.update(req.body, { where: { id } });
    res.json({ mensagem: "Atualizado com sucesso" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// EXCLUIR (NOVO)
app.delete('/api/transacoes/:id', async (req, res) => {
  await Despesa.destroy({ where: { id: req.params.id } });
  res.json({ mensagem: "Excluído com sucesso" });
});

app.listen(3000, () => console.log('Servidor rodando em http://localhost:3000'));