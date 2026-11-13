# Paint Shop Inventory API

A small Express API using MongoDB's official Node.js driver. It manages products, customers, orders, and order details without a frontend.

## Run

Requirements: Node.js 18 or newer and a running MongoDB server.

```sh
npm install
npm start
```

By default, the API connects to `mongodb://127.0.0.1:27017`, uses the `paint_shop_inventory` database, and listens on port `3000`. Set `MONGODB_URI`, `DB_NAME`, and `PORT` to change these values. Startup creates the four collections and indexes, seeds 12 products plus 10 customers, 10 orders, and 10 order details, and migrates older embedded orders into the normalized collections. Seed records use stable IDs and are inserted only when missing, so restarting does not duplicate them.

## Collections

- `customers`: `customerId`, `customerName`, `address`, and `contact`.
- `products`: `productId`, SKU, stock number, name, category, price, quantity, and optional product details.
- `orders`: `orderId`, `customerId`, status, and timestamps.
- `orderDetails`: `orderDetailId`, `orderId`, `productId`, quantity, and the unit price captured when the detail is created.

Relationships use explicit IDs: one customer can have many orders; one order can have many order details; each order detail references one product. MongoDB's `_id` is internal; API responses use the named IDs above. Deleting a customer with orders or a product referenced by order details returns `409`. Deleting an order also deletes its order details.

Relationship metadata is defined with Mongoose `ref` virtuals in `models.js`: `Order.customerId` references `Customer.customerId`, `OrderDetail.orderId` references `Order.orderId`, and `OrderDetail.productId` references `Product.productId`. The virtual reverse links are also defined there. These refs support Mongoose `populate()` and schema-aware diagram tools. MongoDB Compass does not automatically draw relationship diagrams from Mongoose code; it displays the stored documents and indexes, while the relationship definitions remain in `models.js`.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | API health check |
| `GET` | `/api/customers` | List customers |
| `GET` | `/api/customers/:customerId` | Get a customer |
| `POST` | `/api/customers` | Create a customer |
| `PUT` | `/api/customers/:customerId` | Update a customer |
| `DELETE` | `/api/customers/:customerId` | Delete an unreferenced customer |
| `GET` | `/api/products` | List products; optional `category` and `q` filters |
| `GET` | `/api/products/:productId` | Get a product |
| `POST` | `/api/products` | Create a product |
| `PUT` | `/api/products/:productId` | Update a product |
| `DELETE` | `/api/products/:productId` | Delete an unreferenced product |
| `GET` | `/api/orders` | List orders; optional `customerId` and `status` filters |
| `GET` | `/api/orders/:orderId` | Get an order |
| `POST` | `/api/orders` | Create an order for an existing customer |
| `PUT` | `/api/orders/:orderId` | Update customer reference or status |
| `DELETE` | `/api/orders/:orderId` | Delete an order and its details |
| `GET` | `/api/order-details` | List details; optional `orderId` and `productId` filters |
| `GET` | `/api/order-details/:orderDetailId` | Get an order detail |
| `POST` | `/api/order-details` | Add a product line to an existing order |
| `PUT` | `/api/order-details/:orderDetailId` | Update a product line |
| `DELETE` | `/api/order-details/:orderDetailId` | Delete a product line |

Create a customer:

```json
{
  "customerName": "Jordan Lee",
  "address": "123 Main Street, Springfield, CA 90000",
  "contact": "jordan@example.com, 555-0100"
}
```

Use the returned `customerId` to create an order:

```json
{
  "customerId": "CUSTOMER_ID_FROM_RESPONSE",
  "status": "pending"
}
```

Then use the returned `orderId` and an existing product's `productId` to add an order detail:

```json
{
  "orderId": "ORDER_ID_FROM_RESPONSE",
  "productId": "PRODUCT_ID_FROM_RESPONSE",
  "quantity": 2
}
```

Order detail creation captures the product's current price as `unitPrice`. It does not automatically decrement inventory quantity.

To see the connected customer and product records in one JSON response, request `GET /api/orders/ORDER_ID?populate=true`. The relationships are defined in `model.js` with Mongoose virtual `ref` fields. Compass does not draw relationship lines from Mongoose schemas; use this populated endpoint to inspect the linked records, or use a schema-aware diagram tool.