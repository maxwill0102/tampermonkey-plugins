import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { username, password } = req.body;
  const filePath = path.resolve('./data/users.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const user = data.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  res.status(200).json({ token: user.token });
}
