import { Router, Response } from 'express';
import { getDb, sql } from '../db.js';
import { authenticate, AuthRequest, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Helper to determine condition grade from score
function getConditionGrade(score: number): string {
  if (score >= 9) return 'Mint';
  if (score >= 8) return 'Excellent';
  if (score >= 6) return 'Good';
  if (score >= 4) return 'Fair';
  return 'Poor';
}

// 7. Search and filter items using T-SQL TOP 1 subqueries and named @parameters
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
    const request = db.request();

    let sqlText = `
      SELECT 
        i.*,
        c.name as category_name,
        u_owner.full_name as current_owner_name,
        u_owner.city as current_owner_city,
        (SELECT TOP 1 image_url FROM dbo.item_images WHERE item_id = i.item_id ORDER BY is_primary DESC, image_id ASC) as primary_image,
        (SELECT TOP 1 condition_score FROM dbo.condition_logs WHERE item_id = i.item_id ORDER BY assessed_at DESC, condition_id DESC) as latest_condition_score,
        (SELECT TOP 1 condition_grade FROM dbo.condition_logs WHERE item_id = i.item_id ORDER BY assessed_at DESC, condition_id DESC) as latest_condition_grade,
        (SELECT TOP 1 asking_price FROM dbo.listings WHERE item_id = i.item_id AND status = 'active' ORDER BY listing_id DESC) as current_asking_price,
        (SELECT TOP 1 listing_id FROM dbo.listings WHERE item_id = i.item_id AND status = 'active' ORDER BY listing_id DESC) as active_listing_id,
        (SELECT COUNT(*) FROM dbo.provenance_verifications WHERE item_id = i.item_id AND status = 'verified') as verified_count,
        (SELECT COUNT(*) FROM dbo.repairs WHERE item_id = i.item_id) as repair_count,
        (SELECT COUNT(*) FROM dbo.ownership_records WHERE item_id = i.item_id) as total_owners_recorded
      FROM dbo.items i
      JOIN dbo.categories c ON i.category_id = c.category_id
      JOIN dbo.users u_owner ON i.current_owner_id = u_owner.user_id
      WHERE 1=1
    `;

    if (q && typeof q === 'string' && q.trim().length > 0) {
      const searchTerm = `%${q.trim()}%`;
      sqlText += ` AND (i.name LIKE @searchTerm OR i.brand LIKE @searchTerm OR i.model LIKE @searchTerm OR i.serial_number LIKE @searchTerm OR i.description LIKE @searchTerm)`;
      request.input('searchTerm', sql.NVarChar(200), searchTerm);
    }

    if (category_id) {
      sqlText += ` AND (i.category_id = @category_id OR c.parent_category_id = @category_id)`;
      request.input('category_id', sql.Int, Number(category_id));
    }

    if (status && typeof status === 'string' && status !== 'all') {
      sqlText += ` AND i.status = @status`;
      request.input('status', sql.NVarChar(20), status);
    }

    if (owner_id) {
      sqlText += ` AND i.current_owner_id = @owner_id`;
      request.input('owner_id', sql.Int, Number(owner_id));
    }

    if (brand && typeof brand === 'string') {
      sqlText += ` AND i.brand = @brand`;
      request.input('brand', sql.NVarChar(60), brand);
    }

    sqlText += ` ORDER BY i.created_at DESC`;

    const result = await request.query(sqlText);
    let filtered = result.recordset;

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
    const itemRes = await db.request()
      .input('item_id', sql.Int, itemId)
      .query(`
        SELECT TOP 1
          i.*,
          c.name as category_name,
          c.parent_category_id,
          pcat.name as parent_category_name,
          u_reg.full_name as registered_by_name,
          u_owner.full_name as current_owner_name,
          u_owner.email as current_owner_email,
          u_owner.city as current_owner_city
        FROM dbo.items i
        JOIN dbo.categories c ON i.category_id = c.category_id
        LEFT JOIN dbo.categories pcat ON c.parent_category_id = pcat.category_id
        JOIN dbo.users u_reg ON i.registered_by = u_reg.user_id
        JOIN dbo.users u_owner ON i.current_owner_id = u_owner.user_id
        WHERE i.item_id = @item_id
      `);

    if (!itemRes.recordset || itemRes.recordset.length === 0) {
      res.status(404).json({ error: 'Item not found.' });
      return;
    }

    const item = itemRes.recordset[0];

    if (typeof item.specifications === 'string') {
      try {
        item.specifications = JSON.parse(item.specifications);
      } catch {
        // keep string
      }
    }

    // 2. Images
    const imagesRes = await db.request()
      .input('item_id', sql.Int, itemId)
      .query(`
        SELECT image_id, item_id, image_url, is_primary, uploaded_at 
        FROM dbo.item_images 
        WHERE item_id = @item_id 
        ORDER BY is_primary DESC, image_id ASC
      `);

    // 3. Lifecycle Events (in date order)
    const lifecycleRes = await db.request()
      .input('item_id', sql.Int, itemId)
      .query(`
        SELECT 
          le.*,
          u.full_name as performed_by_name,
          u.role as performed_by_role
        FROM dbo.lifecycle_events le
        JOIN dbo.users u ON le.performed_by = u.user_id
        WHERE le.item_id = @item_id
        ORDER BY le.event_date DESC, le.event_id DESC
      `);

    // 4. Ownership Chain (in date order)
    const ownershipRes = await db.request()
      .input('item_id', sql.Int, itemId)
      .query(`
        SELECT 
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
        FROM dbo.ownership_records o
        JOIN dbo.users u ON o.owner_id = u.user_id
        LEFT JOIN dbo.ownership_transfers ot ON o.transfer_id = ot.transfer_id
        LEFT JOIN dbo.users from_u ON ot.from_user_id = from_u.user_id
        WHERE o.item_id = @item_id
        ORDER BY o.start_date ASC, o.ownership_id ASC
      `);

    // 5. Condition Logs (in date order)
    const conditionRes = await db.request()
      .input('item_id', sql.Int, itemId)
      .query(`
        SELECT 
          cl.*,
          u.full_name as assessed_by_name
        FROM dbo.condition_logs cl
        JOIN dbo.users u ON cl.assessed_by = u.user_id
        WHERE cl.item_id = @item_id
        ORDER BY cl.assessed_at DESC, cl.condition_id DESC
      `);

    // 6. Repairs History
    const repairsRes = await db.request()
      .input('item_id', sql.Int, itemId)
      .query(`
        SELECT 
          r.*,
          sp.name as provider_name,
          sp.service_type as provider_type,
          sp.city as provider_city,
          ki.title as issue_title,
          ic.cause_description,
          ic.suggested_fix
        FROM dbo.repairs r
        JOIN dbo.service_providers sp ON r.provider_id = sp.provider_id
        LEFT JOIN dbo.known_issues ki ON r.issue_id = ki.issue_id
        LEFT JOIN dbo.issue_causes ic ON r.cause_id = ic.cause_id
        WHERE r.item_id = @item_id
        ORDER BY r.repair_date DESC, r.repair_id DESC
      `);

    // 7. Provenance Verifications
    const verifRes = await db.request()
      .input('item_id', sql.Int, itemId)
      .query(`
        SELECT 
          pv.*,
          u.full_name as verified_by_name
        FROM dbo.provenance_verifications pv
        JOIN dbo.users u ON pv.verified_by = u.user_id
        WHERE pv.item_id = @item_id
        ORDER BY pv.verification_date DESC, pv.verification_id DESC
      `);

    // 8. Listings & Sales Transactions
    const listingsRes = await db.request()
      .input('item_id', sql.Int, itemId)
      .query(`
        SELECT 
          l.*,
          u.full_name as seller_name,
          st.transaction_id,
          st.buyer_id,
          buyer.full_name as buyer_name,
          st.sale_price,
          st.sale_date,
          st.payment_method
        FROM dbo.listings l
        JOIN dbo.users u ON l.seller_id = u.user_id
        LEFT JOIN dbo.sales_transactions st ON l.listing_id = st.listing_id
        LEFT JOIN dbo.users buyer ON st.buyer_id = buyer.user_id
        WHERE l.item_id = @item_id
        ORDER BY l.listing_date DESC, l.listing_id DESC
      `);

    // 9. Donations
    const donationsRes = await db.request()
      .input('item_id', sql.Int, itemId)
      .query(`
        SELECT 
          d.*,
          donor.full_name as donor_name,
          org.name as organization_name,
          org.org_type as organization_type,
          org.city as organization_city
        FROM dbo.donations d
        JOIN dbo.users donor ON d.donor_id = donor.user_id
        JOIN dbo.organizations org ON d.organization_id = org.organization_id
        WHERE d.item_id = @item_id
        ORDER BY d.donation_date DESC
      `);

    res.json({
      item,
      images: imagesRes.recordset,
      lifecycleEvents: lifecycleRes.recordset,
      ownershipChain: ownershipRes.recordset,
      conditionLogs: conditionRes.recordset,
      repairs: repairsRes.recordset,
      verifications: verifRes.recordset,
      listings: listingsRes.recordset,
      donations: donationsRes.recordset
    });
  } catch (error: any) {
    console.error('Fetch item details error:', error);
    res.status(500).json({ error: 'Failed to retrieve item details.' });
  }
});

// 2. Register an item in ONE SQL transaction using the mssql Transaction API:
// Inserts into items, item_images, ownership_records, lifecycle_events, condition_logs
// with OUTPUT INSERTED.<id> and named @parameters
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction();

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
    const checkSerial = await db.request()
      .input('serial_number', sql.NVarChar(80), cleanSerial)
      .query('SELECT TOP 1 item_id FROM dbo.items WHERE serial_number = @serial_number');

    if (checkSerial.recordset && checkSerial.recordset.length > 0) {
      res.status(409).json({ error: `An item with serial number '${cleanSerial}' is already registered in the lifecycle ledger.` });
      return;
    }

    const specsJson = typeof specifications === 'object' ? JSON.stringify(specifications) : (specifications || null);
    const today = new Date().toISOString().slice(0, 10);
    const resolvedPurchaseDate = purchase_date || today;
    const grade = getConditionGrade(numScore);

    // ==========================================
    // START ATOMIC TRANSACTION (mssql Transaction API)
    // ==========================================
    await tx.begin();

    // 1. Insert into items with OUTPUT INSERTED.item_id
    const itemReq = tx.request();
    const itemRes = await itemReq
      .input('category_id', sql.Int, Number(category_id))
      .input('registered_by', sql.Int, userId)
      .input('current_owner_id', sql.Int, userId)
      .input('name', sql.NVarChar(120), name.trim())
      .input('brand', sql.NVarChar(60), brand.trim())
      .input('model', sql.NVarChar(60), model.trim())
      .input('serial_number', sql.NVarChar(80), cleanSerial)
      .input('description', sql.NVarChar(sql.MAX), description || null)
      .input('color', sql.NVarChar(30), color || null)
      .input('manufacture_year', sql.Int, manufacture_year ? Number(manufacture_year) : null)
      .input('specifications', sql.NVarChar(sql.MAX), specsJson)
      .input('acquisition_type', sql.NVarChar(20), acquisition_type || 'first_hand')
      .input('previous_owners_count', sql.SmallInt, 0)
      .input('purchased_from', sql.Int, null)
      .input('purchase_date', sql.Date, resolvedPurchaseDate)
      .input('purchase_price', sql.Decimal(10, 2), purchase_price ? Number(purchase_price) : null)
      .input('warranty_expiry_date', sql.Date, warranty_expiry_date || null)
      .input('battery_type', sql.NVarChar(40), battery_type || null)
      .input('battery_capacity_mah', sql.Int, battery_capacity_mah ? Number(battery_capacity_mah) : null)
      .input('battery_rated_hours', sql.Decimal(5, 2), battery_rated_hours ? Number(battery_rated_hours) : null)
      .input('status', sql.NVarChar(20), 'active')
      .query(`
        INSERT INTO dbo.items (
          category_id, registered_by, current_owner_id, name, brand, model,
          serial_number, description, color, manufacture_year, specifications,
          acquisition_type, previous_owners_count, purchased_from, purchase_date,
          purchase_price, warranty_expiry_date, battery_type, battery_capacity_mah,
          battery_rated_hours, status
        )
        OUTPUT INSERTED.item_id
        VALUES (
          @category_id, @registered_by, @current_owner_id, @name, @brand, @model,
          @serial_number, @description, @color, @manufacture_year, @specifications,
          @acquisition_type, @previous_owners_count, @purchased_from, @purchase_date,
          @purchase_price, @warranty_expiry_date, @battery_type, @battery_capacity_mah,
          @battery_rated_hours, @status
        )
      `);

    const newItemId = itemRes.recordset[0].item_id;

    // 2. Insert into item_images (if provided)
    if (Array.isArray(image_urls) && image_urls.length > 0) {
      for (let i = 0; i < image_urls.length; i++) {
        const url = image_urls[i];
        if (url && typeof url === 'string') {
          await tx.request()
            .input('item_id', sql.Int, newItemId)
            .input('image_url', sql.NVarChar(255), url.trim())
            .input('is_primary', sql.Bit, i === 0 ? 1 : 0)
            .query(`
              INSERT INTO dbo.item_images (item_id, image_url, is_primary)
              VALUES (@item_id, @image_url, @is_primary)
            `);
        }
      }
    }

    // 3. Insert into lifecycle_events with OUTPUT INSERTED.event_id
    const eventRes = await tx.request()
      .input('item_id', sql.Int, newItemId)
      .input('performed_by', sql.Int, userId)
      .input('event_type', sql.NVarChar(30), 'registration')
      .input('description', sql.NVarChar(sql.MAX), `Item registered by initial owner ${req.user!.fullName}. Serial: ${cleanSerial}. Acquisition: ${acquisition_type || 'first_hand'}.`)
      .query(`
        INSERT INTO dbo.lifecycle_events (item_id, performed_by, event_type, description)
        OUTPUT INSERTED.event_id
        VALUES (@item_id, @performed_by, @event_type, @description)
      `);

    const newEventId = eventRes.recordset[0].event_id;

    // 4. Insert into condition_logs
    await tx.request()
      .input('item_id', sql.Int, newItemId)
      .input('event_id', sql.Int, newEventId)
      .input('assessed_by', sql.Int, userId)
      .input('condition_score', sql.SmallInt, numScore)
      .input('condition_grade', sql.NVarChar(10), grade)
      .input('battery_health_pct', sql.SmallInt, battery_health_pct ? Number(battery_health_pct) : null)
      .input('battery_backup_hours', sql.Decimal(5, 2), battery_rated_hours ? Number(battery_rated_hours) : null)
      .input('notes', sql.NVarChar(sql.MAX), condition_notes || `Initial registration assessment: ${grade} (${numScore}/10).`)
      .query(`
        INSERT INTO dbo.condition_logs (
          item_id, event_id, assessed_by, condition_score, condition_grade,
          battery_health_pct, battery_backup_hours, notes
        )
        VALUES (
          @item_id, @event_id, @assessed_by, @condition_score, @condition_grade,
          @battery_health_pct, @battery_backup_hours, @notes
        )
      `);

    // 5. Insert into ownership_transfers with OUTPUT INSERTED.transfer_id
    const transferRes = await tx.request()
      .input('item_id', sql.Int, newItemId)
      .input('from_user_id', sql.Int, null)
      .input('to_user_id', sql.Int, userId)
      .input('transfer_type', sql.NVarChar(20), 'registration')
      .input('notes', sql.NVarChar(sql.MAX), 'Initial ownership established on item registration.')
      .query(`
        INSERT INTO dbo.ownership_transfers (item_id, from_user_id, to_user_id, transfer_type, notes)
        OUTPUT INSERTED.transfer_id
        VALUES (@item_id, @from_user_id, @to_user_id, @transfer_type, @notes)
      `);

    const newTransferId = transferRes.recordset[0].transfer_id;

    // 6. Insert into ownership_records (Active ownership opened)
    await tx.request()
      .input('item_id', sql.Int, newItemId)
      .input('owner_id', sql.Int, userId)
      .input('transfer_id', sql.Int, newTransferId)
      .input('start_date', sql.Date, resolvedPurchaseDate)
      .query(`
        INSERT INTO dbo.ownership_records (item_id, owner_id, transfer_id, start_date, end_date)
        VALUES (@item_id, @owner_id, @transfer_id, @start_date, NULL)
      `);

    // COMMIT ATOMIC TRANSACTION
    await tx.commit();

    res.status(201).json({
      message: 'Item registered successfully in one atomic transaction',
      item_id: newItemId
    });
  } catch (error: any) {
    await tx.rollback();
    console.error('Item registration transaction error:', error);
    res.status(500).json({ error: 'Transaction failed and rolled back. ' + (error.message || '') });
  }
});

// 3a. List an item for sale
router.post('/:id/list', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction();

  try {
    const itemId = Number(req.params.id);
    const userId = req.user!.userId;
    const { asking_price } = req.body;

    if (!asking_price || isNaN(Number(asking_price)) || Number(asking_price) <= 0) {
      res.status(400).json({ error: 'A valid positive asking price is required.' });
      return;
    }

    // Verify ownership using TOP 1
    const itemRes = await db.request()
      .input('item_id', sql.Int, itemId)
      .query('SELECT TOP 1 item_id, current_owner_id, name, status FROM dbo.items WHERE item_id = @item_id');

    if (!itemRes.recordset || itemRes.recordset.length === 0) {
      res.status(404).json({ error: 'Item not found.' });
      return;
    }

    const item = itemRes.recordset[0];
    if (item.current_owner_id !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only the current owner can list this item for sale.' });
      return;
    }

    await tx.begin();
    const today = new Date().toISOString().slice(0, 10);

    // Insert into listings with OUTPUT INSERTED.listing_id
    const listingRes = await tx.request()
      .input('item_id', sql.Int, itemId)
      .input('seller_id', sql.Int, userId)
      .input('asking_price', sql.Decimal(10, 2), Number(asking_price))
      .input('listing_date', sql.Date, today)
      .input('status', sql.NVarChar(20), 'active')
      .query(`
        INSERT INTO dbo.listings (item_id, seller_id, asking_price, listing_date, status)
        OUTPUT INSERTED.listing_id
        VALUES (@item_id, @seller_id, @asking_price, @listing_date, @status)
      `);

    // Update item status
    await tx.request()
      .input('item_id', sql.Int, itemId)
      .query(`UPDATE dbo.items SET status = 'listed' WHERE item_id = @item_id`);

    // Insert lifecycle event
    await tx.request()
      .input('item_id', sql.Int, itemId)
      .input('performed_by', sql.Int, userId)
      .input('event_type', sql.NVarChar(30), 'listing')
      .input('description', sql.NVarChar(sql.MAX), `Item listed for sale at $${Number(asking_price).toFixed(2)} by ${req.user!.fullName}.`)
      .query(`
        INSERT INTO dbo.lifecycle_events (item_id, performed_by, event_type, description)
        VALUES (@item_id, @performed_by, @event_type, @description)
      `);

    await tx.commit();

    res.json({
      message: 'Item successfully listed for sale',
      listing_id: listingRes.recordset[0].listing_id
    });
  } catch (error: any) {
    await tx.rollback();
    res.status(500).json({ error: 'Failed to list item for sale. ' + (error.message || '') });
  }
});

// 3b. Record a sale in ONE transaction:
// sales_transactions, ownership_transfers, close old ownership_records row (set end_date),
// open new one, add lifecycle event and condition log, update item owner & status.
router.post('/:id/sell', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction();

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
    const itemRes = await db.request()
      .input('item_id', sql.Int, itemId)
      .query('SELECT TOP 1 item_id, current_owner_id, name, previous_owners_count FROM dbo.items WHERE item_id = @item_id');

    if (!itemRes.recordset || itemRes.recordset.length === 0) {
      res.status(404).json({ error: 'Item not found.' });
      return;
    }

    const item = itemRes.recordset[0];
    if (item.current_owner_id !== sellerId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only the current owner or admin can record a sale for this item.' });
      return;
    }

    // Check buyer exists
    const buyerRes = await db.request()
      .input('buyer_id', sql.Int, Number(buyer_id))
      .query('SELECT TOP 1 user_id, full_name, email FROM dbo.users WHERE user_id = @buyer_id');

    if (!buyerRes.recordset || buyerRes.recordset.length === 0) {
      res.status(404).json({ error: 'Buyer user record not found.' });
      return;
    }
    const buyer = buyerRes.recordset[0];

    const today = new Date().toISOString().slice(0, 10);
    const score = Number(condition_score) || 8;
    const grade = getConditionGrade(score);

    // ==========================================
    // START ATOMIC SALE TRANSACTION
    // ==========================================
    await tx.begin();

    // 1. Resolve or create listing if not provided
    let activeListingId = listing_id ? Number(listing_id) : null;
    if (!activeListingId) {
      const existingListings = await tx.request()
        .input('item_id', sql.Int, itemId)
        .query(`
          SELECT TOP 1 listing_id FROM dbo.listings 
          WHERE item_id = @item_id AND status = 'active' 
          ORDER BY listing_id DESC
        `);

      if (existingListings.recordset && existingListings.recordset.length > 0) {
        activeListingId = existingListings.recordset[0].listing_id;
      } else {
        const newListRes = await tx.request()
          .input('item_id', sql.Int, itemId)
          .input('seller_id', sql.Int, sellerId)
          .input('asking_price', sql.Decimal(10, 2), Number(sale_price))
          .input('listing_date', sql.Date, today)
          .input('status', sql.NVarChar(20), 'active')
          .query(`
            INSERT INTO dbo.listings (item_id, seller_id, asking_price, listing_date, status)
            OUTPUT INSERTED.listing_id
            VALUES (@item_id, @seller_id, @asking_price, @listing_date, @status)
          `);
        activeListingId = newListRes.recordset[0].listing_id;
      }
    }

    // 2. Insert into ownership_transfers with OUTPUT INSERTED.transfer_id
    const transferRes = await tx.request()
      .input('item_id', sql.Int, itemId)
      .input('from_user_id', sql.Int, sellerId)
      .input('to_user_id', sql.Int, buyer.user_id)
      .input('transfer_type', sql.NVarChar(20), 'sale')
      .input('notes', sql.NVarChar(sql.MAX), `Ownership transferred via verified sale from ${req.user!.fullName} to ${buyer.full_name}. Price: $${Number(sale_price).toFixed(2)}.`)
      .query(`
        INSERT INTO dbo.ownership_transfers (item_id, from_user_id, to_user_id, transfer_type, notes)
        OUTPUT INSERTED.transfer_id
        VALUES (@item_id, @from_user_id, @to_user_id, @transfer_type, @notes)
      `);
    const newTransferId = transferRes.recordset[0].transfer_id;

    // 3. Insert into sales_transactions with OUTPUT INSERTED.transaction_id
    const transRes = await tx.request()
      .input('listing_id', sql.Int, activeListingId)
      .input('buyer_id', sql.Int, buyer.user_id)
      .input('transfer_id', sql.Int, newTransferId)
      .input('sale_price', sql.Decimal(10, 2), Number(sale_price))
      .input('sale_date', sql.Date, today)
      .input('payment_method', sql.NVarChar(30), payment_method || 'Bank Transfer / Escrow')
      .query(`
        INSERT INTO dbo.sales_transactions (listing_id, buyer_id, transfer_id, sale_price, sale_date, payment_method)
        OUTPUT INSERTED.transaction_id
        VALUES (@listing_id, @buyer_id, @transfer_id, @sale_price, @sale_date, @payment_method)
      `);

    // 4. Close the old ownership_records row (set end_date)
    await tx.request()
      .input('today', sql.Date, today)
      .input('item_id', sql.Int, itemId)
      .input('seller_id', sql.Int, sellerId)
      .query(`
        UPDATE dbo.ownership_records 
        SET end_date = @today 
        WHERE item_id = @item_id AND owner_id = @seller_id AND end_date IS NULL
      `);

    // 5. Open new ownership_records row
    await tx.request()
      .input('item_id', sql.Int, itemId)
      .input('buyer_id', sql.Int, buyer.user_id)
      .input('transfer_id', sql.Int, newTransferId)
      .input('start_date', sql.Date, today)
      .query(`
        INSERT INTO dbo.ownership_records (item_id, owner_id, transfer_id, start_date, end_date)
        VALUES (@item_id, @buyer_id, @transfer_id, @start_date, NULL)
      `);

    // 6. Close listing
    await tx.request()
      .input('today', sql.Date, today)
      .input('listing_id', sql.Int, activeListingId)
      .query(`UPDATE dbo.listings SET status = 'sold', closed_date = @today WHERE listing_id = @listing_id`);

    // 7. Add lifecycle event with OUTPUT INSERTED.event_id
    const eventRes = await tx.request()
      .input('item_id', sql.Int, itemId)
      .input('performed_by', sql.Int, sellerId)
      .input('event_type', sql.NVarChar(30), 'sale')
      .input('description', sql.NVarChar(sql.MAX), `Sold to ${buyer.full_name} for $${Number(sale_price).toFixed(2)}. Ownership transferred in verified transaction #${transRes.recordset[0].transaction_id}.`)
      .query(`
        INSERT INTO dbo.lifecycle_events (item_id, performed_by, event_type, description)
        OUTPUT INSERTED.event_id
        VALUES (@item_id, @performed_by, @event_type, @description)
      `);
    const newEventId = eventRes.recordset[0].event_id;

    // 8. Add condition log upon transfer
    await tx.request()
      .input('item_id', sql.Int, itemId)
      .input('event_id', sql.Int, newEventId)
      .input('assessed_by', sql.Int, buyer.user_id)
      .input('condition_score', sql.SmallInt, score)
      .input('condition_grade', sql.NVarChar(10), grade)
      .input('notes', sql.NVarChar(sql.MAX), condition_notes || `Post-sale receipt inspection by new owner ${buyer.full_name}. Verified condition: ${grade} (${score}/10).`)
      .query(`
        INSERT INTO dbo.condition_logs (
          item_id, event_id, assessed_by, condition_score, condition_grade, notes
        )
        VALUES (@item_id, @event_id, @assessed_by, @condition_score, @condition_grade, @notes)
      `);

    // 9. Update items row: new current_owner_id, previous_owners_count + 1, status = 'active'
    await tx.request()
      .input('buyer_id', sql.Int, buyer.user_id)
      .input('item_id', sql.Int, itemId)
      .query(`
        UPDATE dbo.items 
        SET current_owner_id = @buyer_id, 
            previous_owners_count = previous_owners_count + 1,
            status = 'active'
        WHERE item_id = @item_id
      `);

    // COMMIT ATOMIC TRANSACTION
    await tx.commit();

    res.json({
      message: 'Sale successfully completed and ownership transferred in one atomic transaction',
      transfer_id: newTransferId,
      transaction_id: transRes.recordset[0].transaction_id,
      new_owner: buyer.full_name
    });
  } catch (error: any) {
    await tx.rollback();
    console.error('Sale transaction error:', error);
    res.status(500).json({ error: 'Sale transaction failed and was rolled back. ' + (error.message || '') });
  }
});

// 4. Log repairs with provider, cost, condition before/after, and suggest known issues and causes
router.post('/:id/repair', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction();

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
    const itemRes = await db.request()
      .input('item_id', sql.Int, itemId)
      .query('SELECT TOP 1 item_id, current_owner_id, name FROM dbo.items WHERE item_id = @item_id');

    if (!itemRes.recordset || itemRes.recordset.length === 0) {
      res.status(404).json({ error: 'Item not found.' });
      return;
    }

    const item = itemRes.recordset[0];
    if (item.current_owner_id !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only the current owner or admin can log a repair for this item.' });
      return;
    }

    // Get provider details
    const providerRes = await db.request()
      .input('provider_id', sql.Int, Number(provider_id))
      .query('SELECT TOP 1 provider_id, name FROM dbo.service_providers WHERE provider_id = @provider_id');
    const providerName = providerRes.recordset && providerRes.recordset.length > 0 ? providerRes.recordset[0].name : 'Service Provider';

    await tx.begin();

    // 1. Insert into lifecycle_events with OUTPUT INSERTED.event_id
    const eventRes = await tx.request()
      .input('item_id', sql.Int, itemId)
      .input('performed_by', sql.Int, userId)
      .input('event_type', sql.NVarChar(30), 'repair')
      .input('description', sql.NVarChar(sql.MAX), `Maintenance/Repair serviced at ${providerName}. Cost: $${Number(cost || 0).toFixed(2)}. ${description.trim()}`)
      .query(`
        INSERT INTO dbo.lifecycle_events (item_id, performed_by, event_type, description)
        OUTPUT INSERTED.event_id
        VALUES (@item_id, @performed_by, @event_type, @description)
      `);
    const newEventId = eventRes.recordset[0].event_id;

    // 2. Insert into repairs table with OUTPUT INSERTED.repair_id
    const repairRes = await tx.request()
      .input('item_id', sql.Int, itemId)
      .input('provider_id', sql.Int, Number(provider_id))
      .input('event_id', sql.Int, newEventId)
      .input('issue_id', sql.Int, issue_id ? Number(issue_id) : null)
      .input('cause_id', sql.Int, cause_id ? Number(cause_id) : null)
      .input('repair_date', sql.Date, resolvedDate)
      .input('description', sql.NVarChar(sql.MAX), description.trim())
      .input('cost', sql.Decimal(10, 2), Number(cost || 0))
      .input('condition_before', sql.SmallInt, condBefore)
      .input('condition_after', sql.SmallInt, condAfter)
      .query(`
        INSERT INTO dbo.repairs (
          item_id, provider_id, event_id, issue_id, cause_id,
          repair_date, description, cost, condition_before, condition_after
        )
        OUTPUT INSERTED.repair_id
        VALUES (
          @item_id, @provider_id, @event_id, @issue_id, @cause_id,
          @repair_date, @description, @cost, @condition_before, @condition_after
        )
      `);

    // 3. Insert condition log documenting improvement
    const afterGrade = getConditionGrade(condAfter);
    await tx.request()
      .input('item_id', sql.Int, itemId)
      .input('event_id', sql.Int, newEventId)
      .input('assessed_by', sql.Int, userId)
      .input('condition_score', sql.SmallInt, condAfter)
      .input('condition_grade', sql.NVarChar(10), afterGrade)
      .input('notes', sql.NVarChar(sql.MAX), notes || `Post-repair inspection: condition improved from ${condBefore}/10 to ${condAfter}/10 (${afterGrade}) following service by ${providerName}.`)
      .query(`
        INSERT INTO dbo.condition_logs (
          item_id, event_id, assessed_by, condition_score, condition_grade, notes
        )
        VALUES (@item_id, @event_id, @assessed_by, @condition_score, @condition_grade, @notes)
      `);

    await tx.commit();

    res.json({
      message: 'Repair logged successfully in one atomic transaction',
      repair_id: repairRes.recordset[0].repair_id,
      event_id: newEventId
    });
  } catch (error: any) {
    await tx.rollback();
    console.error('Repair logging error:', error);
    res.status(500).json({ error: 'Repair logging failed and was rolled back. ' + (error.message || '') });
  }
});

// 5a. Record donation in ONE transaction
router.post('/:id/donate', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction();

  try {
    const itemId = Number(req.params.id);
    const donorId = req.user!.userId;
    const { organization_id, donation_date, notes } = req.body;

    if (!organization_id || isNaN(Number(organization_id))) {
      res.status(400).json({ error: 'Recipient organization is required.' });
      return;
    }

    // Verify item and ownership
    const itemRes = await db.request()
      .input('item_id', sql.Int, itemId)
      .query('SELECT TOP 1 item_id, current_owner_id, name FROM dbo.items WHERE item_id = @item_id');

    if (!itemRes.recordset || itemRes.recordset.length === 0) {
      res.status(404).json({ error: 'Item not found.' });
      return;
    }

    const item = itemRes.recordset[0];
    if (item.current_owner_id !== donorId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Only the current owner or admin can record a donation for this item.' });
      return;
    }

    // Get organization details
    const orgRes = await db.request()
      .input('organization_id', sql.Int, Number(organization_id))
      .query('SELECT TOP 1 organization_id, user_id, name, org_type FROM dbo.organizations WHERE organization_id = @organization_id');

    if (!orgRes.recordset || orgRes.recordset.length === 0) {
      res.status(404).json({ error: 'Organization not found.' });
      return;
    }
    const org = orgRes.recordset[0];

    const today = new Date().toISOString().slice(0, 10);
    const resolvedDate = donation_date || today;

    await tx.begin();

    // 1. Insert ownership_transfers with OUTPUT INSERTED.transfer_id
    const transferRes = await tx.request()
      .input('item_id', sql.Int, itemId)
      .input('from_user_id', sql.Int, donorId)
      .input('to_user_id', sql.Int, org.user_id)
      .input('transfer_type', sql.NVarChar(20), 'donation')
      .input('notes', sql.NVarChar(sql.MAX), `Donated by ${req.user!.fullName} to non-profit organization ${org.name}.`)
      .query(`
        INSERT INTO dbo.ownership_transfers (item_id, from_user_id, to_user_id, transfer_type, notes)
        OUTPUT INSERTED.transfer_id
        VALUES (@item_id, @from_user_id, @to_user_id, @transfer_type, @notes)
      `);
    const newTransferId = transferRes.recordset[0].transfer_id;

    // 2. Insert into donations table with OUTPUT INSERTED.donation_id
    const donRes = await tx.request()
      .input('item_id', sql.Int, itemId)
      .input('donor_id', sql.Int, donorId)
      .input('organization_id', sql.Int, org.organization_id)
      .input('transfer_id', sql.Int, newTransferId)
      .input('donation_date', sql.Date, resolvedDate)
      .input('notes', sql.NVarChar(sql.MAX), notes || `Charitable contribution to ${org.name}.`)
      .query(`
        INSERT INTO dbo.donations (item_id, donor_id, organization_id, transfer_id, donation_date, notes)
        OUTPUT INSERTED.donation_id
        VALUES (@item_id, @donor_id, @organization_id, @transfer_id, @donation_date, @notes)
      `);

    // 3. Close old ownership_records row
    await tx.request()
      .input('resolvedDate', sql.Date, resolvedDate)
      .input('item_id', sql.Int, itemId)
      .input('donorId', sql.Int, donorId)
      .query(`
        UPDATE dbo.ownership_records 
        SET end_date = @resolvedDate 
        WHERE item_id = @item_id AND owner_id = @donorId AND end_date IS NULL
      `);

    // 4. Open new ownership_records row for org
    await tx.request()
      .input('item_id', sql.Int, itemId)
      .input('orgUserId', sql.Int, org.user_id)
      .input('transfer_id', sql.Int, newTransferId)
      .input('resolvedDate', sql.Date, resolvedDate)
      .query(`
        INSERT INTO dbo.ownership_records (item_id, owner_id, transfer_id, start_date, end_date)
        VALUES (@item_id, @orgUserId, @transfer_id, @resolvedDate, NULL)
      `);

    // 5. Insert lifecycle event
    await tx.request()
      .input('item_id', sql.Int, itemId)
      .input('performed_by', sql.Int, donorId)
      .input('event_type', sql.NVarChar(30), 'donation')
      .input('description', sql.NVarChar(sql.MAX), `Donated to ${org.name} (${org.org_type || 'Charity'}). Donation record #${donRes.recordset[0].donation_id}.`)
      .query(`
        INSERT INTO dbo.lifecycle_events (item_id, performed_by, event_type, description)
        VALUES (@item_id, @performed_by, @event_type, @description)
      `);

    // 6. Update item row
    await tx.request()
      .input('orgUserId', sql.Int, org.user_id)
      .input('item_id', sql.Int, itemId)
      .query(`
        UPDATE dbo.items 
        SET current_owner_id = @orgUserId, 
            previous_owners_count = previous_owners_count + 1,
            status = 'donated'
        WHERE item_id = @item_id
      `);

    await tx.commit();

    res.json({
      message: 'Donation recorded successfully and ownership transferred',
      donation_id: donRes.recordset[0].donation_id,
      organization: org.name
    });
  } catch (error: any) {
    await tx.rollback();
    console.error('Donation transaction error:', error);
    res.status(500).json({ error: 'Donation transaction failed and was rolled back. ' + (error.message || '') });
  }
});

// 5b. Record provenance verification (Admin or Authorized users)
router.post('/:id/verify-provenance', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction();

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

    await tx.begin();

    // 1. Insert provenance_verifications with OUTPUT INSERTED.verification_id
    const verifRes = await tx.request()
      .input('item_id', sql.Int, itemId)
      .input('verified_by', sql.Int, userId)
      .input('verification_date', sql.Date, today)
      .input('method', sql.NVarChar(40), method.trim())
      .input('status', sql.NVarChar(20), verificationStatus)
      .input('notes', sql.NVarChar(sql.MAX), notes || `Provenance verified using ${method.trim()} by inspector ${req.user!.fullName}.`)
      .query(`
        INSERT INTO dbo.provenance_verifications (item_id, verified_by, verification_date, method, status, notes)
        OUTPUT INSERTED.verification_id
        VALUES (@item_id, @verified_by, @verification_date, @method, @status, @notes)
      `);

    // 2. Insert lifecycle event
    await tx.request()
      .input('item_id', sql.Int, itemId)
      .input('performed_by', sql.Int, userId)
      .input('event_type', sql.NVarChar(30), 'provenance_check')
      .input('description', sql.NVarChar(sql.MAX), `Official provenance inspection: ${verificationStatus.toUpperCase()} via ${method.trim()}. Verified by ${req.user!.fullName}.`)
      .query(`
        INSERT INTO dbo.lifecycle_events (item_id, performed_by, event_type, description)
        VALUES (@item_id, @performed_by, @event_type, @description)
      `);

    await tx.commit();

    res.json({
      message: 'Provenance verification successfully recorded in lifecycle history',
      verification_id: verifRes.recordset[0].verification_id
    });
  } catch (error: any) {
    await tx.rollback();
    res.status(500).json({ error: 'Provenance verification failed. ' + (error.message || '') });
  }
});

// Log a condition check event
router.post('/:id/log-condition', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction();

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

    await tx.begin();

    // 1. Lifecycle event with OUTPUT INSERTED.event_id
    const eventRes = await tx.request()
      .input('item_id', sql.Int, itemId)
      .input('performed_by', sql.Int, userId)
      .input('event_type', sql.NVarChar(30), 'condition_check')
      .input('description', sql.NVarChar(sql.MAX), `Periodic condition inspection logged by ${req.user!.fullName}. Grade: ${grade} (${score}/10).`)
      .query(`
        INSERT INTO dbo.lifecycle_events (item_id, performed_by, event_type, description)
        OUTPUT INSERTED.event_id
        VALUES (@item_id, @performed_by, @event_type, @description)
      `);

    // 2. Condition log with OUTPUT INSERTED.condition_id
    const condRes = await tx.request()
      .input('item_id', sql.Int, itemId)
      .input('event_id', sql.Int, eventRes.recordset[0].event_id)
      .input('assessed_by', sql.Int, userId)
      .input('condition_score', sql.SmallInt, score)
      .input('condition_grade', sql.NVarChar(10), grade)
      .input('battery_health_pct', sql.SmallInt, battery_health_pct ? Number(battery_health_pct) : null)
      .input('battery_backup_hours', sql.Decimal(5, 2), battery_backup_hours ? Number(battery_backup_hours) : null)
      .input('notes', sql.NVarChar(sql.MAX), notes || `Condition check: ${grade} (${score}/10).`)
      .query(`
        INSERT INTO dbo.condition_logs (
          item_id, event_id, assessed_by, condition_score, condition_grade,
          battery_health_pct, battery_backup_hours, notes
        )
        OUTPUT INSERTED.condition_id
        VALUES (
          @item_id, @event_id, @assessed_by, @condition_score, @condition_grade,
          @battery_health_pct, @battery_backup_hours, @notes
        )
      `);

    await tx.commit();

    res.json({
      message: 'Condition log recorded successfully',
      condition_id: condRes.recordset[0].condition_id
    });
  } catch (error: any) {
    await tx.rollback();
    res.status(500).json({ error: 'Failed to record condition log.' });
  }
});

export default router;
