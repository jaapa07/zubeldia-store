// Recebe a loja atualizada do painel (/#admin) e grava o index.html no GitHub.
// A Vercel publica sozinha a nova versão em cerca de 1 minuto.
const crypto = require('crypto');

function senhaCerta(enviada, certa) {
  const a = Buffer.from(String(enviada || ''));
  const b = Buffer.from(String(certa || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  const SENHA = process.env.ADMIN_SENHA;
  const TOKEN = process.env.GITHUB_TOKEN;
  const REPO = process.env.GITHUB_REPO || 'jaapa07/zubeldia-store';
  const BRANCH = process.env.GITHUB_BRANCH || 'main';
  const falta = [];
  if (!TOKEN) falta.push('GITHUB_TOKEN');
  if (!SENHA) falta.push('ADMIN_SENHA');

  // Abrir /api/publicar no navegador mostra se a configuração chegou (sem mostrar os valores).
  if (req.method === 'GET') {
    return res.status(200).json({
      GITHUB_TOKEN: TOKEN ? 'encontrado' : 'NÃO encontrado',
      ADMIN_SENHA: SENHA ? 'encontrado' : 'NÃO encontrado',
      ambiente: process.env.VERCEL_ENV || 'desconhecido',
      publicacao: process.env.VERCEL_URL || 'desconhecida',
      projeto: process.env.VERCEL_PROJECT_PRODUCTION_URL || 'desconhecido'
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ erro: 'metodo' });
  if (falta.length) return res.status(500).json({ erro: 'config', falta: falta });

  const corpo = req.body || {};
  if (!senhaCerta(corpo.senha, SENHA)) return res.status(401).json({ erro: 'senha' });
  const html = corpo.html;
  if (typeof html !== 'string' || html.length < 1000 || html.length > 4000000 || html.indexOf('id="store-data"') === -1) {
    return res.status(400).json({ erro: 'arquivo' });
  }

  const url = 'https://api.github.com/repos/' + REPO + '/contents/index.html';
  const cab = {
    Authorization: 'Bearer ' + TOKEN,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'zubeldia-store-painel',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  try {
    const atual = await fetch(url + '?ref=' + encodeURIComponent(BRANCH), { headers: cab });
    if (!atual.ok) return res.status(502).json({ erro: 'github', etapa: 'ler', status: atual.status });
    const info = await atual.json();
    const grava = await fetch(url, {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, cab),
      body: JSON.stringify({
        message: 'Atualiza a loja pelo painel',
        content: Buffer.from(html, 'utf8').toString('base64'),
        sha: info.sha,
        branch: BRANCH
      })
    });
    if (!grava.ok) return res.status(502).json({ erro: 'github', etapa: 'gravar', status: grava.status });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ erro: 'rede' });
  }
};
