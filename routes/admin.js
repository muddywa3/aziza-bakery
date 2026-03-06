const express = require('express');
const router = express.Router();

const unifiedAuthController = require('../controllers/unifiedAuthController');
const dashboardController = require('../controllers/dashboardController');
const productController = require('../controllers/productController');
const imageController = require('../controllers/imageController');
const orderController = require('../controllers/orderController');
const userController = require('../controllers/userController');

const { requireAuth, requireRole, redirectIfAuthenticated, requireAdmin } = require('../middleware/auth');
const { productValidation, loginValidation, handleValidationErrors } = require('../middleware/validation');
const upload = require('../middleware/upload');

// Auth routes - use unified auth for consistency
router.get('/login', redirectIfAuthenticated, unifiedAuthController.showLogin);
router.post('/login', redirectIfAuthenticated, unifiedAuthController.login);
router.get('/logout', unifiedAuthController.logout);

// All admin routes require admin access
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', dashboardController.showDashboard);

// Product routes
router.get('/products', productController.listProducts);
router.get('/products/create', productController.showCreateForm);
router.post('/products/create', ...productValidation, handleValidationErrors, productController.createProduct);
router.get('/products/:id/edit', productController.showEditForm);
router.post('/products/:id/edit', ...productValidation, handleValidationErrors, productController.updateProduct);
router.post('/products/:id/delete', requireRole('admin', 'super_admin'), productController.deleteProduct);

// Image routes
router.get('/images/upload', imageController.showUploadPage);
router.post('/images/upload', upload.array('images', 10), imageController.uploadImages);
router.get('/images/gallery', imageController.showGallery);
router.post('/images/:filename/delete', requireRole('admin', 'super_admin'), imageController.deleteImage);

// Order routes
router.get('/orders', orderController.listOrders);
router.get('/orders/:id', orderController.viewOrderDetails);
router.post('/orders/:id/status', requireRole('admin', 'super_admin'), orderController.updateOrderStatus);

// User management routes (admin and super_admin only)
router.get('/users', requireRole('admin', 'super_admin'), userController.listUsers);
router.get('/users/create', requireRole('admin', 'super_admin'), userController.showCreateUser);
router.post('/users/create', requireRole('admin', 'super_admin'), userController.createUser);
router.get('/users/:id/edit', requireRole('admin', 'super_admin'), userController.showEditUser);
router.post('/users/:id/edit', requireRole('admin', 'super_admin'), userController.updateUser);
router.post('/users/:id/delete', requireRole('admin', 'super_admin'), userController.deleteUser);

// Redirect /admin to dashboard
router.get('/', (req, res) => res.redirect('/admin/dashboard'));

module.exports = router;
