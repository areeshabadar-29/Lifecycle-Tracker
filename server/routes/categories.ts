import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/', async (_req, res): Promise<void> => {
  try {
    const db = await getDb();
    const result = await db.request().query(`
      SELECT category_id, name, parent_category_id 
      FROM dbo.categories 
      ORDER BY CASE WHEN parent_category_id IS NULL THEN 0 ELSE 1 END, name ASC
    `);

    const categories = result.recordset;

    // Build hierarchy tree
    const categoryMap = new Map<number, any>();
    const tree: any[] = [];

    categories.forEach((cat) => {
      categoryMap.set(cat.category_id, { ...cat, subcategories: [] });
    });

    categories.forEach((cat) => {
      if (cat.parent_category_id && categoryMap.has(cat.parent_category_id)) {
        categoryMap.get(cat.parent_category_id).subcategories.push(categoryMap.get(cat.category_id));
      } else if (!cat.parent_category_id) {
        tree.push(categoryMap.get(cat.category_id));
      }
    });

    res.json({
      categories,
      tree
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

export default router;
