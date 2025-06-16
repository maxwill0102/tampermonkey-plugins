import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const filePath = path.resolve('./data/users.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const users = JSON.parse(fileContent).users;

  const user = users.find(u => u.token === token);
  if (!user) return res.status(403).json({ error: 'Invalid token' });

  // 判断是否过期
  const expired = new Date(user.expires) < new Date();
  if (expired) return res.status(403).json({ error: 'Token expired' });

  res.json({
    username: user.username,
    roles: user.roles,
    expires: user.expires
  });
}
