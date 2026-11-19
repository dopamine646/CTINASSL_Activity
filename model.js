const mongoose = require('mongoose');

const { Schema } = mongoose;
const timestamps = { timestamps: true, versionKey: false };

const customerSchema = new Schema({
  customerId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  contact: { type: String, trim: true },
}, { collection: 'customers', ...timestamps });
customerSchema.index({ email: 1 }, { unique: true, sparse: true });

const addressSchema = new Schema({
  addressId: { type: String, required: true, unique: true },
  customerId: { type: String, required: true, ref: 'Customer' },
  label: { type: String, trim: true },
  addressLine1: { type: String, required: true, trim: true },
  addressLine2: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  region: { type: String, trim: true },
  postalCode: { type: String, trim: true },
  country: { type: String, required: true, trim: true },
}, { collection: 'addresses', ...timestamps });
addressSchema.index({ customerId: 1 });

const categorySchema = new Schema({
  categoryId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  parentCategoryId: { type: String, default: null, ref: 'Category' },
}, { collection: 'categories', ...timestamps });
categorySchema.virtual('parent', {
  ref: 'Category',
  localField: 'parentCategoryId',
  foreignField: 'categoryId',
  justOne: true,
});
categorySchema.virtual('children', {
  ref: 'Category',
  localField: 'categoryId',
  foreignField: 'parentCategoryId',
});

const productSchema = new Schema({
  productId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  brand: { type: String, trim: true },
  categoryId: { type: String, required: true, ref: 'Category' },
}, { collection: 'products', ...timestamps });
productSchema.index({ categoryId: 1 });
productSchema.virtual('category', {
  ref: 'Category',
  localField: 'categoryId',
  foreignField: 'categoryId',
  justOne: true,
});
productSchema.virtual('variants', {
  ref: 'ProductVariant',
  localField: 'productId',
  foreignField: 'productId',
});

const productVariantSchema = new Schema({
  variantId: { type: String, required: true, unique: true },
  productId: { type: String, required: true, ref: 'Product' },
  sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
  color: { type: String, trim: true },
  colorCode: { type: String, trim: true },
  finish: { type: String, trim: true },
  volume: { type: String, trim: true },
  size: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  stockOnHand: { type: Number, required: true, min: 0, default: 0, validate: Number.isInteger },
  active: { type: Boolean, default: true },
}, { collection: 'productVariants', ...timestamps });
productVariantSchema.index({ productId: 1 });
productVariantSchema.virtual('product', {
  ref: 'Product',
  localField: 'productId',
  foreignField: 'productId',
  justOne: true,
});

const orderSchema = new Schema({
  orderId: { type: String, required: true, unique: true },
  customerId: { type: String, required: true, ref: 'Customer' },
  addressId: { type: String, required: true, ref: 'Address' },
  shippingAddress: {
    label: String,
    addressLine1: { type: String, required: true },
    addressLine2: String,
    city: { type: String, required: true },
    region: String,
    postalCode: String,
    country: { type: String, required: true },
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'completed', 'cancelled'],
    required: true,
    default: 'pending',
  },
  subtotal: { type: Number, required: true, min: 0 },
}, { collection: 'orders', ...timestamps });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.virtual('customer', {
  ref: 'Customer',
  localField: 'customerId',
  foreignField: 'customerId',
  justOne: true,
});
orderSchema.virtual('items', {
  ref: 'OrderItem',
  localField: 'orderId',
  foreignField: 'orderId',
});

const orderItemSchema = new Schema({
  orderItemId: { type: String, required: true, unique: true },
  orderId: { type: String, required: true, ref: 'Order' },
  variantId: { type: String, required: true, ref: 'ProductVariant' },
  productId: { type: String, required: true, ref: 'Product' },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  variantDescription: { type: String, trim: true },
  quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
  unitPrice: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 },
}, { collection: 'orderItems', ...timestamps });
orderItemSchema.index({ orderId: 1 });
orderItemSchema.index({ variantId: 1 });
orderItemSchema.virtual('order', {
  ref: 'Order',
  localField: 'orderId',
  foreignField: 'orderId',
  justOne: true,
});
orderItemSchema.virtual('variant', {
  ref: 'ProductVariant',
  localField: 'variantId',
  foreignField: 'variantId',
  justOne: true,
});

const inventoryMovementSchema = new Schema({
  movementId: { type: String, required: true, unique: true },
  variantId: { type: String, required: true, ref: 'ProductVariant' },
  type: { type: String, required: true, enum: ['receipt', 'adjustment', 'return', 'sale', 'cancellation'] },
  quantityDelta: { type: Number, required: true, validate: Number.isInteger },
  reason: { type: String, required: true, trim: true },
  orderId: { type: String, ref: 'Order' },
}, { collection: 'inventoryMovements', ...timestamps });
inventoryMovementSchema.index({ variantId: 1, createdAt: -1 });
inventoryMovementSchema.index({ orderId: 1 });
inventoryMovementSchema.virtual('variant', {
  ref: 'ProductVariant',
  localField: 'variantId',
  foreignField: 'variantId',
  justOne: true,
});
inventoryMovementSchema.virtual('order', {
  ref: 'Order',
  localField: 'orderId',
  foreignField: 'orderId',
  justOne: true,
});

for (const schema of [
  customerSchema,
  addressSchema,
  categorySchema,
  productSchema,
  productVariantSchema,
  orderSchema,
  orderItemSchema,
  inventoryMovementSchema,
]) {
  schema.set('toJSON', { virtuals: true });
  schema.set('toObject', { virtuals: true });
}

module.exports = {
  Customer: mongoose.model('Customer', customerSchema),
  Address: mongoose.model('Address', addressSchema),
  Category: mongoose.model('Category', categorySchema),
  Product: mongoose.model('Product', productSchema),
  ProductVariant: mongoose.model('ProductVariant', productVariantSchema),
  Order: mongoose.model('Order', orderSchema),
  OrderItem: mongoose.model('OrderItem', orderItemSchema),
  InventoryMovement: mongoose.model('InventoryMovement', inventoryMovementSchema),
};
