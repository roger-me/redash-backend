const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.default = async function(context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const tempPath = path.join(context.appOutDir, 'temp_app');
  console.log('Clearing extended attributes from:', appPath);

  try {
    // Use ditto to copy without extended attributes, then replace
    execSync(`ditto --norsrc "${appPath}" "${tempPath}"`, { stdio: 'inherit' });
    execSync(`rm -rf "${appPath}"`, { stdio: 'inherit' });
    execSync(`mv "${tempPath}" "${appPath}"`, { stdio: 'inherit' });

    // Also clear any remaining xattr just in case
    execSync(`xattr -cr "${appPath}"`, { stdio: 'inherit' });

    // Remove any .DS_Store files
    execSync(`find "${appPath}" -name '.DS_Store' -delete 2>/dev/null || true`, { stdio: 'inherit' });

    console.log('Extended attributes cleared successfully via ditto');
  } catch (e) {
    console.log('xattr clear failed:', e.message);
  }
};
