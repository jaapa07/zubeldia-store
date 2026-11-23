module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || '');
  if (!/^[\w-]{20,}$/.test(id)) return res.status(400).send('id inválido');
  const fontes = [
    'https://drive.usercontent.google.com/download?id=' + id + '&export=view',
    'https://drive.google.com/uc?export=download&id=' + id,
    'https://lh3.googleusercontent.com/d/' + id + '=w900'
  ];
  for (const url of fontes) {
    try {
      const r = await fetch(url, { redirect: 'follow' });
      const tipo = r.headers.get('content-type') || '';
      if (r.ok && tipo.startsWith('image/')) {
        res.setHeader('Content-Type', tipo);
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, immutable');
        return res.status(200).send(Buffer.from(await r.arrayBuffer()));
      }
    } catch (e) {}
  }
  res.status(404).send('imagem não encontrada');
};
