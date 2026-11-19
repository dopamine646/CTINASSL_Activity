# Paint Shop Inventory API

An Express and MongoDB API for a paint-shop catalog, customer addresses, orders, and inventory movements. This project is an API only; it does not include a storefront interface.

## Run

Requirements: Node.js 18 or newer and a running MongoDB server.

```powershell
npm install
npm start
```

In PowerShell installations that block `npm.ps1`, run `npm.cmd install` and `npm.cmd start` instead. The API listens at `http://localhost:3000`; `GET /health` checks that it is running.

The default MongoDB database is `paint_shop_inventory_v2`, intentionally separate from the previous schema. Configure `MONGODB_URI`, `DB_NAME`, and `PORT` as environment variables to use different values. The API does not delete or migrate records in the previous database.

## Data model

- `customers` → one customer has many `addresses` and `orders`.
- `categories` → categories may have a parent category; each product belongs to a category.
- `products` → one product has many `productVariants`.
- `productVariants` → each sellable SKU has its own price and `stockOnHand`.
- `orders` → each order references a customer and address; it stores a shipping-address snapshot.
- `orderItems` → joins orders to variants, storing quantity and the purchase-time price and product/SKU labels.
- `inventoryMovements` → recorded stock changes with a signed `quantityDelta` and reason.

Every relationship uses a named ID (for example `customerId`, `categoryId`, and `variantId`). MongoDB does not enforce foreign keys, so the API checks references before writing. SKUs and entity IDs are unique.

Stock is deducted when an order is placed. Cancelling an order in `pending` or `processing` restores the stock and records the change. Shipped orders cannot be cancelled through this endpoint. Manual stock changes use inventory movements; receipts and returns increase stock, while adjustments may be positive or negative. The `stockOnHand` field is the current count; movements provide its audit history.

## Main endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | API health |
| `GET`, `POST` | `/api/customers` | List or create customers |
| `GET`, `PUT`, `DELETE` | `/api/customers/:customerId` | Read, update, or delete a customer |
| `GET`, `POST` | `/api/customers/:customerId/addresses` | List or add customer addresses |
| `GET`, `PUT`, `DELETE` | `/api/addresses/:addressId` | Read, update, or delete an address |
| `GET`, `POST` | `/api/categories` | List or create categories |
| `GET`, `PUT`, `DELETE` | `/api/categories/:categoryId` | Read, update, or delete a category |
| `GET`, `POST` | `/api/products` | List or create products |
| `GET`, `PUT`, `DELETE` | `/api/products/:productId` | Read, update, or delete a product |
| `GET`, `POST` | `/api/variants` | List or create sellable product variants |
| `GET`, `PUT`, `DELETE` | `/api/variants/:variantId` | Read, update, or delete a variant |
| `GET`, `POST` | `/api/inventory-movements` | View history or adjust stock |
| `GET`, `POST` | `/api/orders` | List orders or place an order |
| `GET` | `/api/orders/:orderId` | Read an order with its items and customer |
| `PATCH` | `/api/orders/:orderId` | Change status or cancel an eligible order |

List endpoints accept relevant filters such as `categoryId`, `productId`, `customerId`, `status`, and `variantId`. They return at most 200 records per request.

## Basic setup example

Create records in this order:

1. `POST /api/categories` with `{"name":"Paints"}`.
2. `POST /api/products` with `{"name":"Interior Acrylic Paint","categoryId":"CATEGORY_ID"}`.
3. `POST /api/variants` with `{"productId":"PRODUCT_ID","sku":"ACR-WHT-GAL","color":"White","finish":"Matte","volume":"1 gallon","price":29.99}`.
4. Add initial stock with `POST /api/inventory-movements` using `{"variantId":"VARIANT_ID","type":"receipt","quantityDelta":10,"reason":"Opening stock"}`.
5. Create a customer, add an address, then place an order:

```json
{
  "customerId": "CUSTOMER_ID",
  "addressId": "ADDRESS_ID",
  "items": [
    { "variantId": "VARIANT_ID", "quantity": 2 }
  ]
}
```

Use an API client such as Postman to send `POST`, `PUT`, and `PATCH` requests with a JSON body and `Content-Type: application/json`.
