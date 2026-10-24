const fs = require('fs');
const path = require('path');

function findBundleDir() {
  const candidates = [];
  if (process.env.CARGO_TARGET_DIR) {
    candidates.push(path.resolve(process.env.CARGO_TARGET_DIR, 'release/bundle/nsis'));
  }
  candidates.push(path.resolve(__dirname, '../src-tauri/target/release/bundle/nsis'));
  candidates.push(path.resolve(__dirname, '../target/release/bundle/nsis'));
  candidates.push(path.resolve('C:/Temp/cargo-target/lah-messenger/release/bundle/nsis'));

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }
  return null;
}

function copyDist() {
  const bundleDir = findBundleDir();
  if (!bundleDir) {
    console.error('❌ 找不到 NSIS 打包輸出目錄，請確認建置是否成功。');
    process.exit(1);
  }

  const files = fs.readdirSync(bundleDir)
    .filter(f => f.toLowerCase().endsWith('.exe'))
    .map(f => {
      const fullPath = path.join(bundleDir, f);
      return {
        name: f,
        fullPath,
        mtime: fs.statSync(fullPath).mtimeMs
      };
    })
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    console.error('❌ 在輸出目錄未找到 .exe 安裝檔：' + bundleDir);
    process.exit(1);
  }

  const latestInstaller = files[0];
  const distDir = path.resolve(__dirname, '../dist');

  // 確保 dist 目錄存在
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 清理 dist 目錄中舊有的 .exe 安裝檔（依決策僅保留當次最新）
  fs.readdirSync(distDir)
    .filter(f => f.toLowerCase().endsWith('.exe'))
    .forEach(f => {
      try {
        fs.unlinkSync(path.join(distDir, f));
      } catch (err) {
        // 忽略單一檔案清理錯誤
      }
    });

  const destPath = path.join(distDir, latestInstaller.name);
  fs.copyFileSync(latestInstaller.fullPath, destPath);

  const stats = fs.statSync(destPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('\n==================================================');
  console.log(`✔ 安裝檔已就緒：dist/${latestInstaller.name} (${sizeMB} MB)`);
  console.log('==================================================\n');
}

copyDist();
