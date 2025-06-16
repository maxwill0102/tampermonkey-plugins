import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body;
  const filePath = path.resolve('./data/users.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const users = JSON.parse(fileContent).users;

  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  res.json({ token: user.token });
}
