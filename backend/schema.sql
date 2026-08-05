
CREATE TABLE procurement_requests (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	request_number VARCHAR(100), 
	department VARCHAR(100), 
	estimated_cost FLOAT, 
	total_cost FLOAT, 
	approval_status VARCHAR(50), 
	created_at DATETIME DEFAULT now(), 
	PRIMARY KEY (id)
)

;


CREATE TABLE users (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	name VARCHAR(100), 
	email VARCHAR(100), 
	password_hash VARCHAR(255), 
	`role` VARCHAR(50), 
	created_at DATETIME DEFAULT now(), 
	PRIMARY KEY (id)
)

;


CREATE TABLE pr_items (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	pr_id INTEGER, 
	item_details VARCHAR(255), 
	quantity INTEGER, 
	estimated_cost FLOAT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(pr_id) REFERENCES procurement_requests (id)
)

;


CREATE TABLE vendors (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	user_id INTEGER, 
	company_name VARCHAR(255), 
	vendor_code VARCHAR(50), 
	gstin VARCHAR(50), 
	category VARCHAR(100), 
	approval_status VARCHAR(50), 
	contact_email VARCHAR(100), 
	rating FLOAT, 
	risk_level VARCHAR(50), 
	delivery_rate FLOAT, 
	quality_score FLOAT, 
	created_at DATETIME DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
)

;


CREATE TABLE contracts (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	vendor_id INTEGER, 
	start_date DATE, 
	expiry_date DATE, 
	renewal_notice_days INTEGER, 
	compliance_flags VARCHAR(255), 
	PRIMARY KEY (id), 
	FOREIGN KEY(vendor_id) REFERENCES vendors (id)
)

;


CREATE TABLE purchase_orders (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	pr_id INTEGER, 
	vendor_id INTEGER, 
	po_number VARCHAR(100), 
	fulfillment_status VARCHAR(50), 
	created_timestamp DATETIME DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(pr_id) REFERENCES procurement_requests (id), 
	FOREIGN KEY(vendor_id) REFERENCES vendors (id)
)

;


CREATE TABLE po_items (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	po_id INTEGER, 
	pr_item_id INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(po_id) REFERENCES purchase_orders (id), 
	FOREIGN KEY(pr_item_id) REFERENCES pr_items (id)
)

;

