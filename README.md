# Second-Hand Lifecycle Tracker ("Carfax for Everyday Items")
### Microsoft SQL Server (T-SQL) Edition

A production-grade, full-stack provenance and condition ledger for physical goods (electronics, luxury watches, musical instruments, bicycles, vehicles) tracking their complete lifecycle across owners, certified repairs, condition degradations, resales, and charitable donations.

Built strictly according to the relational schema with **17 tables**, **plain parameterized T-SQL (no ORM)**, and **atomic multi-table writes using the `mssql` Transaction API** enforcing append-only history integrity.

---

## 🏗️ Architecture & Technology Stack

- **Database**: Microsoft SQL Server 2019 / 2022 / Azure SQL Database.
- **Node.js Client**: `mssql` package (using the official `tedious` TDS driver).
- **T-SQL Conventions**:
  - `IDENTITY(1,1)` instead of `AUTO_INCREMENT`
  - `NVARCHAR`, `DATETIME2` with `DEFAULT GETDATE()` instead of `CURRENT_TIMESTAMP`
  - `BIT` (`1` / `0`) instead of `BOOLEAN`
  - `TOP 1` and `OFFSET / FETCH` instead of `LIMIT`
  - Named `@parameters` instead of positional `?` placeholders
  - `OUTPUT INSERTED.<id>` instead of MySQL `insertId`
  - `mssql.Transaction` API (`tx.begin()`, `tx.commit()`, `tx.rollback()`, `new sql.Request(tx)`) for multi-table atomic writes
  - Filtered unique indexes (`WHERE email IS NOT NULL`, `WHERE end_date IS NULL`, etc.)
  - `INSTEAD OF DELETE, UPDATE` triggers with `THROW 50000, '...', 1;` enforcing immutability on history records
- **Backend**: Node.js, Express REST API, JWT authentication, `bcryptjs` password hashing, `multer` for image uploads.
- **Frontend**: React 19, TypeScript, React Router, Tailwind CSS, Lucide icons.

---

## 📊 Database Schema (17 T-SQL Tables)

The database matches the ER diagram without modifications or column renames:

1. **`dbo.users`**: Identity, credentials (`password_hash`), contact, and roles (`user`, `admin`). Filtered unique index on `email`.
2. **`dbo.categories`**: Hierarchical category tree with self-referencing `parent_category_id`.
3. **`dbo.items`**: Master physical item ledger (brand, model, immutable serial number, MSRP, battery specs, condition). Filtered unique index on `serial_number`.
4. **`dbo.item_images`**: Multi-image attachments with `is_primary` (`BIT`).
5. **`dbo.lifecycle_events`**: Append-only event chronicle with `THROW` trigger preventing modification/deletion.
6. **`dbo.condition_logs`**: Chronological condition scores (1–10 `CHECK` constraint), grades, battery health %, and runtime hours with `THROW` trigger.
7. **`dbo.ownership_transfers`**: Immutable record of transfer between `from_user_id` and `to_user_id` with `THROW` trigger.
8. **`dbo.ownership_records`**: Sequential title eras with `start_date` and `end_date`. Filtered unique index on `(item_id) WHERE end_date IS NULL` guarantees at most one active current owner per item.
9. **`dbo.organizations`**: Certified non-profits, refurbishers, and charities for donations.
10. **`dbo.listings`**: Marketplace offers with asking prices (`CHECK (asking_price > 0)`). Filtered unique index on `(item_id) WHERE status = 'active'` guarantees at most one active listing per item.
11. **`dbo.sales_transactions`**: Financial settlement records tied to ownership transfers and listings.
12. **`dbo.donations`**: Charitable donation records tied to ownership transfers and recipient organizations.
13. **`dbo.provenance_verifications`**: Official provenance audit logs with `THROW` trigger.
14. **`dbo.service_providers`**: Authorized repair centers and independent technicians.
15. **`dbo.known_issues`**: Standardized failure modes, symptoms, and severity by category.
16. **`dbo.issue_causes`**: Diagnostic root causes, suggested fixes, repair difficulty, and estimated costs.
17. **`dbo.repairs`**: Certified maintenance logs with provider ID, costs, condition before/after, and KB links with `THROW` trigger.

---

## ⚡ Multi-Table Atomic Transaction Rules (mssql Transaction API)

Every multi-table mutation adheres to strict transactional rules using the `mssql` Transaction API:

1. **Item Registration**:
   Executes in **ONE transaction**:
   - `INSERT INTO dbo.items (...) OUTPUT INSERTED.item_id VALUES (...)`
   - `INSERT INTO dbo.item_images`
   - `INSERT INTO dbo.ownership_transfers (...) OUTPUT INSERTED.transfer_id VALUES (...)`
   - `INSERT INTO dbo.ownership_records (...) VALUES (...)`
   - `INSERT INTO dbo.lifecycle_events (...) OUTPUT INSERTED.event_id VALUES (...)`
   - `INSERT INTO dbo.condition_logs (...) VALUES (...)`

2. **Sale & Title Transfer**:
   Executes in **ONE transaction**:
   - `INSERT INTO dbo.ownership_transfers (...) OUTPUT INSERTED.transfer_id VALUES (...)`
   - `INSERT INTO dbo.sales_transactions (...) OUTPUT INSERTED.transaction_id VALUES (...)`
   - `UPDATE dbo.ownership_records SET end_date = @today WHERE item_id = @item_id AND owner_id = @seller_id AND end_date IS NULL`
   - `INSERT INTO dbo.ownership_records (...) VALUES (...)` (Open new buyer era)
   - `UPDATE dbo.listings SET status = 'sold', closed_date = @today WHERE listing_id = @listing_id`
   - `INSERT INTO dbo.lifecycle_events (...) OUTPUT INSERTED.event_id VALUES (...)`
   - `INSERT INTO dbo.condition_logs (...) VALUES (...)`
   - `UPDATE dbo.items SET current_owner_id = @buyer_id, previous_owners_count = previous_owners_count + 1, status = 'active' WHERE item_id = @item_id`

3. **Repairs & Maintenance**:
   Executes in **ONE transaction**:
   - `INSERT INTO dbo.lifecycle_events (...) OUTPUT INSERTED.event_id VALUES (...)`
   - `INSERT INTO dbo.repairs (...) OUTPUT INSERTED.repair_id VALUES (...)`
   - `INSERT INTO dbo.condition_logs (...) VALUES (...)`

4. **Charitable Donations**:
   Executes in **ONE transaction**:
   - `INSERT INTO dbo.ownership_transfers (...) OUTPUT INSERTED.transfer_id VALUES (...)`
   - `INSERT INTO dbo.donations (...) OUTPUT INSERTED.donation_id VALUES (...)`
   - `UPDATE dbo.ownership_records SET end_date = @resolvedDate ...`
   - `INSERT INTO dbo.ownership_records (item_id, owner_id, transfer_id, start_date, end_date) VALUES (...)`
   - `INSERT INTO dbo.lifecycle_events (...) VALUES (...)`
   - `UPDATE dbo.items SET current_owner_id = @orgUserId, status = 'donated' WHERE item_id = @item_id`

---

## 🚀 Setup & Installation Instructions

### 1. Prerequisites
- Node.js 18+ (tested on Node 20 & 22)
- Microsoft SQL Server 2017 / 2019 / 2022 (Express, Developer, or Standard edition) or Azure SQL Database

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Database Credentials in `.env`
Set your Microsoft SQL Server parameters in `.env`:
```env
# Microsoft SQL Server Configuration
DB_SERVER="localhost"
DB_PORT="1433"
DB_USER="sa"
DB_PASSWORD="YourStrong!Passw0rd"
DB_NAME="lifecycle_tracker"
DB_ENCRYPT="false"
DB_TRUST_SERVER_CERTIFICATE="true"

# JWT Secret & Port
JWT_SECRET="secondhand-lifecycle-tracker-secret-key-2026"
PORT=3000
```

### 4. Create Database and Run Schema & Seed Scripts
Using `sqlcmd`:
```bash
sqlcmd -S localhost,1433 -U sa -P "YourStrong!Passw0rd" -i database/schema.sql
sqlcmd -S localhost,1433 -U sa -P "YourStrong!Passw0rd" -d lifecycle_tracker -i database/seed.sql
```
Or using the built-in TypeScript runner (`npx tsx`):
```bash
npx tsx database/seed.ts
```

### 5. Start the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🔑 Demo Accounts (Password for all: `password123`)

| Name | Email | Role | Context |
| :--- | :--- | :--- | :--- |
| **Admin Inspector** | `admin@lifecycle.com` | `admin` | Official provenance auditing authority |
| **Alice Walker** | `alice@example.com` | `user` | First owner of MacBook Pro |
| **Bob Miller** | `bob@example.com` | `user` | Second owner (serviced battery) |
| **Charlie Davis** | `charlie@example.com` | `user` | Third owner (current seller) |
| **Diana Evans** | `diana@example.com` | `user` | Owner of Leica M10 Rangefinder |

---

## 🛡️ Immutability Triggers with `THROW`

The schema enforces history immutability at the database engine level via `INSTEAD OF` triggers that raise error code 50000+ with `THROW`:
- Any `DELETE` or `UPDATE` on `dbo.lifecycle_events`, `dbo.condition_logs`, `dbo.provenance_verifications`, `dbo.repairs`, or `dbo.ownership_transfers` will immediately abort and throw an error.
