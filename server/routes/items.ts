import { Router, Response } from 'express';
import { getDb } from '../db.js';
import { authenticate, AuthRequest, optionalAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Helper to determine condition grade from score
function getConditionGrade(score: number): string {
  if (score >= 9) return 'Mint';
  if (score >= 8) return 'Excellent';
  if (score >= 6) return 'Good';
  if (score >= 4) return 'Fair';
  return 'Poor';
}

// 7. Search and filter items
router.get('/', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      q,
      category_id,
      min_condition,
      status,
      min_price,
      max_price,
      owner_id,
      brand
    } = req.query;

    const db = await getDb();

    let sql = `
      SELECT 
        i.*,
        c.name as category_name,
        u_owner.full_name as current_owner_name,
        u_owner.city as current_owner_city,
        (SELECT image_url FROM item_images WHERE item_id = i.item_id ORDER BY is_primary DESC, image_id ASC LIMIT 1) as primary_image,
        (SELECT condition_score FROM condition_logs WHERE item_id = i.item_id ORDER BY assessed_at DESC, condition_id DESC LIMIT 1) as latest_condition_score,
        (SELECT condition_grade FROM condition_logs WHERE item_id = i.item_id ORDER BY assessed_at DESC, condition_id DESC LIMIT 1) as latest_condition_grade,
        (SELECT asking_price FROM listings WHERE item_id = i.item_id AND status = 'active' ORDER BY listing_id DESC LIMIT 1) as current_asking_price,
        (SELECT listing_id FROM listings WHERE item_id = i.item_id AND status = 'active' ORDER BY listing_id DESC LIMIT 1) as active_listing_id,
        (SELECT COUNT(*) FROM provenance_verifications WHERE item_id = i.item_id AND status = 'verified') as verified_count,
        (SELECT COUNT(*) FROM repairs WHERE item_id = i.item_id) as repair_count,
        (SELECT COUNT(*) FROM ownership_records WHERE item_id = i.item_id) as total_owners_recorded
      FROM items i
      JOIN categories c ON i.category_id = c.category_id
      JOIN users u_owner ON i.current_owner_id = u_owner.user_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (q && typeof q === 'string' && q.trim().length > 0) {
      const searchTerm = `%${q.trim()}%`;
      sql += ` AND (i.name LIKE ? OR i.brand LIKE ? OR i.model LIKE ? OR i.serial_number LIKE ? OR i.description LIKE ?)`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (category_id) {
      sql += ` AND (i.category_id = ? OR c.parent_category_id = ?)`;
      params.push(Number(category_id), Number(category_id));
    }

    if (status && typeof status === 'string' && status !== 'all') {
      sql += ` AND i.status = ?`;
      params.push(status);
    }

    if (owner_id) {
      sql += ` AND i.current_owner_id = ?`;
      params.push(Number(owner_id));
    }

    if (brand && typeof brand === 'string') {
      sql += ` AND i.brand = ?`;
      params.push(brand);
    }

    sql += ` ORDER BY i.created_at DESC`;

    const [rows] = await db.query<any[]>(sql, params);

    // Apply condition and price filter in memory if computed columns
    let filtered = rows;
    if (min_condition) {
      const minScore = Number(min_condition);
      filtered = filtered.filter((item) => (item.latest_condition_score ?? 0) >= minScore);
    }

    if (min_price) {
      const minP = Number(min_price);
      filtered = filtered.filter((item) => {
        const price = item.current_asking_price ?? item.purchase_price ?? 0;
        return price >= minP;
      });
    }

    if (max_price) {
      const maxP = Number(max_price);
      filtered = filtered.filter((item) => {
        const price = item.current_asking_price ?? item.purchase_price ?? 0;
        return price <= maxP;
      });
    }

    res.json({ items: filtered });
  } catch (error: any) {
    console.error('Fetch items error:', error);
    res.status(500).json({ error: 'Failed to retrieve items. ' + (error.message || '') });
  }
});

// 6. Item detail page: full lifecycle, ownership chain, repairs, condition logs
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const itemId = Number(req.params.id);
    if (isNaN(itemId)) {
      res.status(400).json({ error: 'Invalid item ID.' });
      return;
    }

    const db = await getDb();

    // 1. Core Item
    const [itemRows] = await db.query<any[]>(
      `SELECT 
        i.*,
        c.name as category_name,
        c.parent_category_id,
        pcat.name as parent_category_name,
        u_reg.full_name as registered_by_name,
        u_owner.full_name as current_owner_name,
        u_owner.email as current_owner_email,
        u_owner.city as current_owner_city
      FROM items i
      JOIN categories c ON i.category_id = c.category_id
      LEFT JOIN categories pcat ON c.parent_category_id = pcat.category_id
      JOIN users u_reg ON i.registered_by = u_reg.user_id
      JOIN users u_owner ON i.current_owner_id = u_owner.user_id
      WHERE i.item_id = ?`,
      [itemId]
    );

    if (!itemRows || itemRows.length === 0) {
      res.status(404).json({ error: 'Item not found.' });
      return;
    }

    const item = itemRows[0];

    // Parse specifications JSON if needed
    if (typeof item.specifications === 'string') {
      try {
        item.specifications = JSON.parse(item.specifications);
      } catch {
        // keep string
      }
    }

    // 2. Images
    const [images] = await db.query<any[]>(
      'SELECT image_id, image_url, is_primary, uploaded_at FROM item_images WHERE item_id = ? ORDER BY is_primary DESC, image_id ASC',
      [itemId]
    );

    // 3. Lifecycle Events (in date order)
    const [lifecycleEvents] = await db.query<any[]>(
      `SELECT 
        le.*,
        u.full_name as performed_by_name,
        u.role as performed_by_role
      FROM lifecycle_events le
      JOIN users u ON le.performed_by = u.user_id
      WHERE le.item_id = ?
      ORDER BY le.event_date DESC, le.event_id DESC`,
      [itemId]
    );

    // 4. Ownership Chain (in date order)
    const [ownershipChain] = await db.query<any[]>(
      `SELECT 
        o.ownership_id,
        o.item_id,
        o.owner_id,
        o.transfer_id,
        o.start_date,
        o.end_date,
        u.full_name as owner_name,
        u.email as owner_email,
        u.city as owner_city,
        ot.transfer_type,
        ot.transfer_date,
        ot.notes as transfer_notes,
        from_u.full_name as from_user_name
      FROM ownership_records o
      JOIN users u ON o.owner_id = u.user_id
      LEFT JOIN ownership_transfers ot ON o.transfer_id = ot.transfer_id
      LEFT JOIN users from_u ON ot.from_user_id = from_u.user_id
      WHERE o.item_id = ?
      ORDER BY o.start_date ASC, o.ownership_id ASC`,
      [itemId]
    );

    // 5. Condition Logs (in date order)
    const [conditionLogs] = await db.query<any[]>(
      `SELECT 
        cl.*,
        u.full_name as assessed_by_name
      FROM condition_logs cl
      JOIN users u ON cl.assessed_by = u.user_id
      WHERE cl.item_id = ?
      ORDER BY cl.assessed_at DESC, cl.condition_id DESC`,
      [itemId]
    );

    // 6. Repairs History
    const [repairs] = await db.query<any[]>(
      `SELECT 
        r.*,
        sp.name as provider_name,
        sp.service_type as provider_type,
        sp.city as provider_city,
        ki.title as issue_title,
        ic.cause_description,
        ic.suggested_fix
      FROM repairs r
      JOIN service_providers sp ON r.provider_id = sp.provider_id
      LEFT JOIN known_issues ki ON r.issue_id = ki.issue_id
      LEFT JOIN issue_causes ic ON r.cause_id = ic.cause_id
      WHERE r.item_id = ?
      ORDER BY r.repair_date DESC, r.repair_id DESC`,
      [itemId]
    );

    // 7. Provenance Verifications
    const [verifications] = await db.query<any[]>(
      `SELECT 
        pv.*,
        u.full_name as verified_by_name
      FROM provenance_verifications pv
      JOIN users u ON pv.verified_by = u.user_id
      WHERE pv.item_id = ?
      ORDER BY pv.verification_date DESC, pv.verification_id DESC`,
      [itemId]
    );

    // 8. Listings & Sales Transactions
    const [listings] = await db.query<any[]>(
      `SELECT 
        l.*,
        u.full_name as seller_name,
        st.transaction_id,
        st.buyer_id,
        buyer.full_name as buyer_name,
        st.sale_price,
        st.sale_date,
        st.payment_method
      FROM listings l
      JOIN users u ON l.seller_id = u.user_id
      LEFT JOIN sales_transactions st ON l.listing_id = st.listing_id
      LEFT JOIN users buyer ON st.buyer_id = buyer.user_id
      WHERE l.item_id = ?
      ORDER BY l.listing_date DESC, l.listing_id DESC`,
      [itemId]
    );

    // 9. Donations
    const [donations] = await db.query<any[]>(
      `SELECT 
        d.*,
        donor.full_name as donor_name,
        org.name as organization_name,
        org.org_type as organization_type,
        org.city as organization_city
      FROM donations d
      JOIN users donor ON d.donor_id = donor.user_id
      JOIN organizations org ON d.organization_id = org.organization_id
      WHERE d.item_id = ?
      ORDER BY d.donation_date DESC`,
      [itemId]
    );

    res.json({
      item,
      images,
      lifecycleEvents,
      ownershipChain,
      conditionLogs,
      repairs,
      verifications,
      listings,
      donations
    });
  } catch (error: any) {
    console.error('Fetch item details error:', error);
    res.status(500).json({ error: 'Failed to retrieve item details.' });
  }
});

// 2. Register an item in ONE SQL transaction:
// items, item_images, ownership_records, lifecycle_events, condition_logs
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const conn = await db.getConnection();

  try {
    const userId = req.user!.userId;
    const {
      name,
      category_id,
      brand,
      model,
      serial_number,
      description,
      color,
      manufacture_year,
      specifications,
      acquisition_type,
      purchase_date,
      purchase_price,
      warranty_expiry_date,
      battery_type,
      battery_capacity_mah,
      battery_rated_hours,
      condition_score,
      condition_notes,
      battery_health_pct,
      image_urls
    } = req.body;

    // Strict Server-Side Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Item name is required.' });
      return;
    }
    if (!category_id || isNaN(Number(category_id))) {
      res.status(400).json({ error: 'A valid category is required.' });
      return;
    }
    if (!brand || typeof brand !== 'string' || brand.trim().length === 0) {
      res.status(400).json({ error: 'Brand is required.' });
      return;
    }
    if (!model || typeof model !== 'string' || model.trim().length === 0) {
      res.status(400).json({ error: 'Model is required.' });
      return;
    }
    if (!serial_number || typeof serial_number !== 'string' || serial_number.trim().length === 0) {
      res.status(400).json({ error: 'Serial number is required.' });
      return;
    }

    const numScore = Number(condition_score);
    if (isNaN(numScore) || numScore < 1 || numScore > 10) {
      res.status(400).json({ error: 'Condition score must be an integer between 1 and 10.' });
      return;
    }

    const cleanSerial = serial_number.trim().toUpperCase();

    // Check unique serial number
    const [existingItem] = await db.query<any[]>('SELECT item_id FROM items WHERE serial_number = ?', [cleanSerial]);
    if (existingItem && existingItem.length > 0) {
      res.status(409).json({ error: `An item with serial number '${cleanSerial}' is already registered in the lifecycle ledger.` });
      return;
    }

    const specsJson = typeof specifications === 'object' ? JSON.stringify(specifications) : (specifications || null);
    const today = new Date().toISOString().slice(0, 10);
    const resolvedPurchaseDate = purchase_date || today;
    const grade = getConditionGrade(numScore);

    // ==========================================
    // START ATOMIC TRANSACTION
    // ==========================================
    await conn.beginTransaction();

    // 1. Insert into items
    const [itemRes] = await conn.query(
      `INSERT INTO items (
        category_id, registered_by, current_owner_id, name, brand, model,
        serial_number, description, color, manufacture_year, specifications,
        acquisition_type, previous_owners_count, purchased_from, purchase_date,
        purchase_price, warranty_expiry_date, battery_type, battery_capacity_mah,
        battery_rated_hours, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(category_id),
        userId,
        userId,
        name.trim(),
        brand.trim(),
        model.trim(),
        cleanSerial,
        description || null,
        color || null,
        manufacture_year ? Number(manufacture_year) : null,
        specsJson,
        acquisition_type || 'first_hand',
        0,
        null,
        resolvedPurchaseDate,
        purchase_price ? Number(purchase_price) : null,
        warranty_expiry_date || null,
        battery_type || null,
        battery_capacity_mah ? Number(battery_capacity_mah) : null,
        battery_rated_hours ? Number(battery_rated_hours) : null,
        'active'
      ]
    );

    const newItemId = itemRes.insertId;

    // 2. Insert into item_images (if provided)
    if (Array.isArray(image_urls) && image_urls.length > 0) {
      for (let i = 0; i < image_urls.length; i++) {
        const url = image_urls[i];
        if (url && typeof url === 'string') {
          await conn.query(
            'INSERT INTO item_images (item_id, image_url, is_primary) VALUES (?, ?, ?)',
            [newItemId, url.trim(), i === 0]
          );
        }
      }
    }

    // 3. Insert into lifecycle_events (Registration Event)
    const [eventRes] = await conn.query(
      `INSERT INTO lifecycle_events (item_id, performed_by, event_type, description)
       VALUES (?, ?, ?, ?)`,
      [
        newItemId,
        userId,
        'registration',
        `Item registered by initial owner ${req.user!.fullName}. Serial: ${cleanSerial}. Acquisition: ${acquisition_type || 'first_hand'}.`
      ]
    );

    const newEventId = eventRes.insertId;

    // 4. Insert into condition_logs
    await conn.query(
      `INSERT INTO condition_logs (
        item_id, event_id, assessed_by, condition_score, condition_grade,
        battery_health_pct, battery_backup_hours, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newItemId,
        newEventId,
        userId,
        numScore,
        grade,
        battery_health_pct ? Number(battery_health_pct) : null,
        battery_rated_hours ? Number(battery_rated_hours) : null,
        condition_notes || `Initial baseline condition assessment on registration: ${grade} (${numScore}/10).`
      ]
    );

    // 5. Insert into ownership_transfers (Initial acquisition transfer)
    const [transferRes] = await conn.query(
      `INSERT INTO ownership_transfers (item_id, from_user_id, to_user_id, transfer_type, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [
        newItemId,
        null,
        userId,
        'registration',
        'Initial ownership established on item registration.'
      ]
    );

    const newTransferId = transferRes.insertId;

    // 6. Insert into ownership_records (Active ownership opened)
    await conn.query(
      `INSERT INTO ownership_records (item_id, owner_id, transfer_id, start_date, end_date)
       VALUES (?, ?, ?, ?, ?)`,
      [
        newItemId,
        userId,
        newTransferId,
        resolvedPurchaseDate,
        null
      ]
    );

    // COMMIT ATOMIC TRANSACTION
    await conn.commit();

    res.status(201).json({
      message: 'Item registered successfully in one atomic transaction',
      item_id: newItemId
    });
  } catch (error: any) {
    await conn.rollback();
    console.error('Item registration transaction error:', error);
    res.status(500).json({ error: 'Transaction failed and rolled back. ' + (error.message || '') });
  } finally {
    conn.release();
  }
});

// 3a. List an item for sale
router.post('/:id/list', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const conn = await db.getConnection();

  try {
    const itemId = Number(req.params.id);
    const userId = req.user!.userId;
    const { asking_price } = req.body;

    if (!asking_price || isNaN(Number(asking_price)) || Number(asking_price) <= 0) {
      res.status(400).json({ error: 'A valid positive asking price is required.' });
      return;
    }

    // Verify ownership
    const [items] = await db.query<any[]>('SELECT item_id, current_owner_id, name, status FROM items WHERE item_id = ?', [itemId]);
    if (!items || items.length === 0) {
      res.status(404).json({ error: 'Item not found.' });
      return;
    }

    const item = items[0];
    if (item.current_owner_id !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only the current owner can list this item for sale.' });
      return;
    }

    await conn.beginTransaction();

    const today = new Date().toISOString().slice(0, 10);

    // Insert into listings
    const [listingRes] = await conn.query(
      `INSERT INTO listings (item_id, seller_id, asking_price, listing_date, status)
       VALUES (?, ?, ?, ?, ?)`,
      [itemId, userId, Number(asking_price), today, 'active']
    );

    // Update item status
    await conn.query(`UPDATE items SET status = 'listed' WHERE item_id = ?`, [itemId]);

    // Insert lifecycle event
    await conn.query(
      `INSERT INTO lifecycle_events (item_id, performed_by, event_type, description)
       VALUES (?, ?, ?, ?)`,
      [
        itemId,
        userId,
        'listing',
        `Item listed for sale at $${Number(asking_price).toFixed(2)} by ${req.user!.fullName}.`
      ]
    );

    await conn.commit();

    res.json({
      message: 'Item successfully listed for sale',
      listing_id: listingRes.insertId
    });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ error: 'Failed to list item for sale. ' + (error.message || '') });
  } finally {
    conn.release();
  }
});

// 3b. Record a sale in ONE transaction:
// sales_transactions, ownership_transfers, close old ownership_records row (set end_date),
// open new one, add lifecycle event and condition log, update item owner & status.
router.post('/:id/sell', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const conn = await db.getConnection();

  try {
    const itemId = Number(req.params.id);
    const sellerId = req.user!.userId;
    const {
      buyer_id,
      sale_price,
      payment_method,
      condition_score,
      condition_notes,
      listing_id
    } = req.body;

    if (!buyer_id || isNaN(Number(buyer_id))) {
      res.status(400).json({ error: 'Buyer selection is required.' });
      return;
    }
    if (Number(buyer_id) === sellerId) {
      res.status(400).json({ error: 'Buyer cannot be the same as the current seller.' });
      return;
    }
    if (!sale_price || isNaN(Number(sale_price)) || Number(sale_price) <= 0) {
      res.status(400).json({ error: 'A valid positive sale price is required.' });
      return;
    }

    // Verify item and current owner
    const [items] = await db.query<any[]>('SELECT item_id, current_owner_id, name, previous_owners_count FROM items WHERE item_id = ?', [itemId]);
    if (!items || items.length === 0) {
      res.status(404).json({ error: 'Item not found.' });
      return;
    }

    const item = items[0];
    if (item.current_owner_id !== sellerId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only the current owner or admin can record a sale for this item.' });
      return;
    }

    // Check buyer exists
    const [buyerRows] = await db.query<any[]>('SELECT user_id, full_name, email FROM users WHERE user_id = ?', [Number(buyer_id)]);
    if (!buyerRows || buyerRows.length === 0) {
      res.status(404).json({ error: 'Buyer user record not found.' });
      return;
    }
    const buyer = buyerRows[0];

    const today = new Date().toISOString().slice(0, 10);
    const score = Number(condition_score) || 8;
    const grade = getConditionGrade(score);

    // ==========================================
    // START ATOMIC SALE TRANSACTION
    // ==========================================
    await conn.beginTransaction();

    // 1. Resolve or create listing if not provided
    let activeListingId = listing_id ? Number(listing_id) : null;
    if (!activeListingId) {
      const [existingListings] = await conn.query<any[]>(
        'SELECT listing_id FROM listings WHERE item_id = ? AND status = ? ORDER BY listing_id DESC LIMIT 1',
        [itemId, 'active']
      );
      if (existingListings && existingListings.length > 0) {
        activeListingId = existingListings[0].listing_id;
      } else {
        const [newListRes] = await conn.query(
          `INSERT INTO listings (item_id, seller_id, asking_price, listing_date, status)
           VALUES (?, ?, ?, ?, ?)`,
          [itemId, sellerId, Number(sale_price), today, 'active']
        );
        activeListingId = newListRes.insertId;
      }
    }

    // 2. Insert into ownership_transfers
    const [transferRes] = await conn.query(
      `INSERT INTO ownership_transfers (item_id, from_user_id, to_user_id, transfer_type, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [
        itemId,
        sellerId,
        buyer.user_id,
        'sale',
        `Ownership transferred via verified sale from ${req.user!.fullName} to ${buyer.full_name}. Price: $${Number(sale_price).toFixed(2)}.`
      ]
    );
    const newTransferId = transferRes.insertId;

    // 3. Insert into sales_transactions
    const [transRes] = await conn.query(
      `INSERT INTO sales_transactions (listing_id, buyer_id, transfer_id, sale_price, sale_date, payment_method)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        activeListingId,
        buyer.user_id,
        newTransferId,
        Number(sale_price),
        today,
        payment_method || 'Bank Transfer / Escrow'
      ]
    );

    // 4. Close the old ownership_records row (set end_date)
    await conn.query(
      `UPDATE ownership_records 
       SET end_date = ? 
       WHERE item_id = ? AND owner_id = ? AND end_date IS NULL`,
      [today, itemId, sellerId]
    );

    // 5. Open new ownership_records row
    await conn.query(
      `INSERT INTO ownership_records (item_id, owner_id, transfer_id, start_date, end_date)
       VALUES (?, ?, ?, ?, ?)`,
      [itemId, buyer.user_id, newTransferId, today, null]
    );

    // 6. Close listing
    await conn.query(
      `UPDATE listings SET status = 'sold', closed_date = ? WHERE listing_id = ?`,
      [today, activeListingId]
    );

    // 7. Add lifecycle event
    const [eventRes] = await conn.query(
      `INSERT INTO lifecycle_events (item_id, performed_by, event_type, description)
       VALUES (?, ?, ?, ?)`,
      [
        itemId,
        sellerId,
        'sale',
        `Sold to ${buyer.full_name} for $${Number(sale_price).toFixed(2)}. Ownership transferred in verified transaction #${transRes.insertId}.`
      ]
    );
    const newEventId = eventRes.insertId;

    // 8. Add condition log upon transfer
    await conn.query(
      `INSERT INTO condition_logs (
        item_id, event_id, assessed_by, condition_score, condition_grade, notes
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        itemId,
        newEventId,
        buyer.user_id,
        score,
        grade,
        condition_notes || `Post-sale receipt inspection by new owner ${buyer.full_name}. Verified condition: ${grade} (${score}/10).`
      ]
    );

    // 9. Update items row: new current_owner_id, previous_owners_count + 1, status = 'active'
    await conn.query(
      `UPDATE items 
       SET current_owner_id = ?, 
           previous_owners_count = previous_owners_count + 1,
           status = 'active'
       WHERE item_id = ?`,
      [buyer.user_id, itemId]
    );

    // COMMIT ATOMIC TRANSACTION
    await conn.commit();

    res.json({
      message: 'Sale successfully completed and ownership transferred in one atomic transaction',
      transfer_id: newTransferId,
      transaction_id: transRes.insertId,
      new_owner: buyer.full_name
    });
  } catch (error: any) {
    await conn.rollback();
    console.error('Sale transaction error:', error);
    res.status(500).json({ error: 'Sale transaction failed and was rolled back. ' + (error.message || '') });
  } finally {
    conn.release();
  }
});

// 4. Log repairs with provider, cost, condition before/after, and suggest known issues and causes
router.post('/:id/repair', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const conn = await db.getConnection();

  try {
    const itemId = Number(req.params.id);
    const userId = req.user!.userId;
    const {
      provider_id,
      repair_date,
      description,
      cost,
      condition_before,
      condition_after,
      issue_id,
      cause_id,
      notes
    } = req.body;

    if (!provider_id || isNaN(Number(provider_id))) {
      res.status(400).json({ error: 'Service provider is required.' });
      return;
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      res.status(400).json({ error: 'Repair description is required.' });
      return;
    }

    const condBefore = Number(condition_before);
    const condAfter = Number(condition_after);
    if (isNaN(condBefore) || isNaN(condAfter)) {
      res.status(400).json({ error: 'Condition before and condition after must be valid numbers (1-10).' });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const resolvedDate = repair_date || today;

    // Verify item
    const [items] = await db.query<any[]>('SELECT item_id, current_owner_id, name FROM items WHERE item_id = ?', [itemId]);
    if (!items || items.length === 0) {
      res.status(404).json({ error: 'Item not found.' });
      return;
    }

    const item = items[0];
    if (item.current_owner_id !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only the current owner or admin can log a repair for this item.' });
      return;
    }

    // Get provider details
    const [providerRows] = await db.query<any[]>('SELECT provider_id, name FROM service_providers WHERE provider_id = ?', [Number(provider_id)]);
    const providerName = providerRows && providerRows.length > 0 ? providerRows[0].name : 'Service Provider';

    await conn.beginTransaction();

    // 1. Insert into lifecycle_events
    const [eventRes] = await conn.query(
      `INSERT INTO lifecycle_events (item_id, performed_by, event_type, description)
       VALUES (?, ?, ?, ?)`,
      [
        itemId,
        userId,
        'repair',
        `Maintenance/Repair serviced at ${providerName}. Cost: $${Number(cost || 0).toFixed(2)}. ${description.trim()}`
      ]
    );
    const newEventId = eventRes.insertId;

    // 2. Insert into repairs table
    const [repairRes] = await conn.query(
      `INSERT INTO repairs (
        item_id, provider_id, event_id, issue_id, cause_id,
        repair_date, description, cost, condition_before, condition_after
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemId,
        Number(provider_id),
        newEventId,
        issue_id ? Number(issue_id) : null,
        cause_id ? Number(cause_id) : null,
        resolvedDate,
        description.trim(),
        Number(cost || 0),
        condBefore,
        condAfter
      ]
    );

    // 3. Insert condition log documenting improvement
    const afterGrade = getConditionGrade(condAfter);
    await conn.query(
      `INSERT INTO condition_logs (
        item_id, event_id, assessed_by, condition_score, condition_grade, notes
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        itemId,
        newEventId,
        userId,
        condAfter,
        afterGrade,
        notes || `Post-repair inspection: condition improved from ${condBefore}/10 to ${condAfter}/10 (${afterGrade}) following service by ${providerName}.`
      ]
    );

    await conn.commit();

    res.json({
      message: 'Repair logged successfully in one atomic transaction',
      repair_id: repairRes.insertId,
      event_id: newEventId
    });
  } catch (error: any) {
    await conn.rollback();
    console.error('Repair logging error:', error);
    res.status(500).json({ error: 'Repair logging failed and was rolled back. ' + (error.message || '') });
  } finally {
    conn.release();
  }
});

// 5a. Record donation in ONE transaction
router.post('/:id/donate', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const conn = await db.getConnection();

  try {
    const itemId = Number(req.params.id);
    const donorId = req.user!.userId;
    const { organization_id, donation_date, notes } = req.body;

    if (!organization_id || isNaN(Number(organization_id))) {
      res.status(400).json({ error: 'Recipient organization is required.' });
      return;
    }

    // Verify item and ownership
    const [items] = await db.query<any[]>('SELECT item_id, current_owner_id, name FROM items WHERE item_id = ?', [itemId]);
    if (!items || items.length === 0) {
      res.status(404).json({ error: 'Item not found.' });
      return;
    }

    const item = items[0];
    if (item.current_owner_id !== donorId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only the current owner or admin can record a donation for this item.' });
      return;
    }

    // Get organization details
    const [orgs] = await db.query<any[]>('SELECT organization_id, user_id, name FROM organizations WHERE organization_id = ?', [Number(organization_id)]);
    if (!orgs || orgs.length === 0) {
      res.status(404).json({ error: 'Organization not found.' });
      return;
    }
    const org = orgs[0];

    const today = new Date().toISOString().slice(0, 10);
    const resolvedDate = donation_date || today;

    await conn.beginTransaction();

    // 1. Insert ownership_transfers
    const [transferRes] = await conn.query(
      `INSERT INTO ownership_transfers (item_id, from_user_id, to_user_id, transfer_type, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [
        itemId,
        donorId,
        org.user_id,
        'donation',
        `Donated by ${req.user!.fullName} to non-profit organization ${org.name}.`
      ]
    );
    const newTransferId = transferRes.insertId;

    // 2. Insert into donations table
    const [donRes] = await conn.query(
      `INSERT INTO donations (item_id, donor_id, organization_id, transfer_id, donation_date, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        itemId,
        donorId,
        org.organization_id,
        newTransferId,
        resolvedDate,
        notes || `Charitable contribution to ${org.name}.`
      ]
    );

    // 3. Close old ownership_records row
    await conn.query(
      `UPDATE ownership_records 
       SET end_date = ? 
       WHERE item_id = ? AND owner_id = ? AND end_date IS NULL`,
      [resolvedDate, itemId, donorId]
    );

    // 4. Open new ownership_records row for org
    await conn.query(
      `INSERT INTO ownership_records (item_id, owner_id, transfer_id, start_date, end_date)
       VALUES (?, ?, ?, ?, ?)`,
      [itemId, org.user_id, newTransferId, resolvedDate, null]
    );

    // 5. Insert lifecycle event
    await conn.query(
      `INSERT INTO lifecycle_events (item_id, performed_by, event_type, description)
       VALUES (?, ?, ?, ?)`,
      [
        itemId,
        donorId,
        'donation',
        `Donated to ${org.name} (${org.org_type || 'Charity'}). Donation record #${donRes.insertId}.`
      ]
    );

    // 6. Update item row
    await conn.query(
      `UPDATE items 
       SET current_owner_id = ?, 
           previous_owners_count = previous_owners_count + 1,
           status = 'donated'
       WHERE item_id = ?`,
      [org.user_id, itemId]
    );

    await conn.commit();

    res.json({
      message: 'Donation recorded successfully and ownership transferred',
      donation_id: donRes.insertId,
      organization: org.name
    });
  } catch (error: any) {
    await conn.rollback();
    console.error('Donation transaction error:', error);
    res.status(500).json({ error: 'Donation transaction failed and was rolled back. ' + (error.message || '') });
  } finally {
    conn.release();
  }
});

// 5b. Record provenance verification (Admin or Authorized users)
router.post('/:id/verify-provenance', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const conn = await db.getConnection();

  try {
    const itemId = Number(req.params.id);
    const userId = req.user!.userId;
    const { method, notes, status } = req.body;

    if (!method || typeof method !== 'string') {
      res.status(400).json({ error: 'Verification method is required (e.g. Serial Check, OEM Database, Receipt).' });
      return;
    }

    const verificationStatus = status === 'rejected' ? 'rejected' : 'verified';
    const today = new Date().toISOString().slice(0, 10);

    await conn.beginTransaction();

    // 1. Insert provenance_verifications
    const [verifRes] = await conn.query(
      `INSERT INTO provenance_verifications (item_id, verified_by, verification_date, method, status, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        itemId,
        userId,
        today,
        method.trim(),
        verificationStatus,
        notes || `Provenance verified using ${method.trim()} by inspector ${req.user!.fullName}.`
      ]
    );

    // 2. Insert lifecycle event
    await conn.query(
      `INSERT INTO lifecycle_events (item_id, performed_by, event_type, description)
       VALUES (?, ?, ?, ?)`,
      [
        itemId,
        userId,
        'provenance_check',
        `Official provenance inspection: ${verificationStatus.toUpperCase()} via ${method.trim()}. Verified by ${req.user!.fullName}.`
      ]
    );

    await conn.commit();

    res.json({
      message: 'Provenance verification successfully recorded in lifecycle history',
      verification_id: verifRes.insertId
    });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ error: 'Provenance verification failed. ' + (error.message || '') });
  } finally {
    conn.release();
  }
});

// Log a condition check event
router.post('/:id/log-condition', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const conn = await db.getConnection();

  try {
    const itemId = Number(req.params.id);
    const userId = req.user!.userId;
    const { condition_score, battery_health_pct, battery_backup_hours, notes } = req.body;

    const score = Number(condition_score);
    if (isNaN(score) || score < 1 || score > 10) {
      res.status(400).json({ error: 'Condition score must be between 1 and 10.' });
      return;
    }

    const grade = getConditionGrade(score);

    await conn.beginTransaction();

    // 1. Lifecycle event
    const [eventRes] = await conn.query(
      `INSERT INTO lifecycle_events (item_id, performed_by, event_type, description)
       VALUES (?, ?, ?, ?)`,
      [
        itemId,
        userId,
        'condition_check',
        `Periodic condition inspection logged by ${req.user!.fullName}. Grade: ${grade} (${score}/10).`
      ]
    );

    // 2. Condition log
    const [condRes] = await conn.query(
      `INSERT INTO condition_logs (
        item_id, event_id, assessed_by, condition_score, condition_grade,
        battery_health_pct, battery_backup_hours, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemId,
        eventRes.insertId,
        userId,
        score,
        grade,
        battery_health_pct ? Number(battery_health_pct) : null,
        battery_backup_hours ? Number(battery_backup_hours) : null,
        notes || `Condition check: ${grade} (${score}/10).`
      ]
    );

    await conn.commit();

    res.json({
      message: 'Condition log recorded successfully',
      condition_id: condRes.insertId
    });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ error: 'Failed to record condition log.' });
  } finally {
    conn.release();
  }
});

export default router;
