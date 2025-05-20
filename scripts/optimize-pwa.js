const fs = require('fs');
const path = require('path');

console.log('Optimizing PWA assets...');

// Paths
const distDir = path.join(__dirname, '../dist');
const publicDir = path.join(__dirname, '../public');

// Function to copy directory contents recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy all files from public to dist
if (fs.existsSync(publicDir)) {
  try {
    copyDir(publicDir, distDir);
    console.log('✅ Copied all files from public to dist');
  } catch (err) {
    console.error('❌ Error copying public files:', err);
  }
} else {
  console.warn('⚠️ Public directory not found');
}

// Ensure index.html has proper PWA meta tags
const indexPath = path.join(distDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let indexHtml = fs.readFileSync(indexPath, 'utf8');
  
  // Check if PWA meta tags are already present
  if (!indexHtml.includes('theme-color')) {
    // Replace closing head tag with PWA meta tags + closing head tag
    indexHtml = indexHtml.replace('</head>', `
  <meta name="theme-color" content="#F36514">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="NookPay">
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/icons/nook.png">
</head>`);
  
    fs.writeFileSync(indexPath, indexHtml);
    console.log('✅ Added PWA meta tags to index.html');
  } else {
    console.log('ℹ️ PWA meta tags already present in index.html');
  }
} else {
  console.warn('⚠️ Could not find index.html');
}

console.log('✅ PWA optimization completed!'); 