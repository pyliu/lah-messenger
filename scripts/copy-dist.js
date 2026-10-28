const fs = require('fs');
const path = require('path');

function findBundleDir(targetType) {
  const candidates = [];
  if (process.env.CARGO_TARGET_DIR) {
    candidates.push(path.resolve(process.env.CARGO_TARGET_DIR, `release/bundle/${targetType}`));
  }
  candidates.push(path.resolve(__dirname, `../src-tauri/target/release/bundle/${targetType}`));
  candidates.push(path.resolve(__dirname, `../target/release/bundle/${targetType}`));
  candidates.push(path.resolve(`C:/Temp/cargo-target/lah-messenger/release/bundle/${targetType}`));

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }
  return null;
}

function copyTarget(targetType, ext) {
  const bundleDir = findBundleDir(targetType);
  if (!bundleDir) return false;

  const files = fs.readdirSync(bundleDir)
    .filter(f => f.toLowerCase().endsWith(ext))
    .map(f => {
      const fullPath = path.join(bundleDir, f);
      return {
        name: f,
        fullPath,
        mtime: fs.statSync(fullPath).mtimeMs
      };
    })
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) return false;

  const latest = files[0];
  const distDir = path.resolve(__dirname, '../dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 清理 dist 目錄中舊有的同類型安裝檔
  fs.readdirSync(distDir)
    .filter(f => f.toLowerCase().endsWith(ext))
    .forEach(f => {
      try {
        fs.unlinkSync(path.join(distDir, f));
      } catch (err) {}
    });

  const destPath = path.join(distDir, latest.name);
  fs.copyFileSync(latest.fullPath, destPath);

  const stats = fs.statSync(destPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`✔ 安裝檔已就緒：dist/${latest.name} (${sizeMB} MB)`);
  return true;
}

function copyDist() {
  console.log('\n==================================================');
  const copiedNsis = copyTarget('nsis', '.exe');
  const copiedMsi = copyTarget('msi', '.msi');

  if (!copiedNsis && !copiedMsi) {
    console.error('❌ 在輸出目錄未找到可複製的安裝檔 (.exe / .msi)。');
    process.exit(1);
  }
  console.log('==================================================\n');
}

copyDist();
