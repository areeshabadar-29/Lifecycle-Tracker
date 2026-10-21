-- ============================================================================
-- Seed Data Script for Second-Hand Lifecycle Tracker (T-SQL)
-- Microsoft SQL Server 2019 / 2022
-- ============================================================================

USE [lifecycle_tracker];
GO

-- Temporarily disable foreign keys and triggers for clean seeding
EXEC sp_msforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT all';
GO
DISABLE TRIGGER ALL ON dbo.lifecycle_events;
DISABLE TRIGGER ALL ON dbo.condition_logs;
DISABLE TRIGGER ALL ON dbo.provenance_verifications;
DISABLE TRIGGER ALL ON dbo.repairs;
DISABLE TRIGGER ALL ON dbo.ownership_transfers;
GO

DELETE FROM dbo.repairs;
DELETE FROM dbo.issue_causes;
DELETE FROM dbo.known_issues;
DELETE FROM dbo.service_providers;
DELETE FROM dbo.provenance_verifications;
DELETE FROM dbo.donations;
DELETE FROM dbo.sales_transactions;
DELETE FROM dbo.listings;
DELETE FROM dbo.organizations;
DELETE FROM dbo.ownership_records;
DELETE FROM dbo.ownership_transfers;
DELETE FROM dbo.condition_logs;
DELETE FROM dbo.lifecycle_events;
DELETE FROM dbo.item_images;
DELETE FROM dbo.items;
DELETE FROM dbo.categories;
DELETE FROM dbo.users;
GO

-- 1. Insert Users (password for all: 'password123')
SET IDENTITY_INSERT dbo.users ON;
INSERT INTO dbo.users (user_id, full_name, email, password_hash, phone, city, role) VALUES
(1, N'Admin Inspector', N'admin@lifecycle.com', N'$2b$10$.xzW1fysBinDyTWF/Amy5OgSX92435XIUTLB0QHuvV8qUsvtkCxR6', N'+1-555-0100', N'San Francisco', N'admin'),
(2, N'Alice Walker (First Owner)', N'alice@example.com', N'$2b$10$.xzW1fysBinDyTWF/Amy5OgSX92435XIUTLB0QHuvV8qUsvtkCxR6', N'+1-555-0101', N'San Francisco', N'user'),
(3, N'Bob Miller (Second Owner)', N'bob@example.com', N'$2b$10$.xzW1fysBinDyTWF/Amy5OgSX92435XIUTLB0QHuvV8qUsvtkCxR6', N'+1-555-0102', N'Seattle', N'user'),
(4, N'Charlie Davis (Third Owner)', N'charlie@example.com', N'$2b$10$.xzW1fysBinDyTWF/Amy5OgSX92435XIUTLB0QHuvV8qUsvtkCxR6', N'+1-555-0103', N'Portland', N'user'),
(5, N'Diana Evans (Buyer/Donor)', N'diana@example.com', N'$2b$10$.xzW1fysBinDyTWF/Amy5OgSX92435XIUTLB0QHuvV8qUsvtkCxR6', N'+1-555-0104', N'Austin', N'user');
SET IDENTITY_INSERT dbo.users OFF;
GO

-- 2. Insert Hierarchical Categories
SET IDENTITY_INSERT dbo.categories ON;
INSERT INTO dbo.categories (category_id, name, parent_category_id) VALUES
(1, N'Electronics', NULL),
(2, N'Computing & Laptops', 1),
(3, N'Smartphones & Tablets', 1),
(4, N'Audio & Video Gear', 1),
(5, N'Photography & Cameras', 1),
(6, N'Vehicles & Mobility', NULL),
(7, N'Electric Bikes & Scooters', 6),
(8, N'Road & Mountain Bicycles', 6),
(9, N'Musical Instruments', NULL),
(10, N'Guitars & Basses', 9),
(11, N'Keyboards & Synthesizers', 9),
(12, N'Watches & Precision Gear', NULL),
(13, N'Mechanical & Luxury Watches', 12);
SET IDENTITY_INSERT dbo.categories OFF;
GO

-- 3. Insert Service Providers
SET IDENTITY_INSERT dbo.service_providers ON;
INSERT INTO dbo.service_providers (provider_id, name, service_type, phone, address, city) VALUES
(1, N'Apple Authorized Care Center', N'Authorized OEM Repair', N'+1-415-555-0199', N'1 Stockton St', N'San Francisco'),
(2, N'Bay Area Precision Tech Repair', N'Independent Specialist', N'+1-415-555-0244', N'742 Mission St', N'San Francisco'),
(3, N'Seattle Green Electronics Clinic', N'Refurbishing & Diagnostics', N'+1-206-555-0388', N'1201 Pike St', N'Seattle'),
(4, N'Northwest Camera & Optics Lab', N'Precision Optical Repair', N'+1-206-555-0722', N'450 Pine St', N'Seattle');
SET IDENTITY_INSERT dbo.service_providers OFF;
GO

-- 4. Insert Known Issues & Causes (Repair Knowledge Base)
SET IDENTITY_INSERT dbo.known_issues ON;
INSERT INTO dbo.known_issues (issue_id, category_id, title, symptoms, severity) VALUES
(1, 2, N'Degraded Battery & Swelling', N'System shuts down under load, reduced battery health, trackpad stiffness', N'High'),
(2, 2, N'Thermal Throttling & Fan Noise', N'CPU clock speed drops, high fan RPM, warm chassis', N'Medium'),
(3, 2, N'Sticky / Unresponsive Keyboard Keys', N'Keys repeat or fail to register, debris beneath scissor switches', N'Medium'),
(4, 5, N'Lens Shutter Mechanism Jam', N'Error 20, shutter curtain fails to open, blackout in optical viewfinder', N'High'),
(5, 7, N'BMS Voltage Imbalance', N'Battery cuts off at 30%, sudden loss of motor assist', N'High');
SET IDENTITY_INSERT dbo.known_issues OFF;
GO

SET IDENTITY_INSERT dbo.issue_causes ON;
INSERT INTO dbo.issue_causes (cause_id, issue_id, cause_description, suggested_fix, difficulty, estimated_cost, needs_professional) VALUES
(1, 1, N'Lithium-ion electrolyte decomposition after exceeding 800 cycles', N'Replace battery assembly with OEM certified cell module', N'Moderate', 199.00, 1),
(2, 2, N'Clogged heat sink exhaust fins and dried thermal interface material (TIM)', N'Clean fin stacks with compressed air and apply Kryonaut thermal compound', N'Easy', 45.00, 0),
(3, 3, N'Dust and micro-debris ingress under keycap scissor mechanism', N'Ultrasonic cleaning or individual keycap hinge replacement', N'Moderate', 60.00, 0),
(4, 4, N'Worn shutter solenoid spring and misaligned curtain guide rail', N'Replace shutter blade curtain unit and recalibrate curtain travel timing', N'Hard', 240.00, 1),
(5, 5, N'Cell group #3 drift due to aged nickel strip solder spot resistance', N'BMS balancing cycle and spot-weld reinforcement on pack terminal', N'Hard', 180.00, 1);
SET IDENTITY_INSERT dbo.issue_causes OFF;
GO

-- 5. Insert Non-Profit / Charity Organizations
SET IDENTITY_INSERT dbo.organizations ON;
INSERT INTO dbo.organizations (organization_id, user_id, name, org_type, registration_no, contact, city) VALUES
(1, 1, N'TechForYouth Education Foundation', N'Non-Profit Charity', N'501C3-982341-CA', N'donations@techforyouth.org', N'San Francisco'),
(2, 1, N'Cascadia Circular Reuse Initiative', N'Community Refurbisher', N'WA-NGO-771249-B', N'contact@cascadiareuse.org', N'Seattle');
SET IDENTITY_INSERT dbo.organizations OFF;
GO

-- 6. Insert the Demo Multi-Owner Item (Apple MacBook Pro 16" M1 Max)
SET IDENTITY_INSERT dbo.items ON;
INSERT INTO dbo.items (
    item_id, category_id, registered_by, current_owner_id, name, brand, model,
    serial_number, description, color, manufacture_year, specifications,
    acquisition_type, previous_owners_count, purchased_from, purchase_date,
    purchase_price, warranty_expiry_date, battery_type, battery_capacity_mah,
    battery_rated_hours, status, created_at
) VALUES (
    1, 2, 2, 4, N'MacBook Pro 16" M1 Max (32GB / 1TB SSD)', N'Apple', N'MacBookPro18,2 (A2485)',
    N'C02G99XZMD6R', N'Flagship professional workstation laptop with Liquid Retina XDR display, 10-core CPU, 32-core GPU, MagSafe 3.',
    N'Space Gray', 2022, N'{"cpu":"Apple M1 Max 10-Core","gpu":"32-Core GPU","ram":"32GB Unified","storage":"1TB NVMe","screen":"16.2-inch Liquid Retina XDR"}',
    N'first_hand', 2, NULL, '2022-01-15', 3499.00, '2023-01-15', N'Lithium-Polymer 100Wh', 8693, 14.0, N'listed', '2022-01-15 10:00:00'
);
SET IDENTITY_INSERT dbo.items OFF;
GO

-- Images for demo item
SET IDENTITY_INSERT dbo.item_images ON;
INSERT INTO dbo.item_images (image_id, item_id, image_url, is_primary, uploaded_at) VALUES
(1, 1, N'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80', 1, '2022-01-15 10:00:00'),
(2, 1, N'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=1000&q=80', 0, '2022-01-15 10:05:00'),
(3, 1, N'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=1000&q=80', 0, '2023-08-10 14:00:00');
SET IDENTITY_INSERT dbo.item_images OFF;
GO

-- Phase 1: 2022-01-15 Alice registers item
SET IDENTITY_INSERT dbo.lifecycle_events ON;
INSERT INTO dbo.lifecycle_events (event_id, item_id, performed_by, event_type, event_date, description) VALUES
(1, 1, 2, N'registration', '2022-01-15 10:00:00', N'Initial registration by original owner Alice Walker. Purchased brand new from Apple Store Union Square.');
SET IDENTITY_INSERT dbo.lifecycle_events OFF;
GO

SET IDENTITY_INSERT dbo.condition_logs ON;
INSERT INTO dbo.condition_logs (condition_id, item_id, event_id, assessed_by, condition_score, condition_grade, battery_health_pct, battery_backup_hours, notes, assessed_at) VALUES
(1, 1, 1, 2, 10, N'Mint', 100, 14.5, N'Brand new in sealed box. Flawless display, zero battery cycles, immaculate chassis.', '2022-01-15 10:00:00');
SET IDENTITY_INSERT dbo.condition_logs OFF;
GO

SET IDENTITY_INSERT dbo.ownership_transfers ON;
INSERT INTO dbo.ownership_transfers (transfer_id, item_id, from_user_id, to_user_id, transfer_type, transfer_date, notes) VALUES
(1, 1, NULL, 2, N'registration', '2022-01-15 10:00:00', N'Original retail acquisition from Apple Store Union Square.');
SET IDENTITY_INSERT dbo.ownership_transfers OFF;
GO

SET IDENTITY_INSERT dbo.ownership_records ON;
INSERT INTO dbo.ownership_records (ownership_id, item_id, owner_id, transfer_id, start_date, end_date) VALUES
(1, 1, 2, 1, '2022-01-15', '2023-08-20');
SET IDENTITY_INSERT dbo.ownership_records OFF;
GO

-- Phase 2: 2023-04-10 Repair logged by Alice
SET IDENTITY_INSERT dbo.lifecycle_events ON;
INSERT INTO dbo.lifecycle_events (event_id, item_id, performed_by, event_type, event_date, description) VALUES
(2, 1, 2, N'repair', '2023-04-10 14:30:00', N'Routine preventive maintenance and thermal exhaust fin cleaning at Apple Authorized Care Center.');
SET IDENTITY_INSERT dbo.lifecycle_events OFF;
GO

SET IDENTITY_INSERT dbo.condition_logs ON;
INSERT INTO dbo.condition_logs (condition_id, item_id, event_id, assessed_by, condition_score, condition_grade, battery_health_pct, battery_backup_hours, notes, assessed_at) VALUES
(2, 1, 2, 2, 9, N'Excellent', 96, 13.8, N'Post-service inspection: thermals restored, keyboard switch tested 100%, minor faint scuff on lower bottom plate.', '2023-04-10 15:00:00');
SET IDENTITY_INSERT dbo.condition_logs OFF;
GO

SET IDENTITY_INSERT dbo.repairs ON;
INSERT INTO dbo.repairs (repair_id, item_id, provider_id, event_id, issue_id, cause_id, repair_date, description, cost, condition_before, condition_after) VALUES
(1, 1, 1, 2, 2, 2, '2023-04-10', N'Comprehensive internal thermal cleaning, new thermal paste applied, full hardware diagnostic pass.', 89.00, 8, 9);
SET IDENTITY_INSERT dbo.repairs OFF;
GO

-- Phase 3: 2023-08-10 Alice lists item for sale
SET IDENTITY_INSERT dbo.listings ON;
INSERT INTO dbo.listings (listing_id, item_id, seller_id, asking_price, listing_date, status, closed_date) VALUES
(1, 1, 2, 2450.00, '2023-08-10', N'sold', '2023-08-20');
SET IDENTITY_INSERT dbo.listings OFF;
GO

-- Phase 4: 2023-08-20 Sale from Alice to Bob Miller
SET IDENTITY_INSERT dbo.lifecycle_events ON;
INSERT INTO dbo.lifecycle_events (event_id, item_id, performed_by, event_type, event_date, description) VALUES
(3, 1, 2, N'sale', '2023-08-20 16:45:00', N'Item sold to Bob Miller for $2,350.00 via verified bank transfer. Ownership transferred.');
SET IDENTITY_INSERT dbo.lifecycle_events OFF;
GO

SET IDENTITY_INSERT dbo.ownership_transfers ON;
INSERT INTO dbo.ownership_transfers (transfer_id, item_id, from_user_id, to_user_id, transfer_type, transfer_date, notes) VALUES
(2, 1, 2, 3, N'sale', '2023-08-20 16:45:00', N'Private party sale between Alice Walker and Bob Miller.');
SET IDENTITY_INSERT dbo.ownership_transfers OFF;
GO

SET IDENTITY_INSERT dbo.sales_transactions ON;
INSERT INTO dbo.sales_transactions (transaction_id, listing_id, buyer_id, transfer_id, sale_price, sale_date, payment_method) VALUES
(1, 1, 3, 2, 2350.00, '2023-08-20', N'Bank Wire / Escrow');
SET IDENTITY_INSERT dbo.sales_transactions OFF;
GO

SET IDENTITY_INSERT dbo.ownership_records ON;
INSERT INTO dbo.ownership_records (ownership_id, item_id, owner_id, transfer_id, start_date, end_date) VALUES
(2, 1, 3, 2, '2023-08-20', '2024-09-12');
SET IDENTITY_INSERT dbo.ownership_records OFF;
GO

SET IDENTITY_INSERT dbo.condition_logs ON;
INSERT INTO dbo.condition_logs (condition_id, item_id, event_id, assessed_by, condition_score, condition_grade, battery_health_pct, battery_backup_hours, notes, assessed_at) VALUES
(3, 1, 3, 3, 9, N'Excellent', 94, 13.0, N'Second owner inspection upon delivery. Screen pristine, hinges firm, complete original packaging included.', '2023-08-20 17:00:00');
SET IDENTITY_INSERT dbo.condition_logs OFF;
GO

-- Phase 5: 2023-11-15 Provenance Verification by Admin
SET IDENTITY_INSERT dbo.provenance_verifications ON;
INSERT INTO dbo.provenance_verifications (verification_id, item_id, verified_by, verification_date, method, status, notes) VALUES
(1, 1, 1, '2023-11-15', N'Original Receipt + OEM Database', N'verified', N'Serial C02G99XZMD6R verified against OEM database; original Apple invoice validated; no activation locks.');
SET IDENTITY_INSERT dbo.provenance_verifications OFF;
GO

SET IDENTITY_INSERT dbo.lifecycle_events ON;
INSERT INTO dbo.lifecycle_events (event_id, item_id, performed_by, event_type, event_date, description) VALUES
(4, 1, 1, N'provenance_check', '2023-11-15 11:20:00', N'Official provenance check performed by Admin Inspector. Certified clean title and genuine hardware.');
SET IDENTITY_INSERT dbo.lifecycle_events OFF;
GO

-- Phase 6: 2024-05-18 Battery replacement logged by Bob
SET IDENTITY_INSERT dbo.lifecycle_events ON;
INSERT INTO dbo.lifecycle_events (event_id, item_id, performed_by, event_type, event_date, description) VALUES
(5, 1, 3, N'repair', '2024-05-18 10:15:00', N'Proactive battery module replacement performed at Seattle Green Electronics Clinic.');
SET IDENTITY_INSERT dbo.lifecycle_events OFF;
GO

SET IDENTITY_INSERT dbo.repairs ON;
INSERT INTO dbo.repairs (repair_id, item_id, provider_id, event_id, issue_id, cause_id, repair_date, description, cost, condition_before, condition_after) VALUES
(2, 1, 3, 5, 1, 1, '2024-05-18', N'Installed brand-new genuine OEM 100Wh battery module and calibrated power management controller.', 210.00, 8, 9);
SET IDENTITY_INSERT dbo.repairs OFF;
GO

SET IDENTITY_INSERT dbo.condition_logs ON;
INSERT INTO dbo.condition_logs (condition_id, item_id, event_id, assessed_by, condition_score, condition_grade, battery_health_pct, battery_backup_hours, notes, assessed_at) VALUES
(4, 1, 5, 3, 9, N'Excellent', 100, 15.0, N'New battery installed. Battery health restored to 100%. Device running cool and quiet.', '2024-05-18 11:00:00');
SET IDENTITY_INSERT dbo.condition_logs OFF;
GO

-- Phase 7: 2024-09-12 Bob lists and sells to Charlie Davis (Third Owner)
SET IDENTITY_INSERT dbo.listings ON;
INSERT INTO dbo.listings (listing_id, item_id, seller_id, asking_price, listing_date, status, closed_date) VALUES
(2, 1, 3, 1950.00, '2024-09-01', N'sold', '2024-09-12');
SET IDENTITY_INSERT dbo.listings OFF;
GO

SET IDENTITY_INSERT dbo.lifecycle_events ON;
INSERT INTO dbo.lifecycle_events (event_id, item_id, performed_by, event_type, event_date, description) VALUES
(6, 1, 3, N'sale', '2024-09-12 15:30:00', N'Item sold to Charlie Davis for $1,850.00. Transferred with fresh battery and all maintenance paperwork.');
SET IDENTITY_INSERT dbo.lifecycle_events OFF;
GO

SET IDENTITY_INSERT dbo.ownership_transfers ON;
INSERT INTO dbo.ownership_transfers (transfer_id, item_id, from_user_id, to_user_id, transfer_type, transfer_date, notes) VALUES
(3, 1, 3, 4, N'sale', '2024-09-12 15:30:00', N'Second resale in lifecycle history. Bob Miller to Charlie Davis.');
SET IDENTITY_INSERT dbo.ownership_transfers OFF;
GO

SET IDENTITY_INSERT dbo.sales_transactions ON;
INSERT INTO dbo.sales_transactions (transaction_id, listing_id, buyer_id, transfer_id, sale_price, sale_date, payment_method) VALUES
(2, 2, 4, 3, 1850.00, '2024-09-12', N'Direct Transfer');
SET IDENTITY_INSERT dbo.sales_transactions OFF;
GO

SET IDENTITY_INSERT dbo.ownership_records ON;
INSERT INTO dbo.ownership_records (ownership_id, item_id, owner_id, transfer_id, start_date, end_date) VALUES
(3, 1, 4, 3, '2024-09-12', NULL);
SET IDENTITY_INSERT dbo.ownership_records OFF;
GO

SET IDENTITY_INSERT dbo.condition_logs ON;
INSERT INTO dbo.condition_logs (condition_id, item_id, event_id, assessed_by, condition_score, condition_grade, battery_health_pct, battery_backup_hours, notes, assessed_at) VALUES
(5, 1, 6, 4, 8, N'Good', 98, 14.2, N'Third owner receiving check. Minimal desk friction mark on bottom case, screen flawless.', '2024-09-12 16:00:00');
SET IDENTITY_INSERT dbo.condition_logs OFF;
GO

-- Phase 8: Charlie Davis currently lists it for sale
SET IDENTITY_INSERT dbo.listings ON;
INSERT INTO dbo.listings (listing_id, item_id, seller_id, asking_price, listing_date, status, closed_date) VALUES
(3, 1, 4, 1650.00, '2026-03-01', N'active', NULL);
SET IDENTITY_INSERT dbo.listings OFF;
GO

SET IDENTITY_INSERT dbo.lifecycle_events ON;
INSERT INTO dbo.lifecycle_events (event_id, item_id, performed_by, event_type, event_date, description) VALUES
(7, 1, 4, N'listing', '2026-03-01 09:00:00', N'Listed for sale on Second-Hand Lifecycle Marketplace by Charlie Davis for $1,650.00.');
SET IDENTITY_INSERT dbo.lifecycle_events OFF;
GO

-- Second Demo Item: Leica M10 Rangefinder
SET IDENTITY_INSERT dbo.items ON;
INSERT INTO dbo.items (
    item_id, category_id, registered_by, current_owner_id, name, brand, model,
    serial_number, description, color, manufacture_year, specifications,
    acquisition_type, previous_owners_count, purchased_from, purchase_date,
    purchase_price, warranty_expiry_date, battery_type, battery_capacity_mah,
    battery_rated_hours, status, created_at
) VALUES (
    2, 5, 5, 5, N'Leica M10 Digital Rangefinder Camera', N'Leica', N'M10 (Typ 3656)',
    N'LCM10-539281', N'Iconic 24MP Full-Frame digital rangefinder camera with optical rangefinder viewfinder and Leica M-mount.',
    N'Black Chrome', 2018, N'{"sensor":"24MP Full-Frame CMOS","iso":"100-50,000","viewfinder":"0.73x Optical Rangefinder","mount":"Leica M"}',
    N'first_hand', 0, NULL, '2019-06-20', 6595.00, '2021-06-20', N'BP-SCL5 Li-ion', 1100, 5.0, N'active', '2019-06-20 12:00:00'
);
SET IDENTITY_INSERT dbo.items OFF;
GO

SET IDENTITY_INSERT dbo.item_images ON;
INSERT INTO dbo.item_images (image_id, item_id, image_url, is_primary, uploaded_at) VALUES
(4, 2, N'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=80', 1, '2019-06-20 12:00:00');
SET IDENTITY_INSERT dbo.item_images OFF;
GO

SET IDENTITY_INSERT dbo.lifecycle_events ON;
INSERT INTO dbo.lifecycle_events (event_id, item_id, performed_by, event_type, event_date, description) VALUES
(8, 2, 5, N'registration', '2019-06-20 12:00:00', N'Registered by Diana Evans. Acquired from Leica Store San Francisco.');
SET IDENTITY_INSERT dbo.lifecycle_events OFF;
GO

SET IDENTITY_INSERT dbo.condition_logs ON;
INSERT INTO dbo.condition_logs (condition_id, item_id, event_id, assessed_by, condition_score, condition_grade, battery_health_pct, battery_backup_hours, notes, assessed_at) VALUES
(6, 2, 8, 5, 10, N'Mint', 100, 5.0, N'Collector-grade condition with original box and papers.', '2019-06-20 12:30:00');
SET IDENTITY_INSERT dbo.condition_logs OFF;
GO

SET IDENTITY_INSERT dbo.ownership_transfers ON;
INSERT INTO dbo.ownership_transfers (transfer_id, item_id, from_user_id, to_user_id, transfer_type, transfer_date, notes) VALUES
(4, 2, NULL, 5, N'registration', '2019-06-20 12:00:00', N'Initial purchase from Leica Store.');
SET IDENTITY_INSERT dbo.ownership_transfers OFF;
GO

SET IDENTITY_INSERT dbo.ownership_records ON;
INSERT INTO dbo.ownership_records (ownership_id, item_id, owner_id, transfer_id, start_date, end_date) VALUES
(4, 2, 5, 4, '2019-06-20', NULL);
SET IDENTITY_INSERT dbo.ownership_records OFF;
GO

SET IDENTITY_INSERT dbo.provenance_verifications ON;
INSERT INTO dbo.provenance_verifications (verification_id, item_id, verified_by, verification_date, method, status, notes) VALUES
(2, 2, 1, '2020-01-10', N'Serial Check + Certificate', N'verified', N'Rangefinder alignment verified, serial matched with Leica Wetzlar factory register.');
SET IDENTITY_INSERT dbo.provenance_verifications OFF;
GO

SET IDENTITY_INSERT dbo.lifecycle_events ON;
INSERT INTO dbo.lifecycle_events (event_id, item_id, performed_by, event_type, event_date, description) VALUES
(9, 2, 1, N'provenance_check', '2020-01-10 14:00:00', N'Certified provenance verification by Admin Inspector.');
SET IDENTITY_INSERT dbo.lifecycle_events OFF;
GO

-- Re-enable constraints and triggers
EXEC sp_msforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all';
GO
ENABLE TRIGGER ALL ON dbo.lifecycle_events;
ENABLE TRIGGER ALL ON dbo.condition_logs;
ENABLE TRIGGER ALL ON dbo.provenance_verifications;
ENABLE TRIGGER ALL ON dbo.repairs;
ENABLE TRIGGER ALL ON dbo.ownership_transfers;
GO
