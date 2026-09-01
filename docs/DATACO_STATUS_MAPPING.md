# DataCo → VendorIQ Order Status Mapping

VendorIQ uses six application-level order statuses, while the DataCo Smart Supply Chain dataset has different source status values.

| DataCo source status | VendorIQ status |
|---|---|
| COMPLETE | Completed |
| CLOSED | Completed |
| PROCESSING | Ordered |
| PENDING | Pending |
| PENDING_PAYMENT | Pending |
| ON_HOLD | Pending |
| PAYMENT_REVIEW | Pending |
| CANCELED | Cancelled |
| SUSPECTED_FRAUD | Cancelled |

`Approved` and `Delivered` are retained as valid VendorIQ workflow statuses for manually created/updated orders, but DataCo does not provide an equivalent source order status. Therefore imported DataCo orders do not artificially receive those statuses.

The DataCo dataset is an order-line dataset. VendorIQ aggregates line items by `Order Id` into unique orders, resulting in 65,752 imported orders in the supplied database.
