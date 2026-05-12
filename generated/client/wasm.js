
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  phone: 'phone',
  passwordHash: 'passwordHash',
  passwordResetToken: 'passwordResetToken',
  passwordResetExpires: 'passwordResetExpires',
  firstName: 'firstName',
  lastName: 'lastName',
  emailVerified: 'emailVerified',
  phoneVerified: 'phoneVerified',
  locale: 'locale',
  blocked: 'blocked',
  roles: 'roles',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AddressScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  firstName: 'firstName',
  lastName: 'lastName',
  company: 'company',
  addressLine1: 'addressLine1',
  addressLine2: 'addressLine2',
  city: 'city',
  state: 'state',
  postalCode: 'postalCode',
  countryCode: 'countryCode',
  phone: 'phone',
  isDefault: 'isDefault'
};

exports.Prisma.CategoryScalarFieldEnum = {
  id: 'id',
  parentId: 'parentId',
  position: 'position',
  published: 'published',
  requiresSizes: 'requiresSizes',
  media: 'media',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CategoryTranslationScalarFieldEnum = {
  id: 'id',
  categoryId: 'categoryId',
  locale: 'locale',
  title: 'title',
  slug: 'slug',
  fullPath: 'fullPath',
  description: 'description',
  seoTitle: 'seoTitle',
  seoDescription: 'seoDescription'
};

exports.Prisma.BrandScalarFieldEnum = {
  id: 'id',
  slug: 'slug',
  logoUrl: 'logoUrl',
  published: 'published',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BrandTranslationScalarFieldEnum = {
  id: 'id',
  brandId: 'brandId',
  locale: 'locale',
  name: 'name',
  description: 'description'
};

exports.Prisma.AttributeScalarFieldEnum = {
  id: 'id',
  key: 'key',
  type: 'type',
  filterable: 'filterable',
  position: 'position',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AttributeTranslationScalarFieldEnum = {
  id: 'id',
  attributeId: 'attributeId',
  locale: 'locale',
  name: 'name'
};

exports.Prisma.AttributeValueScalarFieldEnum = {
  id: 'id',
  attributeId: 'attributeId',
  value: 'value',
  position: 'position',
  colors: 'colors',
  imageUrl: 'imageUrl'
};

exports.Prisma.AttributeValueTranslationScalarFieldEnum = {
  id: 'id',
  attributeValueId: 'attributeValueId',
  locale: 'locale',
  label: 'label'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  brandId: 'brandId',
  skuPrefix: 'skuPrefix',
  media: 'media',
  published: 'published',
  featured: 'featured',
  publishedAt: 'publishedAt',
  categoryIds: 'categoryIds',
  primaryCategoryId: 'primaryCategoryId',
  attributeIds: 'attributeIds',
  discountPercent: 'discountPercent',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductTranslationScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  locale: 'locale',
  title: 'title',
  slug: 'slug',
  subtitle: 'subtitle',
  descriptionHtml: 'descriptionHtml',
  seoTitle: 'seoTitle',
  seoDescription: 'seoDescription'
};

exports.Prisma.ProductVariantScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  sku: 'sku',
  barcode: 'barcode',
  price: 'price',
  compareAtPrice: 'compareAtPrice',
  cost: 'cost',
  stock: 'stock',
  stockReserved: 'stockReserved',
  weightGrams: 'weightGrams',
  imageUrl: 'imageUrl',
  position: 'position',
  published: 'published',
  attributes: 'attributes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductVariantOptionScalarFieldEnum = {
  id: 'id',
  variantId: 'variantId',
  attributeId: 'attributeId',
  attributeKey: 'attributeKey',
  valueId: 'valueId',
  value: 'value'
};

exports.Prisma.ProductLabelScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  type: 'type',
  value: 'value',
  position: 'position',
  color: 'color'
};

exports.Prisma.ProductAttributeScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  attributeId: 'attributeId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CartScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  guestToken: 'guestToken',
  locale: 'locale',
  couponCode: 'couponCode',
  abandoned: 'abandoned',
  abandonedAt: 'abandonedAt',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CartItemScalarFieldEnum = {
  id: 'id',
  cartId: 'cartId',
  variantId: 'variantId',
  productId: 'productId',
  quantity: 'quantity',
  priceSnapshot: 'priceSnapshot',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  number: 'number',
  userId: 'userId',
  status: 'status',
  paymentStatus: 'paymentStatus',
  fulfillmentStatus: 'fulfillmentStatus',
  subtotal: 'subtotal',
  discountAmount: 'discountAmount',
  shippingAmount: 'shippingAmount',
  taxAmount: 'taxAmount',
  total: 'total',
  currency: 'currency',
  customerEmail: 'customerEmail',
  customerPhone: 'customerPhone',
  customerLocale: 'customerLocale',
  billingAddress: 'billingAddress',
  shippingAddress: 'shippingAddress',
  shippingMethod: 'shippingMethod',
  trackingNumber: 'trackingNumber',
  notes: 'notes',
  adminNotes: 'adminNotes',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  paidAt: 'paidAt',
  fulfilledAt: 'fulfilledAt',
  cancelledAt: 'cancelledAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  variantId: 'variantId',
  productTitle: 'productTitle',
  variantTitle: 'variantTitle',
  sku: 'sku',
  quantity: 'quantity',
  price: 'price',
  total: 'total',
  imageUrl: 'imageUrl'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  provider: 'provider',
  providerTransactionId: 'providerTransactionId',
  method: 'method',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  cardLast4: 'cardLast4',
  cardBrand: 'cardBrand',
  errorCode: 'errorCode',
  errorMessage: 'errorMessage',
  providerResponse: 'providerResponse',
  idempotencyKey: 'idempotencyKey',
  completedAt: 'completedAt',
  failedAt: 'failedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderEventScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  type: 'type',
  data: 'data',
  userId: 'userId',
  ipAddress: 'ipAddress',
  createdAt: 'createdAt'
};

exports.Prisma.ProductReviewScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  userId: 'userId',
  rating: 'rating',
  comment: 'comment',
  published: 'published',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PromoCodeScalarFieldEnum = {
  id: 'id',
  code: 'code',
  discountPercent: 'discountPercent',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SettingsScalarFieldEnum = {
  id: 'id',
  key: 'key',
  value: 'value',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ContactMessageScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  subject: 'subject',
  message: 'message',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};


exports.Prisma.ModelName = {
  User: 'User',
  Address: 'Address',
  Category: 'Category',
  CategoryTranslation: 'CategoryTranslation',
  Brand: 'Brand',
  BrandTranslation: 'BrandTranslation',
  Attribute: 'Attribute',
  AttributeTranslation: 'AttributeTranslation',
  AttributeValue: 'AttributeValue',
  AttributeValueTranslation: 'AttributeValueTranslation',
  Product: 'Product',
  ProductTranslation: 'ProductTranslation',
  ProductVariant: 'ProductVariant',
  ProductVariantOption: 'ProductVariantOption',
  ProductLabel: 'ProductLabel',
  ProductAttribute: 'ProductAttribute',
  Cart: 'Cart',
  CartItem: 'CartItem',
  Order: 'Order',
  OrderItem: 'OrderItem',
  Payment: 'Payment',
  OrderEvent: 'OrderEvent',
  ProductReview: 'ProductReview',
  PromoCode: 'PromoCode',
  Settings: 'Settings',
  ContactMessage: 'ContactMessage'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
