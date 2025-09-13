// Next.js API route for auth status
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // For now, return a simple auth status
  // This can be expanded to check actual authentication
  res.status(200).json({ 
    isAuthenticated: true,
    user: null 
  });
}