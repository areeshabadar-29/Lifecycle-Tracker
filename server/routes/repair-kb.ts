import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

// Get service providers
router.get('/providers', async (_req, res): Promise<void> => {
  try {
    const db = await getDb();
    const [rows] = await db.query<any[]>(
      'SELECT provider_id, name, service_type, phone, address, city FROM service_providers ORDER BY name ASC'
    );
    res.json({ providers: rows });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch service providers.' });
  }
});

// Get known issues (optionally filtered by category_id)
router.get('/issues', async (req, res): Promise<void> => {
  try {
    const { category_id } = req.query;
    const db = await getDb();

    let sql = `
      SELECT 
        ki.issue_id, ki.category_id, ki.title, ki.symptoms, ki.severity,
        c.name as category_name
      FROM known_issues ki
      JOIN categories c ON ki.category_id = c.category_id
    `;
    const params: any[] = [];

    if (category_id) {
      sql += ' WHERE ki.category_id = ? OR c.parent_category_id = ?';
      params.push(Number(category_id), Number(category_id));
    }

    sql += ' ORDER BY ki.title ASC';

    const [issues] = await db.query<any[]>(sql, params);

    // Fetch causes for these issues
    const [causes] = await db.query<any[]>(
      'SELECT cause_id, issue_id, cause_description, suggested_fix, difficulty, estimated_cost, needs_professional FROM issue_causes ORDER BY estimated_cost ASC'
    );

    const issuesWithCauses = issues.map((issue) => {
      return {
        ...issue,
        causes: causes.filter((c) => c.issue_id === issue.issue_id)
      };
    });

    res.json({ issues: issuesWithCauses });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch known issues knowledge base.' });
  }
});

// Get organizations for donations
router.get('/organizations', async (_req, res): Promise<void> => {
  try {
    const db = await getDb();
    const [rows] = await db.query<any[]>(
      'SELECT organization_id, user_id, name, org_type, registration_no, contact, city FROM organizations ORDER BY name ASC'
    );
    res.json({ organizations: rows });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch organizations.' });
  }
});

export default router;
