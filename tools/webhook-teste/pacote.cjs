const fs = require('node:fs');
const path = require('node:path');
const raiz = path.resolve(__dirname, '../..');
const arquivos = ['lib/checkout.js', 'lib/ambiente.js', 'lib/hospedagem.js', 'lib/frete.js', 'lib/webhook.js', 'lib/cep.js', 'js/enderecos.js', 'produtos.js', 'js/embalagens.js', 'config/frete.json', 'tools/webhook-teste/handler.cjs', 'tools/webhook-teste/conexao.cjs'];
arquivos.push('lib/persistencia.js');
const files = arquivos.map(file => ({ file, data: fs.readFileSync(path.join(raiz, file), 'utf8'), encoding: 'utf-8' }));
files.push({ file: 'api/mercado-pago-webhook.js', data: "require('../tools/webhook-teste/conexao.cjs')();\nmodule.exports = require('../tools/webhook-teste/handler.cjs')(require('../lib/checkout'));\n", encoding: 'utf-8' });
files.push({ file: 'vercel.json', data: fs.readFileSync(path.join(__dirname, 'vercel.json'), 'utf8'), encoding: 'utf-8' });
// Lista explícita; nunca incluir .env, imagens, painel ou outras rotas do site.
module.exports = files;
if (require.main === module) process.stdout.write(JSON.stringify(files));
