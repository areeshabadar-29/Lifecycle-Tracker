-- ============================================================================
-- Second-Hand Lifecycle Tracker (Carfax for Everyday Items)
-- Microsoft SQL Server (T-SQL) Database Schema Definition
-- ============================================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'lifecycle_tracker')
BEGIN
    CREATE DATABASE [lifecycle_tracker];
END
GO

USE [lifecycle_tracker];
GO

-- 1. Users Table (Core)
IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.users (
        user_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        full_name NVARCHAR(100) NOT NULL,
        email NVARCHAR(150) NOT NULL,
        password_hash NVARCHAR(255) NOT NULL,
        phone NVARCHAR(30) NULL,
        city NVARCHAR(80) NULL,
        role NVARCHAR(20) NOT NULL CONSTRAINT df_users_role DEFAULT 'user',
        created_at DATETIME2 NOT NULL CONSTRAINT df_users_created DEFAULT GETDATE(),
        CONSTRAINT chk_users_role CHECK (role IN ('user', 'admin'))
    );
END
GO

-- Filtered unique index on users.email
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'ux_users_email' AND object_id = OBJECT_ID(N'dbo.users'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX ux_users_email 
    ON dbo.users(email) 
    WHERE email IS NOT NULL;
END
GO

-- 2. Categories Table (Core, Hierarchical)
IF OBJECT_ID(N'dbo.categories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.categories (
        category_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        name NVARCHAR(50) NOT NULL,
        parent_category_id INT NULL,
        CONSTRAINT fk_categories_parent FOREIGN KEY (parent_category_id) 
            REFERENCES dbo.categories(category_id)
    );
END
GO

-- 3. Items Table (Core Physical Item Ledger)
IF OBJECT_ID(N'dbo.items', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.items (
        item_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        category_id INT NOT NULL,
        registered_by INT NOT NULL,
        current_owner_id INT NOT NULL,
        name NVARCHAR(120) NOT NULL,
        brand NVARCHAR(60) NOT NULL,
        model NVARCHAR(60) NOT NULL,
        serial_number NVARCHAR(80) NOT NULL,
        description NVARCHAR(MAX) NULL,
        color NVARCHAR(30) NULL,
        manufacture_year INT NULL,
        specifications NVARCHAR(MAX) NULL,
        acquisition_type NVARCHAR(20) NOT NULL CONSTRAINT df_items_acq DEFAULT 'first_hand',
        previous_owners_count SMALLINT NOT NULL CONSTRAINT df_items_prev_owners DEFAULT 0,
        purchased_from INT NULL,
        purchase_date DATE NULL,
        purchase_price DECIMAL(10,2) NULL,
        warranty_expiry_date DATE NULL,
        battery_type NVARCHAR(40) NULL,
        battery_capacity_mah INT NULL,
        battery_rated_hours DECIMAL(5,2) NULL,
        status NVARCHAR(20) NOT NULL CONSTRAINT df_items_status DEFAULT 'active',
        created_at DATETIME2 NOT NULL CONSTRAINT df_items_created DEFAULT GETDATE(),
        CONSTRAINT fk_items_category FOREIGN KEY (category_id) REFERENCES dbo.categories(category_id),
        CONSTRAINT fk_items_registered_by FOREIGN KEY (registered_by) REFERENCES dbo.users(user_id),
        CONSTRAINT fk_items_current_owner FOREIGN KEY (current_owner_id) REFERENCES dbo.users(user_id),
        CONSTRAINT fk_items_purchased_from FOREIGN KEY (purchased_from) REFERENCES dbo.users(user_id),
        CONSTRAINT chk_items_status CHECK (status IN ('active', 'listed', 'sold', 'donated', 'repaired'))
    );
END
GO

-- Filtered unique index on items.serial_number
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'ux_items_serial' AND object_id = OBJECT_ID(N'dbo.items'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX ux_items_serial 
    ON dbo.items(serial_number) 
    WHERE serial_number IS NOT NULL;
END
GO

-- 4. Item Images Table (Core)
IF OBJECT_ID(N'dbo.item_images', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.item_images (
        image_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        item_id INT NOT NULL,
        image_url NVARCHAR(255) NOT NULL,
        is_primary BIT NOT NULL CONSTRAINT df_item_images_primary DEFAULT 0,
        uploaded_at DATETIME2 NOT NULL CONSTRAINT df_item_images_uploaded DEFAULT GETDATE(),
        CONSTRAINT fk_item_images_item FOREIGN KEY (item_id) REFERENCES dbo.items(item_id) ON DELETE CASCADE
    );
END
GO

-- 5. Lifecycle Events Table (Append-Only Event Ledger)
IF OBJECT_ID(N'dbo.lifecycle_events', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.lifecycle_events (
        event_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        item_id INT NOT NULL,
        performed_by INT NOT NULL,
        event_type NVARCHAR(30) NOT NULL,
        event_date DATETIME2 NOT NULL CONSTRAINT df_lifecycle_events_date DEFAULT GETDATE(),
        description NVARCHAR(MAX) NULL,
        CONSTRAINT fk_lifecycle_events_item FOREIGN KEY (item_id) REFERENCES dbo.items(item_id),
        CONSTRAINT fk_lifecycle_events_user FOREIGN KEY (performed_by) REFERENCES dbo.users(user_id)
    );
END
GO

-- 6. Condition Logs Table (Lifecycle and Ownership)
IF OBJECT_ID(N'dbo.condition_logs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.condition_logs (
        condition_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        item_id INT NOT NULL,
        event_id INT NOT NULL,
        assessed_by INT NOT NULL,
        condition_score SMALLINT NOT NULL,
        condition_grade NVARCHAR(10) NOT NULL,
        battery_health_pct SMALLINT NULL,
        battery_backup_hours DECIMAL(5,2) NULL,
        notes NVARCHAR(MAX) NULL,
        assessed_at DATETIME2 NOT NULL CONSTRAINT df_condition_logs_assessed DEFAULT GETDATE(),
        CONSTRAINT fk_condition_logs_item FOREIGN KEY (item_id) REFERENCES dbo.items(item_id),
        CONSTRAINT fk_condition_logs_event FOREIGN KEY (event_id) REFERENCES dbo.lifecycle_events(event_id),
        CONSTRAINT fk_condition_logs_assessed_by FOREIGN KEY (assessed_by) REFERENCES dbo.users(user_id),
        CONSTRAINT chk_condition_score CHECK (condition_score BETWEEN 1 AND 10)
    );
END
GO

-- 7. Ownership Transfers Table (Lifecycle and Ownership)
IF OBJECT_ID(N'dbo.ownership_transfers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ownership_transfers (
        transfer_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        item_id INT NOT NULL,
        from_user_id INT NULL,
        to_user_id INT NOT NULL,
        transfer_type NVARCHAR(20) NOT NULL,
        transfer_date DATETIME2 NOT NULL CONSTRAINT df_transfers_date DEFAULT GETDATE(),
        notes NVARCHAR(MAX) NULL,
        CONSTRAINT fk_transfers_item FOREIGN KEY (item_id) REFERENCES dbo.items(item_id),
        CONSTRAINT fk_transfers_from_user FOREIGN KEY (from_user_id) REFERENCES dbo.users(user_id),
        CONSTRAINT fk_transfers_to_user FOREIGN KEY (to_user_id) REFERENCES dbo.users(user_id)
    );
END
GO

-- 8. Ownership Records Table (Sequential Title Eras)
IF OBJECT_ID(N'dbo.ownership_records', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ownership_records (
        ownership_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        item_id INT NOT NULL,
        owner_id INT NOT NULL,
        transfer_id INT NULL,
        start_date DATE NOT NULL,
        end_date DATE NULL,
        CONSTRAINT fk_ownership_records_item FOREIGN KEY (item_id) REFERENCES dbo.items(item_id),
        CONSTRAINT fk_ownership_records_owner FOREIGN KEY (owner_id) REFERENCES dbo.users(user_id),
        CONSTRAINT fk_ownership_records_transfer FOREIGN KEY (transfer_id) REFERENCES dbo.ownership_transfers(transfer_id)
    );
END
GO

-- Filtered unique index: at most ONE active current owner per item (end_date IS NULL)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'ux_ownership_active_owner' AND object_id = OBJECT_ID(N'dbo.ownership_records'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX ux_ownership_active_owner 
    ON dbo.ownership_records(item_id) 
    WHERE end_date IS NULL;
END
GO

-- 9. Organizations Table (Repair, Resale and Donation)
IF OBJECT_ID(N'dbo.organizations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.organizations (
        organization_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        user_id INT NOT NULL,
        name NVARCHAR(120) NOT NULL,
        org_type NVARCHAR(30) NOT NULL,
        registration_no NVARCHAR(60) NULL,
        contact NVARCHAR(60) NULL,
        city NVARCHAR(80) NULL,
        CONSTRAINT fk_organizations_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id)
    );
END
GO

-- 10. Listings Table (Resale)
IF OBJECT_ID(N'dbo.listings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.listings (
        listing_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        item_id INT NOT NULL,
        seller_id INT NOT NULL,
        asking_price DECIMAL(10,2) NOT NULL,
        listing_date DATE NOT NULL,
        status NVARCHAR(20) NOT NULL CONSTRAINT df_listings_status DEFAULT 'active',
        closed_date DATE NULL,
        CONSTRAINT fk_listings_item FOREIGN KEY (item_id) REFERENCES dbo.items(item_id),
        CONSTRAINT fk_listings_seller FOREIGN KEY (seller_id) REFERENCES dbo.users(user_id),
        CONSTRAINT chk_listings_price CHECK (asking_price > 0)
    );
END
GO

-- Filtered unique index: at most ONE active marketplace listing per item
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'ux_listings_active_item' AND object_id = OBJECT_ID(N'dbo.listings'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX ux_listings_active_item 
    ON dbo.listings(item_id) 
    WHERE status = 'active';
END
GO

-- 11. Sales Transactions Table (Resale)
IF OBJECT_ID(N'dbo.sales_transactions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.sales_transactions (
        transaction_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        listing_id INT NOT NULL,
        buyer_id INT NOT NULL,
        transfer_id INT NOT NULL,
        sale_price DECIMAL(10,2) NOT NULL,
        sale_date DATE NOT NULL,
        payment_method NVARCHAR(30) NOT NULL,
        CONSTRAINT fk_sales_listing FOREIGN KEY (listing_id) REFERENCES dbo.listings(listing_id),
        CONSTRAINT fk_sales_buyer FOREIGN KEY (buyer_id) REFERENCES dbo.users(user_id),
        CONSTRAINT fk_sales_transfer FOREIGN KEY (transfer_id) REFERENCES dbo.ownership_transfers(transfer_id),
        CONSTRAINT chk_sales_price CHECK (sale_price > 0)
    );
END
GO

-- 12. Donations Table (Charity / Donation)
IF OBJECT_ID(N'dbo.donations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.donations (
        donation_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        item_id INT NOT NULL,
        donor_id INT NOT NULL,
        organization_id INT NOT NULL,
        transfer_id INT NOT NULL,
        reward_id INT NULL,
        donation_date DATE NOT NULL,
        notes NVARCHAR(MAX) NULL,
        CONSTRAINT fk_donations_item FOREIGN KEY (item_id) REFERENCES dbo.items(item_id),
        CONSTRAINT fk_donations_donor FOREIGN KEY (donor_id) REFERENCES dbo.users(user_id),
        CONSTRAINT fk_donations_org FOREIGN KEY (organization_id) REFERENCES dbo.organizations(organization_id),
        CONSTRAINT fk_donations_transfer FOREIGN KEY (transfer_id) REFERENCES dbo.ownership_transfers(transfer_id)
    );
END
GO

-- 13. Provenance Verifications Table (Provenance)
IF OBJECT_ID(N'dbo.provenance_verifications', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.provenance_verifications (
        verification_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        item_id INT NOT NULL,
        verified_by INT NOT NULL,
        verification_date DATE NOT NULL,
        method NVARCHAR(40) NOT NULL,
        status NVARCHAR(20) NOT NULL CONSTRAINT df_verifications_status DEFAULT 'verified',
        notes NVARCHAR(MAX) NULL,
        CONSTRAINT fk_verifications_item FOREIGN KEY (item_id) REFERENCES dbo.items(item_id),
        CONSTRAINT fk_verifications_user FOREIGN KEY (verified_by) REFERENCES dbo.users(user_id),
        CONSTRAINT chk_verifications_status CHECK (status IN ('verified', 'pending', 'rejected'))
    );
END
GO

-- 14. Service Providers Table (Repair)
IF OBJECT_ID(N'dbo.service_providers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.service_providers (
        provider_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        service_type NVARCHAR(50) NOT NULL,
        phone NVARCHAR(30) NULL,
        address NVARCHAR(150) NULL,
        city NVARCHAR(80) NULL
    );
END
GO

-- 15. Known Issues Table (Repair Knowledge Base)
IF OBJECT_ID(N'dbo.known_issues', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.known_issues (
        issue_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        category_id INT NOT NULL,
        title NVARCHAR(150) NOT NULL,
        symptoms NVARCHAR(MAX) NULL,
        severity NVARCHAR(20) NOT NULL,
        CONSTRAINT fk_known_issues_category FOREIGN KEY (category_id) REFERENCES dbo.categories(category_id)
    );
END
GO

-- 16. Issue Causes Table (Repair Knowledge Base)
IF OBJECT_ID(N'dbo.issue_causes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.issue_causes (
        cause_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        issue_id INT NOT NULL,
        cause_description NVARCHAR(MAX) NOT NULL,
        suggested_fix NVARCHAR(MAX) NOT NULL,
        difficulty NVARCHAR(20) NOT NULL,
        estimated_cost DECIMAL(10,2) NULL,
        needs_professional BIT NOT NULL CONSTRAINT df_issue_causes_prof DEFAULT 0,
        CONSTRAINT fk_issue_causes_issue FOREIGN KEY (issue_id) REFERENCES dbo.known_issues(issue_id) ON DELETE CASCADE
    );
END
GO

-- 17. Repairs Table (Repair)
IF OBJECT_ID(N'dbo.repairs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.repairs (
        repair_id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        item_id INT NOT NULL,
        provider_id INT NOT NULL,
        event_id INT NOT NULL,
        issue_id INT NULL,
        cause_id INT NULL,
        repair_date DATE NOT NULL,
        description NVARCHAR(MAX) NOT NULL,
        cost DECIMAL(10,2) NOT NULL CONSTRAINT df_repairs_cost DEFAULT 0.00,
        condition_before SMALLINT NOT NULL,
        condition_after SMALLINT NOT NULL,
        CONSTRAINT fk_repairs_item FOREIGN KEY (item_id) REFERENCES dbo.items(item_id),
        CONSTRAINT fk_repairs_provider FOREIGN KEY (provider_id) REFERENCES dbo.service_providers(provider_id),
        CONSTRAINT fk_repairs_event FOREIGN KEY (event_id) REFERENCES dbo.lifecycle_events(event_id),
        CONSTRAINT fk_repairs_issue FOREIGN KEY (issue_id) REFERENCES dbo.known_issues(issue_id),
        CONSTRAINT fk_repairs_cause FOREIGN KEY (cause_id) REFERENCES dbo.issue_causes(cause_id),
        CONSTRAINT chk_repairs_condition CHECK (condition_before BETWEEN 1 AND 10 AND condition_after BETWEEN 1 AND 10)
    );
END
GO

-- ============================================================================
-- AUDIT IMMUTABILITY TRIGGERS WITH THROW
-- (Enforcing Rule: Never update or delete history rows, only add new ones)
-- ============================================================================

-- Trigger on lifecycle_events
CREATE OR ALTER TRIGGER trg_prevent_lifecycle_events_modify
ON dbo.lifecycle_events
INSTEAD OF DELETE, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50001, 'Modification or deletion of immutable lifecycle events is strictly forbidden in Lifecycle Ledger.', 1;
END;
GO

-- Trigger on condition_logs
CREATE OR ALTER TRIGGER trg_prevent_condition_logs_modify
ON dbo.condition_logs
INSTEAD OF DELETE, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50002, 'Modification or deletion of immutable condition logs is strictly forbidden in Lifecycle Ledger.', 1;
END;
GO

-- Trigger on provenance_verifications
CREATE OR ALTER TRIGGER trg_prevent_provenance_verifications_modify
ON dbo.provenance_verifications
INSTEAD OF DELETE, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50003, 'Modification or deletion of provenance verification certificates is strictly forbidden.', 1;
END;
GO

-- Trigger on repairs
CREATE OR ALTER TRIGGER trg_prevent_repairs_modify
ON dbo.repairs
INSTEAD OF DELETE, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50004, 'Modification or deletion of certified repair maintenance records is strictly forbidden.', 1;
END;
GO

-- Trigger on ownership_transfers
CREATE OR ALTER TRIGGER trg_prevent_ownership_transfers_modify
ON dbo.ownership_transfers
INSTEAD OF DELETE, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50005, 'Modification or deletion of legal ownership transfer deeds is strictly forbidden.', 1;
END;
GO

-- Performance Indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_items_category' AND object_id = OBJECT_ID(N'dbo.items'))
    CREATE NONCLUSTERED INDEX idx_items_category ON dbo.items(category_id);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_items_owner' AND object_id = OBJECT_ID(N'dbo.items'))
    CREATE NONCLUSTERED INDEX idx_items_owner ON dbo.items(current_owner_id);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_lifecycle_item_date' AND object_id = OBJECT_ID(N'dbo.lifecycle_events'))
    CREATE NONCLUSTERED INDEX idx_lifecycle_item_date ON dbo.lifecycle_events(item_id, event_date);
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_condition_item_date' AND object_id = OBJECT_ID(N'dbo.condition_logs'))
    CREATE NONCLUSTERED INDEX idx_condition_item_date ON dbo.condition_logs(item_id, assessed_at);
GO
