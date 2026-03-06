const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const imagesDir = path.join(__dirname, '../public/images');

router.get('/', async (req, res) => {
  try {
    const files = await fs.readdir(imagesDir);
    const images = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    res.render('index', { images });
  } catch (error) {
    console.error('Homepage error:', error);
    res.render('index', { images: [] });
  }
});

router.get('/menu', async (req, res) => {
  try {
    const files = await fs.readdir(imagesDir);
    const images = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    const fallbackProducts = images.map((image, index) => ({
      _id: image.replace(/\.(jpg|jpeg|png|gif|webp)$/i, ''),
      name: image.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      price: [4.99, 5.99, 6.99, 7.99, 8.99, 9.99][index % 6],
      description: 'Freshly baked with premium ingredients',
      image: image
    }));
    res.render('menu', { products: fallbackProducts });
  } catch (error) {
    console.error('Menu error:', error);
    res.render('menu', { products: [] });
  }
});

router.get('/cart/count', (req, res) => {
  const cart = req.session.cart || { items: [], totalPrice: 0 };
  const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
  res.json({ success: true, itemCount, totalPrice: cart.totalPrice });
});

module.exports = router;
