import express from 'express';
import MyChurchMySQLService from '../lib/mysql';

const router = express.Router();

// GET /api/members
router.get('/', async (req, res) => {
  try {
    const churchId = req.query.churchId as string;
    const members = await MyChurchMySQLService.getMembers(churchId);
    res.json(members);
  } catch (error) {
    console.error('Erreur lors de la récupération des membres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
