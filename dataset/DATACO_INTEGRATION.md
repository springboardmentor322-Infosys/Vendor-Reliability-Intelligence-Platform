# DataCo Dataset Integration

Primary dataset: DataCoSupplyChainDataset.csv
Rows: 180,519
Columns: 53

This project uses DataCo as the primary supply-chain dataset. Existing UI/routes are preserved.

Detected columns:
- Type
- Days for shipping (real)
- Days for shipment (scheduled)
- Benefit per order
- Sales per customer
- Delivery Status
- Late_delivery_risk
- Category Id
- Category Name
- Customer City
- Customer Country
- Customer Email
- Customer Fname
- Customer Id
- Customer Lname
- Customer Password
- Customer Segment
- Customer State
- Customer Street
- Customer Zipcode
- Department Id
- Department Name
- Latitude
- Longitude
- Market
- Order City
- Order Country
- Order Customer Id
- order date (DateOrders)
- Order Id
- Order Item Cardprod Id
- Order Item Discount
- Order Item Discount Rate
- Order Item Id
- Order Item Product Price
- Order Item Profit Ratio
- Order Item Quantity
- Sales
- Order Item Total
- Order Profit Per Order
- Order Region
- Order State
- Order Status
- Order Zipcode
- Product Card Id
- Product Category Id
- Product Description
- Product Image
- Product Name
- Product Price
- Product Status
- shipping date (DateOrders)
- Shipping Mode

Integration notes:
- Procurement, purchase-order, delivery and analytics calculations should use the DataCo fields available in this dataset.
- Vendor, contract, invoice, quality-inspection, communication-history and notification records are supporting business data and should be generated/stored separately.
- Reliability, ranking, risk and performance metrics are application calculations, not downloaded as separate datasets.