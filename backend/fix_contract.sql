UPDATE contracts SET created_at = NOW(), updated_at = NOW(), compliance_flags = '["Insurance Missing", "NDA Missing"]' WHERE contract_number = 'CT-DEMO-001';
