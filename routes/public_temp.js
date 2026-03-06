const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const dashboardController = require('../controllers/dashboardController');
const productController = require('../controllers/productController');
const imageController = require('../controllers/imageController');

const { requireAuth, requireRole, redirectIfAuthenticated } = require('../middleware/auth');
const { productValidation, loginValidation, handleValidationErrors } = require('../middleware/validation');
const upload = require('../middleware/upload');

// Auth routes
router.get('/login', redirectIfAuthenticated, authController.showLogin);
router.post('/login', redirectIfAuthenticated, ...loginValidation, handleValidationErrors, authController.login);
router.get('/logout', authController.logout);

// Dashboard
router.get('/dashboard', requireAuth, dashboardController.showDashboard);

// Product routes
router.get('/products', requireAuth, productController.listProducts);
router.get('/products/create', requireAuth, productController.showCreateForm);
router.post('/products/create', requireAuth, ...productValidation, handleValidationErrors, productController.createProduct);
router.get('/products/:id/edit', requireAuth, productController.showEditForm);
router.post('/products/:id/edit', requireAuth, ...productValidation, handleValidationErrors, productController.updateProduct);
router.post('/products/:id/delete', requireAuth, requireRole('admin', 'super_admin'), productController.deleteProduct);

// Image routes
router.get('/images/upload', requireAuth, imageController.showUploadPage);
router.post('/images/upload', requireAuth, upload.array('images', 10), imageController.uploadImages);
router.get('/images/gallery', requireAuth, imageController.showGallery);
router.post('/images/:filename/delete', requireAuth, requireRole('admin', 'super_admin'), imageController.deleteImage);

// Redirect /admin to dashboard
router.get('/', requireAuth, (req, res) => res.redirect('/admin/dashboard'));

module.exports = router;
