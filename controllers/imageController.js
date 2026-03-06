const fs = require('fs').promises;
const path = require('path');

const imagesDir = path.join(__dirname, '../public/images');

// Show upload page
exports.showUploadPage = async (req, res) => {
  try {
    const files = await fs.readdir(imagesDir);
    const images = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    
    res.render('admin/images/upload', {
      title: 'Upload Images',
      username: req.session.username,
      role: req.session.userRole,
      images,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Show upload page error:', error);
    res.status(500).send('Error loading page');
  }
};

// Handle image upload
exports.uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.redirect('/admin/images/upload?error=No files uploaded');
    }
    
    console.log('\n=== Images Uploaded ===');
    console.log('Count:', req.files.length);
    console.log('By:', req.session.username);
    req.files.forEach(file => console.log('- ' + file.filename));
    console.log('=======================\n');
    
    res.redirect(`/admin/images/upload?success=${req.files.length} image(s) uploaded successfully`);
  } catch (error) {
    console.error('Upload images error:', error);
    res.redirect('/admin/images/upload?error=Error uploading images');
  }
};

// Show gallery
exports.showGallery = async (req, res) => {
  try {
    const files = await fs.readdir(imagesDir);
    const images = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    
    res.render('admin/images/gallery', {
      title: 'Image Gallery',
      username: req.session.username,
      role: req.session.userRole,
      images
    });
  } catch (error) {
    console.error('Show gallery error:', error);
    res.status(500).send('Error loading gallery');
  }
};

// Delete image
exports.deleteImage = async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    
    // Validate filename
    if (!/^[\w\-. ]+\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) {
      return res.status(400).json({ success: false, message: 'Invalid filename' });
    }
    
    const filePath = path.join(imagesDir, filename);
    const resolvedPath = path.resolve(filePath);
    const resolvedImagesDir = path.resolve(imagesDir);
    
    // Path traversal protection
    if (!resolvedPath.startsWith(resolvedImagesDir)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    // Delete file
    await fs.unlink(filePath);
    
    console.log('\n=== Image Deleted ===');
    console.log('Filename:', filename);
    console.log('By:', req.session.username);
    console.log('=====================\n');
    
    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ success: false, message: 'Error deleting image' });
  }
};
