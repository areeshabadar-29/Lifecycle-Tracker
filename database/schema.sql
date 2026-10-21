-- Second-Hand Lifecycle Tracker (Carfax for Everyday Items)
-- Complete MySQL 8 Database Schema Definition

CREATE DATABASE IF NOT EXISTS lifecycle_tracker;
USE lifecycle_tracker;

-- 1. Users Table (Core)
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    city VARCHAR(80),
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Categories Table (Core, Hierarchical)
CREATE TABLE IF NOT EXISTS categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    parent_category_id INT NULL,
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_category_id) 
        REFERENCES categories(category_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Items Table (Core)
CREATE TABLE IF NOT EXISTS items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    registered_by INT NOT NULL,
    current_owner_id INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    brand VARCHAR(60) NOT NULL,
    model VARCHAR(60) NOT NULL,
    serial_number VARCHAR(80) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(30),
    manufacture_year INT,
    specifications TEXT,
    acquisition_type VARCHAR(20) NOT NULL DEFAULT 'first_hand',
    previous_owners_count SMALLINT DEFAULT 0,
    purchased_from INT NULL,
    purchase_date DATE NULL,
    purchase_price DECIMAL(10,2) NULL,
    warranty_expiry_date DATE NULL,
    battery_type VARCHAR(40) NULL,
    battery_capacity_mah INT NULL,
    battery_rated_hours DECIMAL(5,2) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_items_category FOREIGN KEY (category_id) REFERENCES categories(category_id),
    CONSTRAINT fk_items_registered_by FOREIGN KEY (registered_by) REFERENCES users(user_id),
    CONSTRAINT fk_items_current_owner FOREIGN KEY (current_owner_id) REFERENCES users(user_id),
    CONSTRAINT fk_items_purchased_from FOREIGN KEY (purchased_from) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Item Images Table (Core)
CREATE TABLE IF NOT EXISTS item_images (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_item_images_item FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Lifecycle Events Table (Lifecycle and Ownership)
CREATE TABLE IF NOT EXISTS lifecycle_events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    performed_by INT NOT NULL,
    event_type VARCHAR(30) NOT NULL,
    event_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    CONSTRAINT fk_lifecycle_events_item FOREIGN KEY (item_id) REFERENCES items(item_id),
    CONSTRAINT fk_lifecycle_events_user FOREIGN KEY (performed_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Condition Logs Table (Lifecycle and Ownership)
CREATE TABLE IF NOT EXISTS condition_logs (
    condition_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    event_id INT NOT NULL,
    assessed_by INT NOT NULL,
    condition_score SMALLINT NOT NULL,
    condition_grade VARCHAR(10) NOT NULL,
    battery_health_pct SMALLINT NULL,
    battery_backup_hours DECIMAL(5,2) NULL,
    notes TEXT,
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_condition_logs_item FOREIGN KEY (item_id) REFERENCES items(item_id),
    CONSTRAINT fk_condition_logs_event FOREIGN KEY (event_id) REFERENCES lifecycle_events(event_id),
    CONSTRAINT fk_condition_logs_assessed_by FOREIGN KEY (assessed_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Ownership Transfers Table (Lifecycle and Ownership)
CREATE TABLE IF NOT EXISTS ownership_transfers (
    transfer_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    from_user_id INT NULL,
    to_user_id INT NOT NULL,
    transfer_type VARCHAR(20) NOT NULL,
    transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    CONSTRAINT fk_transfers_item FOREIGN KEY (item_id) REFERENCES items(item_id),
    CONSTRAINT fk_transfers_from_user FOREIGN KEY (from_user_id) REFERENCES users(user_id),
    CONSTRAINT fk_transfers_to_user FOREIGN KEY (to_user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Ownership Records Table (Lifecycle and Ownership)
CREATE TABLE IF NOT EXISTS ownership_records (
    ownership_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    owner_id INT NOT NULL,
    transfer_id INT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    CONSTRAINT fk_ownership_records_item FOREIGN KEY (item_id) REFERENCES items(item_id),
    CONSTRAINT fk_ownership_records_owner FOREIGN KEY (owner_id) REFERENCES users(user_id),
    CONSTRAINT fk_ownership_records_transfer FOREIGN KEY (transfer_id) REFERENCES ownership_transfers(transfer_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Organizations Table (Repair, Resale and Donation)
CREATE TABLE IF NOT EXISTS organizations (
    organization_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    org_type VARCHAR(30) NOT NULL,
    registration_no VARCHAR(60),
    contact VARCHAR(60),
    city VARCHAR(80),
    CONSTRAINT fk_organizations_user FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Listings Table (Repair, Resale and Donation)
CREATE TABLE IF NOT EXISTS listings (
    listing_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    seller_id INT NOT NULL,
    asking_price DECIMAL(10,2) NOT NULL,
    listing_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    closed_date DATE NULL,
    CONSTRAINT fk_listings_item FOREIGN KEY (item_id) REFERENCES items(item_id),
    CONSTRAINT fk_listings_seller FOREIGN KEY (seller_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Sales Transactions Table (Repair, Resale and Donation)
CREATE TABLE IF NOT EXISTS sales_transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    listing_id INT NOT NULL,
    buyer_id INT NOT NULL,
    transfer_id INT NOT NULL,
    sale_price DECIMAL(10,2) NOT NULL,
    sale_date DATE NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    CONSTRAINT fk_sales_listing FOREIGN KEY (listing_id) REFERENCES listings(listing_id),
    CONSTRAINT fk_sales_buyer FOREIGN KEY (buyer_id) REFERENCES users(user_id),
    CONSTRAINT fk_sales_transfer FOREIGN KEY (transfer_id) REFERENCES ownership_transfers(transfer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Donations Table (Repair, Resale and Donation)
CREATE TABLE IF NOT EXISTS donations (
    donation_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    donor_id INT NOT NULL,
    organization_id INT NOT NULL,
    transfer_id INT NOT NULL,
    reward_id INT NULL,
    donation_date DATE NOT NULL,
    notes TEXT,
    CONSTRAINT fk_donations_item FOREIGN KEY (item_id) REFERENCES items(item_id),
    CONSTRAINT fk_donations_donor FOREIGN KEY (donor_id) REFERENCES users(user_id),
    CONSTRAINT fk_donations_org FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    CONSTRAINT fk_donations_transfer FOREIGN KEY (transfer_id) REFERENCES ownership_transfers(transfer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Provenance Verifications Table (Provenance)
CREATE TABLE IF NOT EXISTS provenance_verifications (
    verification_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    verified_by INT NOT NULL,
    verification_date DATE NOT NULL,
    method VARCHAR(40) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'verified',
    notes TEXT,
    CONSTRAINT fk_verifications_item FOREIGN KEY (item_id) REFERENCES items(item_id),
    CONSTRAINT fk_verifications_user FOREIGN KEY (verified_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Service Providers Table (Repair, Resale and Donation)
CREATE TABLE IF NOT EXISTS service_providers (
    provider_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    phone VARCHAR(30),
    address VARCHAR(150),
    city VARCHAR(80)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Known Issues Table (Repair Knowledge Base)
CREATE TABLE IF NOT EXISTS known_issues (
    issue_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    symptoms TEXT,
    severity VARCHAR(20) NOT NULL,
    CONSTRAINT fk_known_issues_category FOREIGN KEY (category_id) REFERENCES categories(category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Issue Causes Table (Repair Knowledge Base)
CREATE TABLE IF NOT EXISTS issue_causes (
    cause_id INT AUTO_INCREMENT PRIMARY KEY,
    issue_id INT NOT NULL,
    cause_description TEXT NOT NULL,
    suggested_fix TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    estimated_cost DECIMAL(10,2) NULL,
    needs_professional BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_issue_causes_issue FOREIGN KEY (issue_id) REFERENCES known_issues(issue_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Repairs Table (Repair, Resale and Donation)
CREATE TABLE IF NOT EXISTS repairs (
    repair_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    provider_id INT NOT NULL,
    event_id INT NOT NULL,
    issue_id INT NULL,
    cause_id INT NULL,
    repair_date DATE NOT NULL,
    description TEXT NOT NULL,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    condition_before SMALLINT NOT NULL,
    condition_after SMALLINT NOT NULL,
    CONSTRAINT fk_repairs_item FOREIGN KEY (item_id) REFERENCES items(item_id),
    CONSTRAINT fk_repairs_provider FOREIGN KEY (provider_id) REFERENCES service_providers(provider_id),
    CONSTRAINT fk_repairs_event FOREIGN KEY (event_id) REFERENCES lifecycle_events(event_id),
    CONSTRAINT fk_repairs_issue FOREIGN KEY (issue_id) REFERENCES known_issues(issue_id) ON DELETE SET NULL,
    CONSTRAINT fk_repairs_cause FOREIGN KEY (cause_id) REFERENCES issue_causes(cause_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Performance Indexes
CREATE INDEX idx_items_serial ON items(serial_number);
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_owner ON items(current_owner_id);
CREATE INDEX idx_lifecycle_item_date ON lifecycle_events(item_id, event_date);
CREATE INDEX idx_condition_item_date ON condition_logs(item_id, assessed_at);
CREATE INDEX idx_ownership_item_date ON ownership_records(item_id, start_date);
CREATE INDEX idx_listings_status ON listings(status);
