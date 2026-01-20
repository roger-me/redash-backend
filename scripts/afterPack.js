const { execSync } = require('child_process');
const path = require('path');

exports.default = async function(context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  console.log('Clearing extended attributes from:', appPath);

  try {
    // Use find to clear xattr on every single file
    execSync(`find "${appPath}" -exec xattr -c {} \\;`, { stdio: 'inherit' });
    console.log('Extended attributes cleared successfully');
  } catch (e) {
    console.log('xattr clear failed:', e.message);
  }
};
