# 🍰 Aziza Bakery - Enterprise Admin System

## Overview
Professional enterprise-grade admin dashboard for Aziza Bakery with MVC architecture, RBAC, and comprehensive product management.

## 🏗️ Architecture

### MVC Structure
```
aziza-bakery/
├── config/              # Configuration files
│   ├── database.js      # MongoDB connection
│   └── session.js       # Session configuration
├── controllers/         # Business logic
│   ├── authController.js
│   ├── dashboardController.js
│   ├── productController.js
│   └── imageController.js
├── middleware/          # Custom middleware
│   ├── auth.js          # Authentication & authorization
│   ├── errorHandler.js  # Error handling
│   ├── upload.js        # File upload (multer)
│   └── validation.js    # Input validation
├── models/              # Mongoose models
│   ├── User.js          # User model with RBAC
│   └── Product.js       # Product model
├── routes/              # Route definitions
│   ├── admin.js         # Admin routes
│   └── public.js        # Public routes
├── views/               # EJS templates
│   ├── admin/           # Admin dashboard views
│   │   ├── dashboard.ejs
│   │   ├── login.ejs
│   │   ├── products/    # Product management
│   │   └── images/      # Image management
│   ├── partials/        # Reusable components
│   │   ├── sidebar.ejs
│   │   └── topnav.ejs
│   └── [public views]
├── public/              # Static assets
│   ├── images/          # Uploaded images
│   ├── js/admin.js      # Admin client-side JS
│   └── css/
└── server.js            # Application entry point
```

## 🔐 Security Features

### Authentication
- Session-based authentication with express-session
- Bcrypt password hashing
- HTTP-only secure cookies
- Session timeout (24 hours)
- Login rate limiting (5 attempts per 15 min)

### Authorization (RBAC)
- **Super Admin**: Full access to all features
- **Admin**: Manage products, images, delete operations
- **Editor**: Create/edit products, upload images

### Security Middleware
- Helmet.js for HTTP headers
- Express-rate-limit for DDoS protection
- Input validation with express-validator
- Path traversal protection
- File type and size validation
- XSS and CSRF protection ready

## 📊 Features

### Dashboard
- Real-time statistics (products, images, users, orders)
- Recent products display
- Quick navigation
- Role-based UI

### Product Management
- Full CRUD operations
- Categories: Cakes, Pastries, Breads, Cookies, Special
- Image selection from gallery
- Featured products
- Availability toggle
- Pagination
- Search and filter (ready)

### Image Management
- Multi-file upload (up to 10 files)
- File validation (JPG, JPEG, PNG, GIF, WEBP)
- 5MB size limit per file
- Secure deletion with confirmation
- Gallery view
- Path traversal protection

### User Interface
- Modern responsive design
- Sidebar navigation
- Top navigation with user menu
- SweetAlert2 confirmations
- Toast notifications
- Loading states
- Error handling

## 🚀 Installation

### Prerequisites
- Node.js (v14+)
- MongoDB (v4+)
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start MongoDB
mongod

# Run server
npm start
```

## 🔑 Default Credentials

### Environment-based Admin (Fallback)
See `.env.example` for admin credentials

### Database Users
Create users via MongoDB or seed script (future feature)

## 📝 Environment Variables

```env
MONGO_URI=
ADMIN_USERNAME=
ADMIN_PASSWORD=
SESSION_SECRET=
PORT=
NODE_ENV=

## 🛣️ Routes

### Public Routes
- `GET /` - Homepage
- `GET /gallery` - Image gallery
- `GET /menu` - Product menu
- `GET /contact` - Contact form
- `POST /contact` - Submit contact

### Admin Routes
- `GET /admin/login` - Login page
- `POST /admin/login` - Login handler
- `GET /admin/logout` - Logout
- `GET /admin/dashboard` - Dashboard
- `GET /admin/products` - List products
- `GET /admin/products/create` - Create product form
- `POST /admin/products/create` - Create product
- `GET /admin/products/:id/edit` - Edit product form
- `POST /admin/products/:id/edit` - Update product
- `POST /admin/products/:id/delete` - Delete product (Admin+)
- `GET /admin/images/upload` - Upload page
- `POST /admin/images/upload` - Upload images
- `GET /admin/images/gallery` - Image gallery
- `POST /admin/images/:filename/delete` - Delete image (Admin+)

## 🔧 API Endpoints

All admin routes return JSON for AJAX requests:
```json
{
  "success": true/false,
  "message": "Operation message",
  "data": {}
}
```

## 📦 Dependencies

### Core
- express - Web framework
- mongoose - MongoDB ODM
- ejs - Template engine
- bcryptjs - Password hashing
- express-session - Session management

### Security
- helmet - Security headers
- express-rate-limit - Rate limiting
- express-validator - Input validation

### File Upload
- multer - Multipart form data

### Development
- dotenv - Environment variables
- nodemon - Auto-restart (dev)

## 🎨 UI Components

### Reusable Partials
- Sidebar navigation
- Top navigation bar
- User dropdown menu
- Alert messages
- Loading states

### Client-side
- SweetAlert2 for confirmations
- Tailwind CSS for styling
- Custom admin.js for interactions

## 🔮 Future Features

### Planned
- [ ] Online order management
- [ ] Payment integration (Stripe/PayPal)
- [ ] Analytics dashboard
- [ ] Multi-branch support
- [ ] Customer management
- [ ] Email notifications
- [ ] Inventory tracking
- [ ] Sales reports
- [ ] User management UI
- [ ] Settings page
- [ ] Dark mode
- [ ] Mobile app API

### Database Ready
- Order schema (ready to implement)
- Customer schema (ready to implement)
- Branch schema (ready to implement)

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run with nodemon
npm run dev
```

## 📚 Documentation

Admin users can be created via MongoDB directly or using a seeding script.
### Adding a New Route
1. Create controller in `controllers/`
2. Add route in `routes/admin.js` or `routes/public.js`
3. Add middleware if needed
4. Create view in `views/admin/`

### Custom Middleware Example
```javascript
// middleware/custom.js
module.exports = (req, res, next) => {
  // Your logic here
  next();
};
```

## 🐛 Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check MONGO_URI in .env
- Verify network connectivity

### Session Issues
- Clear browser cookies
- Check SESSION_SECRET in .env
- Restart server

### File Upload Errors
- Check file size (max 5MB)
- Verify file type (images only)
- Ensure public/images/ exists



## 👨‍💻 Author

Mohamed  
Full-Stack Developer

GitHub: https://github.com/muddywa3

---



## 📄 License
MIT License - Feel free to use for your projects

## 👥 Contributors
- Aziza Bakery Development Team

## 📞 Support
For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ for Aziza Bakery**
