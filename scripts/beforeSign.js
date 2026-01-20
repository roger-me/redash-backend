const { execSync } = require('child_process');

exports.default = async function(context) {
  const appPath = context.appOutDir;
  console.log('Clearing extended attributes from:', appPath);
  try {
    execSync(`xattr -cr "${appPath}"`, { stdio: 'inherit' });
  } catch (e) {
    console.log('xattr clear failed:', e.message);
  }
};
