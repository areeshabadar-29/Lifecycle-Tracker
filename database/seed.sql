-- Seed Data Script for Second-Hand Lifecycle Tracker
-- Contains demo users, categories, organizations, service providers, known issues & causes,
-- and one rich demo item with multiple owners, repairs, sales, and provenance verification.

USE lifecycle_tracker;

-- Disable foreign key checks for clean seeding
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE repairs;
TRUNCATE TABLE issue_causes;
TRUNCATE TABLE known_issues;
TRUNCATE TABLE service_providers;
TRUNCATE TABLE provenance_verifications;
TRUNCATE TABLE donations;
TRUNCATE TABLE sales_transactions;
TRUNCATE TABLE listings;
TRUNCATE TABLE organizations;
TRUNCATE TABLE ownership_records;
TRUNCATE TABLE ownership_transfers;
TRUNCATE TABLE condition_logs;
TRUNCATE TABLE lifecycle_events;
TRUNCATE TABLE item_images;
TRUNCATE TABLE items;
TRUNCATE TABLE categories;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Insert Users (password for all demo accounts: 'password123' -> bcrypt hash)
-- Hash generated with bcryptjs 10 rounds for 'password123':
-- $2a$10$7qB2J3rF9g4d6p1d7s9Oze0m.vEklM3v1v7mG1YwF78FzB6p3L4jW (or standard valid bcrypt hash)
INSERT INTO users (user_id, full_name, email, password_hash, phone, city, role) VALUES
(1, 'Admin Inspector', 'admin@lifecycle.com', '$2b$10$.xzW1fysBinDyTWF/Amy5OgSX92435XIUTLB0QHuvV8qUsvtkCxR6', '+1-555-0100', 'San Francisco', 'admin'),
(2, 'Alice Walker (First Owner)', 'alice@example.com', '$2b$10$.xzW1fysBinDyTWF/Amy5OgSX92435XIUTLB0QHuvV8qUsvtkCxR6', '+1-555-0101', 'San Francisco', 'user'),
(3, 'Bob Miller (Second Owner)', 'bob@example.com', '$2b$10$.xzW1fysBinDyTWF/Amy5OgSX92435XIUTLB0QHuvV8qUsvtkCxR6', '+1-555-0102', 'Seattle', 'user'),
(4, 'Charlie Davis (Third Owner)', 'charlie@example.com', '$2b$10$.xzW1fysBinDyTWF/Amy5OgSX92435XIUTLB0QHuvV8qUsvtkCxR6', '+1-555-0103', 'Portland', 'user'),
(5, 'Diana Evans (Buyer/Donor)', 'diana@example.com', '$2b$10$.xzW1fysBinDyTWF/Amy5OgSX92435XIUTLB0QHuvV8qUsvtkCxR6', '+1-555-0104', 'Austin', 'user');

-- 2. Insert Hierarchical Categories
INSERT INTO categories (category_id, name, parent_category_id) VALUES
(1, 'Electronics', NULL),
(2, 'Computing & Laptops', 1),
(3, 'Smartphones & Tablets', 1),
(4, 'Audio & Video Gear', 1),
(5, 'Photography & Cameras', 1),
(6, 'Vehicles & Mobility', NULL),
(7, 'Electric Bikes & Scooters', 6),
(8, 'Road & Mountain Bicycles', 6),
(9, 'Musical Instruments', NULL),
(10, 'Guitars & Basses', 9),
(11, 'Keyboards & Synthesizers', 9),
(12, 'Watches & Precision Gear', NULL),
(13, 'Mechanical & Luxury Watches', 12);

-- 3. Insert Service Providers
INSERT INTO service_providers (provider_id, name, service_type, phone, address, city) VALUES
(1, 'Apple Authorized Care Center', 'Authorized OEM Repair', '+1-415-555-0199', '1 Stockton St', 'San Francisco'),
(2, 'Bay Area Precision Tech Repair', 'Independent Specialist', '+1-415-555-0244', '742 Mission St', 'San Francisco'),
(3, 'Seattle Green Electronics Clinic', 'Refurbishing & Diagnostics', '+1-206-555-0388', '1201 Pike St', 'Seattle'),
(4, 'Northwest Camera & Optics Lab', 'Precision Optical Repair', '+1-206-555-0722', '450 Pine St', 'Seattle');

-- 4. Insert Known Issues & Causes (Repair Knowledge Base)
INSERT INTO known_issues (issue_id, category_id, title, symptoms, severity) VALUES
(1, 2, 'Degraded Battery & Swelling', 'System shuts down under load, reduced battery health, trackpad stiffness', 'High'),
(2, 2, 'Thermal Throttling & Fan Noise', 'CPU clock speed drops, high fan RPM, warm chassis', 'Medium'),
(3, 2, 'Sticky / Unresponsive Keyboard Keys', 'Keys repeat or fail to register, debris beneath scissor switches', 'Medium'),
(4, 5, 'Lens Shutter Mechanism Jam', 'Error 20, shutter curtain fails to open, blackout in optical viewfinder', 'High'),
(5, 7, 'BMS Voltage Imbalance', 'Battery cuts off at 30%, sudden loss of motor assist', 'High');

INSERT INTO issue_causes (cause_id, issue_id, cause_description, suggested_fix, difficulty, estimated_cost, needs_professional) VALUES
(1, 1, 'Lithium-ion electrolyte decomposition after exceeding 800 cycles', 'Replace battery assembly with OEM certified cell module', 'Moderate', 199.00, 1),
(2, 2, 'Clogged heat sink exhaust fins and dried thermal interface material (TIM)', 'Clean fin stacks with compressed air and apply Kryonaut thermal compound', 'Easy', 45.00, 0),
(3, 3, 'Dust and micro-debris ingress under keycap scissor mechanism', 'Ultrasonic cleaning or individual keycap hinge replacement', 'Moderate', 60.00, 0),
(4, 4, 'Worn shutter solenoid spring and misaligned curtain guide rail', 'Replace shutter blade curtain unit and recalibrate curtain travel timing', 'Hard', 240.00, 1),
(5, 5, 'Cell group #3 drift due to aged nickel strip solder spot resistance', 'BMS balancing cycle and spot-weld reinforcement on pack terminal', 'Hard', 180.00, 1);

-- 5. Insert Non-Profit / Charity Organizations
INSERT INTO organizations (organization_id, user_id, name, org_type, registration_no, contact, city) VALUES
(1, 1, 'TechForYouth Education Foundation', 'Non-Profit Charity', '501C3-982341-CA', 'donations@techforyouth.org', 'San Francisco'),
(2, 1, 'Cascadia Circular Reuse Initiative', 'Community Refurbisher', 'WA-NGO-771249-B', 'contact@cascadiareuse.org', 'Seattle');

-- 6. Insert the Demo Multi-Owner Item:
-- "Apple MacBook Pro 16-inch M1 Max (Space Gray, 32GB RAM, 1TB SSD)"
-- Registered by Alice Walker -> Sold to Bob Miller -> Sold to Charlie Davis
INSERT INTO items (
    item_id, category_id, registered_by, current_owner_id, name, brand, model,
    serial_number, description, color, manufacture_year, specifications,
    acquisition_type, previous_owners_count, purchased_from, purchase_date,
    purchase_price, warranty_expiry_date, battery_type, battery_capacity_mah,
    battery_rated_hours, status, created_at
) VALUES (
    1, 2, 2, 4, 'MacBook Pro 16" M1 Max (32GB / 1TB SSD)', 'Apple', 'MacBookPro18,2 (A2485)',
    'C02G99XZMD6R', 'Flagship professional workstation laptop with Liquid Retina XDR display, 10-core CPU, 32-core GPU, MagSafe 3.',
    'Space Gray', 2022, '{"cpu":"Apple M1 Max 10-Core","gpu":"32-Core GPU","ram":"32GB Unified","storage":"1TB NVMe","screen":"16.2-inch Liquid Retina XDR (3456x2234, 120Hz ProMotion)"}',
    'first_hand', 2, NULL, '2022-01-15', 3499.00, '2023-01-15', 'Lithium-Polymer 100Wh', 8693, 14.0, 'listed', '2022-01-15 10:00:00'
);

-- Images for the demo item
INSERT INTO item_images (image_id, item_id, image_url, is_primary, uploaded_at) VALUES
(1, 1, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80', 1, '2022-01-15 10:00:00'),
(2, 1, 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=1000&q=80', 0, '2022-01-15 10:05:00'),
(3, 1, 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=1000&q=80', 0, '2023-08-10 14:00:00');

-- LIFECYCLE HISTORY FOR DEMO ITEM:
-- Phase 1: 2022-01-15 Alice buys new, registers item
INSERT INTO lifecycle_events (event_id, item_id, performed_by, event_type, event_date, description) VALUES
(1, 1, 2, 'registration', '2022-01-15 10:00:00', 'Initial registration by original owner Alice Walker. Purchased brand new from Apple Store Union Square.');

INSERT INTO condition_logs (condition_id, item_id, event_id, assessed_by, condition_score, condition_grade, battery_health_pct, battery_backup_hours, notes, assessed_at) VALUES
(1, 1, 1, 2, 10, 'Mint', 100, 14.5, 'Brand new in sealed box. Flawless display, zero battery cycles, immaculate chassis.', '2022-01-15 10:00:00');

INSERT INTO ownership_transfers (transfer_id, item_id, from_user_id, to_user_id, transfer_type, transfer_date, notes) VALUES
(1, 1, NULL, 2, 'registration', '2022-01-15 10:00:00', 'Original retail acquisition from Apple Store Union Square.');

INSERT INTO ownership_records (ownership_id, item_id, owner_id, transfer_id, start_date, end_date) VALUES
(1, 1, 2, 1, '2022-01-15', '2023-08-20');

-- Phase 2: 2023-04-10 Repair logged by Alice
INSERT INTO lifecycle_events (event_id, item_id, performed_by, event_type, event_date, description) VALUES
(2, 1, 2, 'repair', '2023-04-10 14:30:00', 'Routine preventive maintenance and thermal exhaust fin cleaning at Apple Authorized Care Center.');

INSERT INTO condition_logs (condition_id, item_id, event_id, assessed_by, condition_score, condition_grade, battery_health_pct, battery_backup_hours, notes, assessed_at) VALUES
(2, 1, 2, 2, 9, 'Excellent', 96, 13.8, 'Post-service inspection: thermals restored, keyboard switch tested 100%, minor faint scuff on lower bottom plate.', '2023-04-10 15:00:00');

INSERT INTO repairs (repair_id, item_id, provider_id, event_id, issue_id, cause_id, repair_date, description, cost, condition_before, condition_after) VALUES
(1, 1, 1, 2, 2, 2, '2023-04-10', 'Comprehensive internal thermal cleaning, new thermal paste applied, full hardware diagnostic pass.', 89.00, 8, 9);

-- Phase 3: 2023-08-10 Alice lists item for sale
INSERT INTO listings (listing_id, item_id, seller_id, asking_price, listing_date, status, closed_date) VALUES
(1, 1, 2, 2450.00, '2023-08-10', 'sold', '2023-08-20');

-- Phase 4: 2023-08-20 Sale from Alice to Bob Miller
INSERT INTO lifecycle_events (event_id, item_id, performed_by, event_type, event_date, description) VALUES
(3, 1, 2, 'sale', '2023-08-20 16:45:00', 'Item sold to Bob Miller for $2,350.00 via verified bank transfer. Ownership transferred.');

INSERT INTO ownership_transfers (transfer_id, item_id, from_user_id, to_user_id, transfer_type, transfer_date, notes) VALUES
(2, 1, 2, 3, 'sale', '2023-08-20 16:45:00', 'Private party sale between Alice Walker and Bob Miller.');

INSERT INTO sales_transactions (transaction_id, listing_id, buyer_id, transfer_id, sale_price, sale_date, payment_method) VALUES
(1, 1, 3, 2, 2350.00, '2023-08-20', 'Bank Wire / Escrow');

INSERT INTO ownership_records (ownership_id, item_id, owner_id, transfer_id, start_date, end_date) VALUES
(2, 1, 3, 2, '2023-08-20', '2024-09-12');

INSERT INTO condition_logs (condition_id, item_id, event_id, assessed_by, condition_score, condition_grade, battery_health_pct, battery_backup_hours, notes, assessed_at) VALUES
(3, 1, 3, 3, 9, 'Excellent', 94, 13.0, 'Second owner inspection upon delivery. Screen pristine, hinges firm, complete original packaging included.', '2023-08-20 17:00:00');

-- Phase 5: 2023-11-15 Provenance Verification by Admin
INSERT INTO provenance_verifications (verification_id, item_id, verified_by, verification_date, method, status, notes) VALUES
(1, 1, 1, '2023-11-15', 'Original Receipt + OEM Database', 'verified', 'Serial C02G99XZMD6R verified against OEM database; original Apple invoice validated; no activation locks.');

INSERT INTO lifecycle_events (event_id, item_id, performed_by, event_type, event_date, description) VALUES
(4, 1, 1, 'provenance_check', '2023-11-15 11:20:00', 'Official provenance check performed by Admin Inspector. Certified clean title and genuine hardware.');

-- Phase 6: 2024-05-18 Battery replacement logged by Bob
INSERT INTO lifecycle_events (event_id, item_id, performed_by, event_type, event_date, description) VALUES
(5, 1, 3, 'repair', '2024-05-18 10:15:00', 'Proactive battery module replacement performed at Seattle Green Electronics Clinic.');

INSERT INTO repairs (repair_id, item_id, provider_id, event_id, issue_id, cause_id, repair_date, description, cost, condition_before, condition_after) VALUES
(2, 1, 3, 5, 1, 1, '2024-05-18', 'Installed brand-new genuine OEM 100Wh battery module and calibrated power management controller.', 210.00, 8, 9);

INSERT INTO condition_logs (condition_id, item_id, event_id, assessed_by, condition_score, condition_grade, battery_health_pct, battery_backup_hours, notes, assessed_at) VALUES
(4, 1, 5, 3, 9, 'Excellent', 100, 15.0, 'New battery installed. Battery health restored to 100%. Device running cool and quiet.', '2024-05-18 11:00:00');

-- Phase 7: 2024-09-12 Bob lists and sells to Charlie Davis (Third Owner)
INSERT INTO listings (listing_id, item_id, seller_id, asking_price, listing_date, status, closed_date) VALUES
(2, 1, 3, 1950.00, '2024-09-01', 'sold', '2024-09-12');

INSERT INTO lifecycle_events (event_id, item_id, performed_by, event_type, event_date, description) VALUES
(6, 1, 3, 'sale', '2024-09-12 15:30:00', 'Item sold to Charlie Davis for $1,850.00. Transferred with fresh battery and all maintenance paperwork.');

INSERT INTO ownership_transfers (transfer_id, item_id, from_user_id, to_user_id, transfer_type, transfer_date, notes) VALUES
(3, 1, 3, 4, 'sale', '2024-09-12 15:30:00', 'Second resale in lifecycle history. Bob Miller to Charlie Davis.');

INSERT INTO sales_transactions (transaction_id, listing_id, buyer_id, transfer_id, sale_price, sale_date, payment_method) VALUES
(2, 2, 4, 3, 1850.00, '2024-09-12', 'Direct Transfer');

INSERT INTO ownership_records (ownership_id, item_id, owner_id, transfer_id, start_date, end_date) VALUES
(3, 1, 4, 3, '2024-09-12', NULL);

INSERT INTO condition_logs (condition_id, item_id, event_id, assessed_by, condition_score, condition_grade, battery_health_pct, battery_backup_hours, notes, assessed_at) VALUES
(5, 1, 6, 4, 8, 'Good', 98, 14.2, 'Third owner receiving check. Minimal desk friction mark on bottom case, screen flawless.', '2024-09-12 16:00:00');

-- Phase 8: Charlie Davis currently lists it for sale
INSERT INTO listings (listing_id, item_id, seller_id, asking_price, listing_date, status, closed_date) VALUES
(3, 1, 4, 1650.00, '2026-03-01', 'active', NULL);

INSERT INTO lifecycle_events (event_id, item_id, performed_by, event_type, event_date, description) VALUES
(7, 1, 4, 'listing', '2026-03-01 09:00:00', 'Listed for sale on Second-Hand Lifecycle Marketplace by Charlie Davis for $1,650.00.');

-- Add a second demo item: Leica M10 Rangefinder Camera (to showcase photography category and donation feature)
INSERT INTO items (
    item_id, category_id, registered_by, current_owner_id, name, brand, model,
    serial_number, description, color, manufacture_year, specifications,
    acquisition_type, previous_owners_count, purchased_from, purchase_date,
    purchase_price, warranty_expiry_date, battery_type, battery_capacity_mah,
    battery_rated_hours, status, created_at
) VALUES (
    2, 5, 5, 5, 'Leica M10 Digital Rangefinder Camera', 'Leica', 'M10 (Typ 3656)',
    'LCM10-539281', 'Iconic 24MP Full-Frame digital rangefinder camera with optical rangefinder viewfinder and Leica M-mount.',
    'Black Chrome', 2018, '{"sensor":"24MP Full-Frame CMOS","iso":"100-50,000","viewfinder":"0.73x Optical Rangefinder","mount":"Leica M"}',
    'first_hand', 0, NULL, '2019-06-20', 6595.00, '2021-06-20', 'BP-SCL5 Li-ion', 1100, 5.0, 'active', '2019-06-20 12:00:00'
);

INSERT INTO item_images (image_id, item_id, image_url, is_primary, uploaded_at) VALUES
(4, 2, 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=80', 1, '2019-06-20 12:00:00');

INSERT INTO lifecycle_events (event_id, item_id, performed_by, event_type, event_date, description) VALUES
(8, 2, 5, 'registration', '2019-06-20 12:00:00', 'Registered by Diana Evans. Acquired from Leica Store San Francisco.');

INSERT INTO condition_logs (condition_id, item_id, event_id, assessed_by, condition_score, condition_grade, battery_health_pct, battery_backup_hours, notes, assessed_at) VALUES
(6, 2, 8, 5, 10, 'Mint', 100, 5.0, 'Collector-grade condition with original box and papers.', '2019-06-20 12:30:00');

INSERT INTO ownership_transfers (transfer_id, item_id, from_user_id, to_user_id, transfer_type, transfer_date, notes) VALUES
(4, 2, NULL, 5, 'registration', '2019-06-20 12:00:00', 'Initial purchase from Leica Store.');

INSERT INTO ownership_records (ownership_id, item_id, owner_id, transfer_id, start_date, end_date) VALUES
(4, 2, 5, 4, '2019-06-20', NULL);

INSERT INTO provenance_verifications (verification_id, item_id, verified_by, verification_date, method, status, notes) VALUES
(2, 2, 1, '2020-01-10', 'Serial Check + Certificate', 'verified', 'Rangefinder alignment verified, serial matched with Leica Wetzlar factory register.');

INSERT INTO lifecycle_events (event_id, item_id, performed_by, event_type, event_date, description) VALUES
(9, 2, 1, 'provenance_check', '2020-01-10 14:00:00', 'Certified provenance verification by Admin Inspector.');
