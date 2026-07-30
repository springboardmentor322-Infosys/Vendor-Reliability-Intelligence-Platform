# VendorIQ Platform Database Schema

## ER Diagram Description

```text
users
  - id PK
  - name
  - email
  - hashed_password
  - role
  - is_active
  - created_at

vendor_categories
  - id PK
  - name
  - description
  - created_at

vendors
  - id PK
  - vendor_name
  - vendor_code
  - category_id FK -> vendor_categories.id
  - contact_name
  - contact_email
  - contact_phone
  - address
  - status
  - created_by_user_id FK -> users.id
  - created_at

reliability_scores
  - id PK
  - vendor_id FK -> vendors.id
  - overall_score
  - delivery_score
  - quality_score
  - response_score
  - period_start
  - period_end
  - calculated_at

performance_records
  - id PK
  - vendor_id FK -> vendors.id
  - record_date
  - delivery_score
  - quality_score
  - response_score
  - notes
  - created_at

procurement_requests
  - id PK
  - request_number
  - title
  - description
  - requested_by_user_id FK -> users.id
  - vendor_id FK -> vendors.id
  - status
  - requested_at
  - due_date

purchase_orders
  - id PK
  - po_number
  - procurement_request_id FK -> procurement_requests.id
  - vendor_id FK -> vendors.id
  - order_date
  - expected_delivery_date
  - total_amount
  - currency
  - status
  - notes
  - created_at

contracts
  - id PK
  - contract_number
  - vendor_id FK -> vendors.id
  - created_by_user_id FK -> users.id
  - start_date
  - end_date
  - contract_value
  - currency
  - status
  - terms_summary
  - created_at

compliance_documents
  - id PK
  - vendor_id FK -> vendors.id
  - document_type
  - document_name
  - file_url
  - status
  - uploaded_at
  - expires_at
  - notes

communications
  - id PK
  - vendor_id FK -> vendors.id
  - subject
  - channel
  - status
  - created_by_user_id FK -> users.id
  - created_at

messages
  - id PK
  - communication_id FK -> communications.id
  - sender_user_id FK -> users.id
  - recipient_user_id FK -> users.id
  - body
  - sent_at
  - is_read

notifications
  - id PK
  - user_id FK -> users.id
  - notification_type
  - title
  - message
  - is_read
  - created_at
  - related_entity_type
  - related_entity_id

reports
  - id PK
  - report_type
  - title
  - summary
  - generated_by_user_id FK -> users.id
  - vendor_id FK -> vendors.id
  - generated_at
  - file_url
```

## Relationship Summary

- vendor_categories 1 -> many vendors
- vendors 1 -> many reliability_scores
- vendors 1 -> many performance_records
- vendors 1 -> many procurement_requests
- vendors 1 -> many purchase_orders
- vendors 1 -> many contracts
- vendors 1 -> many compliance_documents
- vendors 1 -> many communications
- vendors 1 -> many reports
- procurement_requests 1 -> many purchase_orders
- communications 1 -> many messages
- users 1 -> many notifications
- users 1 -> many reports
- users 1 -> many procurement_requests
- users 1 -> many contracts
- users 1 -> many communications
