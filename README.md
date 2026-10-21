# Second-Hand Lifecycle Tracker ("Carfax for Everyday Items")

A production-grade, full-stack provenance and condition ledger for physical goods (electronics, luxury watches, musical instruments, bicycles, vehicles) tracking their complete lifecycle across owners, certified repairs, condition degradations, resales, and charitable donations.

Built strictly according to the relational schema with **17 tables**, **plain parameterized SQL (no ORM)**, and **atomic multi-table writes (`BEGIN` / `COMMIT` / `ROLLBACK`)** enforcing append-only history integrity.

---

## 🏗️ Architecture & Technology Stack

- **Frontend (`/client` & `/src`)**: React 19, TypeScript, React Router, Tailwind CSS, Lucide icons.
- **Backend (`/server` & `server.ts`)**: Node.js, Express REST API, JWT authentication, `bcryptjs` password hashing, `multer` for image uploads.
- **Database (`database/schema.sql`, `database/seed.sql`)**: MySQL 8 using the `mysql2` client with parameterized queries (`?` placeholders). Zero ORM.
- **Storage & Fallback Engine**: Seamless dual-mode driver in `server/db.ts` that connects to MySQL 8 when configured via `.env`, or initializes an in-memory/embedded SQL engine (`sql.js`) out of the box when MySQL credentials are not yet specified.

---

## 📊 Database Schema (17 Tables)

The database matches the ER diagram without modifications or column renames:

1. **`users`**: Identity, credentials (`password_hash`), contact, and roles (`user`, `admin`).
2. **`categories`**: Hierarchical category tree with self-referencing `parent_category_id`.
3. **`items`**: Master physical item ledger (brand, model, immutable serial number, MSRP, battery specs, condition).
4. **`item_images`**: Multi-image attachments with `is_primary` flag.
5. **`lifecycle_events`**: Append-only event chronicle (`registration`, `repair`, `sale`, `listing`, `donation`, `provenance_check`, `condition_check`).
6. **`condition_logs`**: Chronological condition scores (1–10), grades, battery health %, and runtime hours.
7. **`ownership_transfers`**: Immutable record of transfer between `from_user_id` and `to_user_id`.
8. **`ownership_records`**: Sequential title eras with `start_date` and `end_date` (closed on transfer).
9. **`organizations`**: Certified non-profits, refurbishers, and charities for donations.
10. **`listings`**: Marketplace offers with asking prices and listing states.
11. **`sales_transactions`**: Financial settlement records tied to ownership transfers and listings.
12. **`donations`**: Charitable donation records tied to ownership transfers and recipient organizations.
13. **`provenance_verifications`**: Official provenance audit logs (OEM database check, serial check, receipt validation).
14. **`service_providers`**: Authorized repair centers and independent technicians.
15. **`known_issues`**: Standardized failure modes, symptoms, and severity by category.
16. **`issue_causes`**: Diagnostic root causes, suggested fixes, repair difficulty, and estimated costs.
17. **`repairs`**: Certified maintenance logs with provider ID, costs, condition before/after, and KB links.

---

## ⚡ Multi-Table Atomic Transaction Rules

Every multi-table mutation adheres to strict transactional rules (`BEGIN` / `COMMIT` / `ROLLBACK`):

1. **Item Registration**:
   Executes in **ONE transaction**:
   - `INSERT INTO items`
   - `INSERT INTO item_images`
   - `INSERT INTO ownership_transfers` (Initial registration)
   - `INSERT INTO ownership_records` (`start_date`, `end_date` = NULL)
   - `INSERT INTO lifecycle_events` (`event_type` = 'registration')
   - `INSERT INTO condition_logs` (Baseline condition score & grade)

2. **Sale & Title Transfer**:
   Executes in **ONE transaction**:
   - `INSERT INTO ownership_transfers`
   - `INSERT INTO sales_transactions`
   - `UPDATE ownership_records` (Close previous owner record: `end_date` = sale date)
   - `INSERT INTO ownership_records` (Open new buyer record: `start_date` = sale date, `end_date` = NULL)
   - `UPDATE listings` (Set status = 'sold', `closed_date`)
   - `INSERT INTO lifecycle_events` (`event_type` = 'sale')
   - `INSERT INTO condition_logs` (Post-sale condition check)
   - `UPDATE items` (Update `current_owner_id`, increment `previous_owners_count`)

3. **Repairs & Maintenance**:
   Executes in **ONE transaction**:
   - `INSERT INTO lifecycle_events` (`event_type` = 'repair')
   - `INSERT INTO repairs` (provider, cost, condition before & after, issue/cause ID)
   - `INSERT INTO condition_logs` (Updated restored score & notes)

4. **Charitable Donations**:
   Executes in **ONE transaction**:
   - `INSERT INTO ownership_transfers` (`transfer_type` = 'donation')
   - `INSERT INTO donations`
   - `UPDATE ownership_records` (Close donor era)
   - `INSERT INTO ownership_records` (Open organization ownership era)
   - `INSERT INTO lifecycle_events` (`event_type` = 'donation')
   - `UPDATE items` (`status` = 'donated')

---

## 🚀 Setup & Installation Instructions

### 1. Prerequisites
- Node.js 18+ (tested on Node 20 & 22)
- MySQL 8.0+ server running locally or hosted (e.g. AWS RDS, Google Cloud SQL, PlanetScale)

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Database Credentials
Create or edit your `.env` file:
```env
# Database Credentials
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=lifecycle_tracker

# JWT Authentication
JWT_SECRET=your_jwt_secret_key_here
PORT=3000
```

### 4. Create Database and Run Schema
Using MySQL CLI:
```bash
mysql -u root -p < database/schema.sql
```
Or use the automated TypeScript seed script:
```bash
npx tsx database/seed.ts
```

### 5. Seed Demo Multi-Owner Item
Run the seed script:
```bash
mysql -u root -p lifecycle_tracker < database/seed.sql
```
This provisions:
- **Demo Item #1**: `MacBook Pro 16" M1 Max (32GB / 1TB SSD)` with serial `C02G99XZMD6R`.
  - **Owner 1**: Alice Walker (Registered new for $3,499.00 on 2022-01-15, condition 10/10 Mint)
  - **Service**: Certified thermal maintenance at Apple Authorized Care Center ($89.00)
  - **Owner 2**: Bob Miller (Purchased on 2023-08-20 for $2,350.00 via verified wire)
  - **Service**: Battery module replacement at Seattle Green Electronics ($210.00)
  - **Provenance**: Certified audit & genuine title validation by Admin Inspector
  - **Owner 3**: Charlie Davis (Purchased on 2024-09-12 for $1,850.00, currently listed for $1,650.00)
- **Demo Item #2**: `Leica M10 Digital Rangefinder Camera` (Serial `LCM10-539281`).

### 6. Start Server and Application
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

## 🛡️ Input Validation & Security

- **Server-Side Validation**: All incoming requests (title, serial number uniqueness, positive prices, valid scores 1–10, foreign key existence) are validated before entering transactions.
- **Password Security**: Passwords are never stored in plain text; hashed using `bcrypt` with 10 salt rounds.
- **SQL Injection Prevention**: All queries use parameterized statements (`?`).
- **Audit Immutability**: History tables (`lifecycle_events`, `condition_logs`, `repairs`, `provenance_verifications`, `sales_transactions`) only permit `INSERT` operations; no history entries are ever deleted or edited.
