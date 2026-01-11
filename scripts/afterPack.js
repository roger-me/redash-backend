const { execSync } = require('child_process');
const path = require('path');

exports.default = async function(context) {
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  console.log('Clearing extended attributes from:', appPath);
  try {
    execSync(`xattr -cr "${appPath}"`, { stdio: 'inherit' });
  } catch (e) {
    console.log('xattr clear failed:', e.message);
  }
};
