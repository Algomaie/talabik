أريد منك بناء **Full-Stack Delivery Platform** احترافي وقابل للعرض كمشروع سابق في Portfolio، بحيث يكون المشروع مثالًا عمليًا واضحًا على قدرتي في:

* JavaScript
* TypeScript
* Node.js
* Backend Development
* REST APIs
* PostgreSQL
* Redis
* Authentication & Authorization
* Git / GitHub
* Software Architecture
* Database Design
* API Design
* Security
* Caching
* Scalability
* Error Handling
* Testing
* Docker

المشروع يجب أن يبدو كمشروع **حقيقي Production-like** وليس مجرد CRUD Demo.

---

# 1. فكرة النظام

ابنِ منصة توصيل متعددة الأطراف تربط:

**Customers + Merchants + Delivery Drivers + Administrators**

الفكرة:

العميل يستطيع تصفح المتاجر والمنتجات، إضافة المنتجات إلى السلة، إنشاء Order، تحديد عنوان التوصيل، متابعة حالة الطلب، واستلام إشعارات لحظية.

التاجر يستطيع إدارة متجره ومنتجاته والطلبات الواردة.

السائق يستطيع رؤية الطلبات المتاحة، قبول طلب التوصيل، تحديث موقعه وحالة التسليم.

الـAdmin يستطيع إدارة المنصة بالكامل.

---

# 2. Actors

يجب أن يحتوي النظام على:

### Customer

* Register
* Login
* Browse Stores
* Browse Products
* Search
* Filter
* Add to Cart
* Update Cart
* Checkout
* Manage Addresses
* Create Order
* Track Order
* Cancel Order وفق Business Rules
* View Order History
* Rate Order / Driver / Merchant
* Receive Notifications
* Manage Profile

### Merchant

* Register / Login
* Manage Store Profile
* Manage Products
* Manage Categories
* Manage Prices
* Manage Inventory
* Receive Orders
* Accept / Reject Orders
* Update Order Preparation Status
* View Order History
* View Sales Summary

### Delivery Driver

* Register / Login
* Driver Profile
* Availability Status
* See Available Delivery Orders
* Accept Delivery
* Navigate to Pickup
* Confirm Pickup
* Update Delivery Status
* Update Current Location
* Confirm Delivery
* View Earnings
* View Delivery History

### Admin

* Dashboard
* Manage Users
* Manage Merchants
* Manage Drivers
* Manage Stores
* Manage Products
* Manage Orders
* Manage Categories
* Suspend / Activate Accounts
* View Reports
* Manage Roles and Permissions
* Monitor system activity
* Audit Logs

---

# 3. Business Flow

نفّذ Order lifecycle واضح:

```text
PENDING
↓
CONFIRMED
↓
PREPARING
↓
READY_FOR_PICKUP
↓
ASSIGNED
↓
PICKED_UP
↓
OUT_FOR_DELIVERY
↓
DELIVERED
```

مع الحالات الاستثنائية:

```text
CANCELLED
REJECTED
FAILED
```

يجب منع الانتقال غير المنطقي بين الحالات.

مثلاً لا يمكن:

```text
PENDING → DELIVERED
```

مباشرة.

يجب تنفيذ State Machine أو Business Rule واضحة للتحكم في transitions.

---

# 4. Customer Workflow

المستخدم:

```text
Register
↓
Login
↓
Browse Stores
↓
Open Store
↓
Browse Products
↓
Add to Cart
↓
Review Cart
↓
Select Address
↓
Checkout
↓
Create Order
↓
Track Order
↓
Receive Delivery
↓
Rate Order
```

أنشئ UI واضح لكل مرحلة.

---

# 5. Merchant Workflow

```text
Login
↓
Merchant Dashboard
↓
Manage Store
↓
Manage Categories
↓
Manage Products
↓
Receive Order
↓
Accept Order
↓
Preparing
↓
Ready for Pickup
↓
Driver Pickup
```

---

# 6. Driver Workflow

```text
Login
↓
Driver Dashboard
↓
Go Online
↓
Available Orders
↓
Accept Delivery
↓
Navigate to Merchant
↓
Confirm Pickup
↓
Out for Delivery
↓
Update Location
↓
Deliver Order
↓
Confirm Delivery
```

---

# 7. Admin Workflow

```text
Admin Login
↓
Dashboard
↓
Users
Merchants
Drivers
Stores
Products
Orders
Reports
Audit Logs
System Settings
```

---

# 8. Frontend

أنشئ Frontend حديثًا واحترافيًا باستخدام:

**React + TypeScript**

مع الاستفادة من modern JavaScript features بشكل واضح.

استخدم:

* TypeScript
* React
* React Router
* Form Validation
* API Client
* Authentication State
* Protected Routes
* Role-based UI
* Responsive Design
* Reusable Components

يجب أن يكون التصميم:

* Modern
* Professional
* Clean
* Responsive
* Mobile Friendly
* مناسب للعرض في Portfolio

أنشئ:

### Public Pages

* Home
* Stores
* Store Details
* Product Details
* Login
* Register

### Customer Pages

* Dashboard
* Cart
* Checkout
* Orders
* Order Details
* Tracking
* Profile
* Addresses
* Notifications

### Merchant Pages

* Merchant Dashboard
* Products
* Categories
* Orders
* Store Settings
* Sales

### Driver Pages

* Driver Dashboard
* Available Deliveries
* Active Delivery
* Delivery History
* Earnings
* Profile

### Admin Pages

* Admin Dashboard
* Users
* Merchants
* Drivers
* Stores
* Orders
* Reports
* Audit Logs

---

# 9. Backend

استخدم:

**Node.js + TypeScript**

مع Framework مناسب مثل:

**Express.js**

أو NestJS إذا كان ذلك يخدم architecture بشكل أفضل.

أفضلية المشروع هي الوضوح المعماري، وليس كثرة frameworks.

استخدم Architecture منظمة مثل:

```text
src/
│
├── modules/
│   ├── auth/
│   ├── users/
│   ├── merchants/
│   ├── drivers/
│   ├── stores/
│   ├── products/
│   ├── categories/
│   ├── cart/
│   ├── orders/
│   ├── deliveries/
│   ├── payments/
│   ├── notifications/
│   └── reports/
│
├── common/
│   ├── middleware/
│   ├── errors/
│   ├── validation/
│   ├── utils/
│   └── constants/
│
├── config/
├── database/
├── redis/
└── app.ts
```

---

# 10. REST API

صمم RESTful API احترافي.

أمثلة:

```http
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

GET    /api/v1/stores
GET    /api/v1/stores/:id
POST   /api/v1/stores
PATCH  /api/v1/stores/:id

GET    /api/v1/products
GET    /api/v1/products/:id
POST   /api/v1/products
PATCH  /api/v1/products/:id
DELETE /api/v1/products/:id

GET    /api/v1/cart
POST   /api/v1/cart/items
PATCH  /api/v1/cart/items/:id
DELETE /api/v1/cart/items/:id

POST   /api/v1/orders
GET    /api/v1/orders
GET    /api/v1/orders/:id
POST   /api/v1/orders/:id/cancel

POST   /api/v1/deliveries/:id/accept
PATCH  /api/v1/deliveries/:id/status
PATCH  /api/v1/deliveries/:id/location

GET    /api/v1/admin/users
GET    /api/v1/admin/orders
GET    /api/v1/admin/reports
```

استخدم:

```text
/api/v1/...
```

لتوضيح API Versioning.

---

# 11. API Architecture

استخدم:

```text
Request
↓
Router
↓
Authentication Middleware
↓
Authorization Middleware
↓
Validation
↓
Controller
↓
Service
↓
Repository / Data Access
↓
PostgreSQL / Redis
```

لا تضع Business Logic داخل Controllers.

Controller مسؤول عن HTTP concerns.

Service مسؤول عن Business Logic.

Repository مسؤول عن Data Access.

---

# 12. PostgreSQL

استخدم:

**PostgreSQL**

كـprimary relational database وSource of Truth.

صمم Database Schema احترافيًا يحتوي على جداول مثل:

```text
users
roles
permissions
user_roles
merchants
stores
drivers
categories
products
inventory
addresses
carts
cart_items
orders
order_items
deliveries
payments
notifications
ratings
audit_logs
```

أنشئ العلاقات:

```text
User
 ├── Addresses
 ├── Orders
 └── Roles

Merchant
 └── Store
      ├── Categories
      └── Products

Order
 ├── OrderItems
 ├── Payment
 └── Delivery

Delivery
 └── Driver
```

استخدم:

* Primary Keys
* Foreign Keys
* Unique Constraints
* NOT NULL
* CHECK Constraints
* Indexes
* Composite Indexes عند الحاجة

تجنب denormalization غير الضروري.

---

# 13. PostgreSQL Performance

أريد المشروع أن يظهر فهمًا حقيقيًا لقواعد البيانات.

استخدم Indexes مناسبة على columns مثل:

```text
users.email
orders.user_id
orders.status
orders.created_at
deliveries.driver_id
deliveries.status
products.store_id
products.category_id
```

لكن لا تضف indexes عشوائية.

لكل Index يجب أن يكون هناك سبب مرتبط بالـquery pattern.

أظهر بعض أمثلة:

```sql
EXPLAIN ANALYZE
```

داخل documentation للمشروع لشرح optimization.

---

# 14. Redis

Redis ليس Database بديلة عن PostgreSQL.

استخدم Redis عمليًا في المشروع في أكثر من سيناريو.

### Cache

مثلاً:

```text
stores:list
store:{id}
products:store:{id}
```

### TTL

ضع expiration مناسب للـcached data.

### Rate Limiting

استخدم Redis لمنع:

```text
Brute Force
Login Abuse
API Abuse
```

مثلاً:

```text
5 login attempts / minute
```

### Session / Token Management

استخدم Redis عند الحاجة لإدارة session/token state أو revocation.

### Temporary Data

مثل:

```text
OTP
Verification Codes
Temporary Checkout State
```

---

# 15. Cache Strategy

نفذ:

**Cache-Aside Pattern**

```text
Request
↓
Redis
↓
Cache Hit → Return
↓
Cache Miss
↓
PostgreSQL
↓
Update Redis
↓
Return
```

عند تعديل المنتج أو المتجر:

```text
Update PostgreSQL
↓
Invalidate / Update Cache
```

اشرح في documentation لماذا اخترت strategy معينة.

---

# 16. Authentication

نفذ نظام Authentication حقيقي.

استخدم:

```text
Register
Login
Access Token
Refresh Token
Logout
Password Hashing
```

Password hashing باستخدام algorithm مناسب مثل:

```text
Argon2
```

أو bcrypt.

لا تخزن passwords بشكل plain text.

---

# 17. Authorization

استخدم:

**RBAC — Role-Based Access Control**

الأدوار:

```text
CUSTOMER
MERCHANT
DRIVER
ADMIN
```

مثلاً:

```text
CUSTOMER
→ create order

MERCHANT
→ manage own products

DRIVER
→ manage assigned deliveries

ADMIN
→ manage entire platform
```

ويجب منع المستخدم من الوصول إلى resources التي لا يملك صلاحية الوصول إليها.

---

# 18. Security

طبّق على الأقل:

* Input Validation
* SQL Injection Protection
* Secure Password Hashing
* CORS Configuration
* Rate Limiting
* Secure Headers
* Authentication
* Authorization
* Access Control
* Refresh Token Protection
* Environment Variables
* Secrets Management
* Proper Error Handling

لا تعرض:

```text
Stack Trace
Database Errors
Secrets
Internal Implementation Details
```

للعميل.

---

# 19. Order Integrity

اجعل إنشاء Order عملية business transaction حقيقية.

عند إنشاء Order:

```text
Validate Cart
↓
Validate Product Availability
↓
Calculate Total
↓
Create Order
↓
Create Order Items
↓
Reserve / Update Inventory
↓
Commit Transaction
```

يجب استخدام PostgreSQL transaction حيث تكون atomicity مطلوبة.

---

# 20. Idempotency

أضف دعمًا لـ:

```http
Idempotency-Key
```

خصوصًا في العمليات الحساسة مثل:

```text
Create Order
Create Payment
```

الهدف:

منع إنشاء نفس الطلب مرتين بسبب:

```text
Retry
Network Failure
Double Click
Client Timeout
```

---

# 21. Payment Simulation

لا تحتاج إلى ربط Payment Gateway حقيقي.

أنشئ:

**Mock Payment Service**

يحاكي:

```text
PENDING
SUCCESS
FAILED
```

وأضف سيناريوهات failure.

مثلاً:

```text
Payment SUCCESS
Order creation FAILED
```

ويجب أن يكون لديك recovery strategy واضحة.

---

# 22. Order State Machine

اجعل النظام يتحقق من transitions.

مثلاً:

```text
PENDING
 ↓
CONFIRMED
 ↓
PREPARING
 ↓
READY_FOR_PICKUP
 ↓
ASSIGNED
 ↓
PICKED_UP
 ↓
OUT_FOR_DELIVERY
 ↓
DELIVERED
```

لا تسمح بـtransition غير منطقي.

مثلاً:

```text
DELIVERED → PREPARING
```

يجب أن يفشل.

---

# 23. Delivery Assignment

أنشئ منطقًا بسيطًا لاختيار Driver مناسب.

يمكن أن يعتمد على:

```text
Availability
Distance
Current Active Deliveries
Driver Status
```

لا تحتاج إلى خوارزمية خرائط معقدة.

يمكن استخدام mock location data.

---

# 24. Notifications

أنشئ نظام Notification داخلي.

أمثلة:

```text
Order Confirmed
Order Preparing
Driver Assigned
Order Picked Up
Order Out for Delivery
Order Delivered
```

خزّن notifications في PostgreSQL.

ويمكن استخدام Redis Pub/Sub أو Queue-based design لمحاكاة asynchronous processing عند الحاجة.

---

# 25. Logging

أضف structured logging.

كل request مهم يجب أن يحتوي على:

```text
requestId
timestamp
method
path
statusCode
responseTime
userId
```

مثلاً:

```json
{
  "requestId": "req_123",
  "method": "POST",
  "path": "/api/v1/orders",
  "statusCode": 201,
  "responseTime": 142
}
```

---

# 26. Error Handling

أنشئ centralized error handling.

استخدم أخطاء مثل:

```text
ValidationError
AuthenticationError
AuthorizationError
NotFoundError
ConflictError
BusinessRuleError
DatabaseError
```

واجعل API response consistent.

مثلاً:

```json
{
  "success": false,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Order not found"
  }
}
```

---

# 27. Pagination

لا تعيد آلاف records في request واحد.

نفذ pagination مثل:

```http
GET /api/v1/orders?page=1&limit=20
```

وأضف:

```text
page
limit
total
totalPages
```

أو استخدم cursor pagination في المواضع التي تناسبها.

---

# 28. Search / Filtering / Sorting

مثلاً:

```http
GET /api/v1/products?
search=coffee
&category=drinks
&minPrice=5
&maxPrice=50
&sort=price
&page=1
&limit=20
```

اجعل filtering آمنًا ولا تسمح بإدخال SQL fragments مباشرة.

---

# 29. Testing

أريد المشروع أن يحتوي على:

### Unit Tests

للـbusiness logic.

### Integration Tests

للتكامل مع:

```text
PostgreSQL
Redis
API
```

### API Tests

لـcritical endpoints:

```text
Register
Login
Create Order
Accept Delivery
Update Order Status
```

لا تحتاج إلى تغطية 100%، لكن يجب أن تكون هناك اختبارات ذات قيمة.

---

# 30. Docker

أنشئ:

```text
Dockerfile
docker-compose.yml
```

يجب أن يستطيع المطور تشغيل:

```bash
docker compose up
```

لتشغيل:

```text
Frontend
Backend
PostgreSQL
Redis
```

مع environment configuration صحيحة.

---

# 31. Environment Variables

أنشئ:

```text
.env.example
```

مثلاً:

```text
NODE_ENV=
PORT=
DATABASE_URL=
REDIS_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
CORS_ORIGIN=
```

لا تضع secrets داخل Git.

---

# 32. Git / GitHub

صمم المشروع ليكون مناسبًا للنشر على GitHub.

أنشئ:

```text
README.md
.gitignore
.env.example
Dockerfile
docker-compose.yml
```

اجعل README احترافيًا ويتضمن:

### Project Overview

### Features

### Tech Stack

### Architecture

### Database Schema

### API Documentation

### Authentication Flow

### Redis Usage

### Local Setup

### Docker Setup

### Environment Variables

### Testing

### Project Structure

### Future Improvements

---

# 33. Git Commit Strategy

استخدم Git history احترافية.

أمثلة:

```text
feat(auth): implement JWT authentication
feat(orders): add order creation workflow
feat(redis): implement product caching
feat(delivery): add driver assignment
fix(auth): handle refresh token expiration
perf(products): optimize product listing query
test(orders): add order service integration tests
docs(readme): add architecture documentation
```

لا تستخدم commit messages مثل:

```text
final
final2
test
update
fix stuff
```

---

# 34. API Documentation

أنشئ Swagger / OpenAPI Documentation.

يجب أن تكون endpoints موثقة مع:

* Request
* Response
* Parameters
* Authentication
* Error Responses
* Example Payloads

مثال:

```text
/api/docs
```

---

# 35. Dashboard

اجعل Dashboard احترافيًا.

### Admin Dashboard

اعرض:

```text
Total Users
Active Merchants
Active Drivers
Orders Today
Revenue
Pending Orders
Completed Deliveries
```

مع Charts بسيطة.

### Merchant Dashboard

```text
Orders
Revenue
Products
Inventory
Top Products
```

### Driver Dashboard

```text
Available Deliveries
Active Delivery
Completed Deliveries
Earnings
```

---

# 36. Seed Data

أنشئ realistic seed data:

```text
Admin Account
Merchant Accounts
Driver Accounts
Customer Accounts
Stores
Categories
Products
Orders
Deliveries
```

واجعل المشروع يعمل مباشرة بعد:

```bash
npm run seed
```

---

# 37. Demo Accounts

أضف حسابات Demo واضحة في README:

```text
Admin
Merchant
Driver
Customer
```

مع passwords تجريبية غير حقيقية.

---

# 38. Portfolio Requirements

المشروع مخصص لعرضه أمام شركات التوظيف.

لذلك أريد أن يظهر عند استعراضه:

### Full-Stack Development

```text
Frontend
Backend
Database
Caching
Authentication
Authorization
Deployment
```

### Engineering

```text
Clean Architecture
REST API
Database Design
Transactions
Caching
Security
Error Handling
Testing
Docker
Git
```

---

# 39. صفحة Portfolio داخل المشروع

أنشئ صفحة:

```text
/about-project
```

تشرح المشروع تقنيًا.

يجب أن تحتوي على:

**Architecture Diagram**

**Technology Stack**

**Database ERD**

**Authentication Flow**

**Order Lifecycle**

**Redis Caching Strategy**

**API Architecture**

**Security Measures**

**Testing Strategy**

---

# 40. لا تبالغ في Architecture

ممنوع تحويل المشروع إلى Microservices بدون حاجة.

ابدأ بـ:

**Modular Monolith**

واجعل architecture قابلة للتوسع مستقبلًا.

في README وضّح:

> The project uses a modular monolithic architecture to maintain simplicity while keeping clear domain boundaries and allowing future extraction of services when justified by scale or business requirements.

---

# 41. Code Quality

التزم بـ:

* SOLID
* DRY
* Separation of Concerns
* Dependency Injection عند الحاجة
* Strong typing
* Reusable components
* Clean naming
* Small focused functions
* Consistent error handling
* Consistent API response structure

تجنب:

* God classes
* Huge controllers
* Duplicated business logic
* Hard-coded secrets
* Magic values
* Over-engineering

---

# 42. Performance

أظهر في المشروع اهتمامًا بـ:

```text
Database Indexing
Query Optimization
Redis Caching
Pagination
Connection Pooling
Async Processing
Rate Limiting
```

وضّح في README سبب استخدام كل تقنية.

---

# 43. Production Scenarios

أضف معالجة واضحة للحالات:

### Duplicate Order

استخدم Idempotency.

### Payment Success + DB Failure

استخدم state/retry/reconciliation strategy.

### Redis Failure

يجب ألا ينهار النظام بالكامل إذا كان Redis مستخدمًا كcache فقط.

مثلاً:

```text
Redis unavailable
↓
Fallback to PostgreSQL
```

حسب السيناريو.

### Database Failure

أرجع Error مناسبًا ولا تكشف التفاصيل الداخلية.

### Driver accepts same order twice

استخدم transaction/locking/atomic operation أو constraint strategy لمنع ذلك.

---

# 44. UX

التطبيق يجب أن يظهر احترافيًا أمام العميل/المقابل.

أضف:

* Loading states
* Empty states
* Error states
* Confirmation dialogs
* Form validation
* Responsive tables
* Toast notifications
* Skeleton loading
* Pagination
* Search
* Filters

ولا تكتفِ بالشاشات الناجحة فقط.

---

# 45. Seed Scenario

اجعل Demo جاهزًا بحيث يستطيع الشخص:

```text
Login Customer
↓
Browse Store
↓
Add Products
↓
Checkout
↓
Create Order
↓
Login Merchant
↓
Accept Order
↓
Mark Preparing
↓
Mark Ready
↓
Login Driver
↓
Accept Delivery
↓
Pickup
↓
Out for Delivery
↓
Delivered
```

بحيث يمكن استعراض الـFull Business Flow بالكامل أمام interviewer.

---

# 46. Deliverables

أريد في النهاية مشروعًا يحتوي على:

```text
/frontend
/backend

/docker-compose.yml
/README.md
/.env.example
/Dockerfile

/database
   migrations
   seeds

/docs
   architecture.md
   api.md
   database.md
   redis.md
   security.md
```

مع:

```text
Swagger/OpenAPI
Tests
Seed Data
Demo Accounts
ERD
Architecture Diagram
```

---

# 47. أهم شرط

لا تنشئ المشروع كـ"Demo CRUD".

أريد أن تكون القرارات الهندسية قابلة للنقاش في مقابلة.

لكل قرار مهم أضف Documentation يشرح:

**What?**
**Why?**
**How?**
**Trade-offs?**
**Alternative?**

مثلاً:

لماذا PostgreSQL؟

لماذا Redis؟

لماذا Cache-Aside؟

لماذا JWT؟

لماذا Modular Monolith؟

لماذا استخدمنا Transaction هنا؟

لماذا استخدمنا Idempotency-Key؟

متى يمكن نقل جزء من النظام إلى Microservice؟

---

# 48. طريقة التنفيذ

قبل كتابة الكود:

1. Analyze Requirements
2. Define Actors
3. Define Functional Requirements
4. Define Non-functional Requirements
5. Define Business Rules
6. Design Database
7. Design REST APIs
8. Design Architecture
9. Define Redis Strategy
10. Define Authentication & Authorization
11. Define Folder Structure

بعد ذلك ابدأ التنفيذ تدريجيًا.

لا تنتقل إلى مرحلة قبل التأكد من سلامة التصميم السابق.

---

# 49. النتيجة النهائية المطلوبة

أريد مشروعًا يمكنني وضعه في GitHub وPortfolio وشرحه في مقابلة Full-Stack Developer على أنه:

**Production-like Delivery Management Platform**

ويجب أن أستطيع خلال المقابلة شرح:

```text
Frontend
↓
REST API
↓
Node.js
↓
TypeScript
↓
Authentication
↓
Authorization
↓
Business Logic
↓
PostgreSQL
↓
Redis
↓
Caching
↓
Transactions
↓
Security
↓
Docker
↓
Git/GitHub
```

ويجب أن يكون المشروع واضحًا بصريًا، منظمًا برمجيًا، وقابلًا للتشغيل محليًا من خلال Docker.

### معيار النجاح

عند فتح GitHub Repository الخاص بالمشروع، يجب أن يشعر الـTechnical Interviewer أن المشروع يوضح عمليًا:

> **"هذا المطور يفهم Full-Stack Engineering وليس مجرد كتابة واجهات CRUD."**
