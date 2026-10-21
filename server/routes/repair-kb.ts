import { Router } from 'express';
import { getDb, sql } from '../db.js';

const router = Router();

// Get service providers
router.get('/providers', async (_req, res): Promise<void> => {
  try {
    const db = await getDb();
    const result = await db.request().query(`
      SELECT provider_id, name, service_type, phone, address, city 
      FROM dbo.service_providers 
      ORDER BY name ASC
    `);
    res.json({ providers: result.recordset });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch service providers.' });
  }
});

// Get known issues (optionally filtered by category_id using named parameter @category_id)
router.get('/issues', async (req, res): Promise<void> => {
  try {
    const { category_id } = req.query;
    const db = await getDb();
    const request = db.request();

    let sqlText = `
      SELECT 
        ki.issue_id, ki.category_id, ki.title, ki.symptoms, ki.severity,
        c.name as category_name
      FROM dbo.known_issues ki
      JOIN dbo.categories c ON ki.category_id = c.category_id
    `;

    if (category_id) {
      sqlText += ' WHERE ki.category_id = @category_id OR c.parent_category_id = @category_id';
      request.input('category_id', sql.Int, Number(category_id));
    }

    sqlText += ' ORDER BY ki.title ASC';

    const issuesRes = await request.query(sqlText);

    // Fetch causes for issues
    const causesRes = await db.request().query(`
      SELECT cause_id, issue_id, cause_description, suggested_fix, difficulty, estimated_cost, needs_professional 
      FROM dbo.issue_causes 
      ORDER BY estimated_cost ASC
    `);

    const causes = causesRes.recordset;
    const issuesWithCauses = issuesRes.recordset.map((issue) => {
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
    const result = await db.request().query(`
      SELECT organization_id, user_id, name, org_type, registration_no, contact, city 
      FROM dbo.organizations 
      ORDER BY name ASC
    `);
    res.json({ organizations: result.recordset });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch organizations.' });
  }
});

export default router;
