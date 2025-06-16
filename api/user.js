import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  const filePath = path.resolve('./data/users.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const user = data.find(u => u.token === token);
  if (!user) return res.status(403).json({ error: 'Unauthorized' });

  res.status(200).json({ username: user.username, modules: user.modules });
}
