-- Fix NA categories for existing vendors
UPDATE vendors SET category_id = (id % 6) + 1 WHERE category_id IS NULL;

-- Insert a Procurement Request
INSERT INTO procurement_requests (department, description, status, created_at, requested_by_id)
VALUES ('IT Department', 'Server Hardware Upgrades', 'Approved', NOW(), 1)
RETURNING id;

-- Wait, let's just use hardcoded ID or do it in a way that doesn't fail.
DO $$
DECLARE
    pr_id INT;
    po_id INT;
BEGIN
    INSERT INTO procurement_requests (department, description, status, created_at, requested_by_id)
    VALUES ('IT Department', 'Server Hardware Upgrades', 'Approved', NOW(), 1)
    RETURNING id INTO pr_id;

    INSERT INTO pr_items (pr_id, item_name, quantity, estimated_cost)
    VALUES (pr_id, 'Enterprise Servers', 5, 25000);

    INSERT INTO purchase_orders (pr_id, vendor_id, amount, status, created_at, po_number)
    VALUES (pr_id, 10, 125000, 'Shipped', NOW(), 'PO-DEMO-001')
    RETURNING id INTO po_id;

    UPDATE contracts SET purchase_order_id = po_id WHERE contract_number = 'CT-DEMO-001';

    -- Insert Audit Logs
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, created_at)
    VALUES 
        (1, 'PR_APPROVED', 'ProcurementRequest', pr_id, NOW() - INTERVAL '2 days'),
        (2, 'PO_CREATED', 'PurchaseOrder', po_id, NOW() - INTERVAL '1 day'),
        (6, 'PO_SHIPPED', 'PurchaseOrder', po_id, NOW());
END $$;
