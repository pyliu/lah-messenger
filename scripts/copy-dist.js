const fs = require('fs');
const path = require('path');

function resolveCargoTargetRoot() {
  if (process.env.LAH_CARGO_TARGET_ROOT && process.env.LAH_CARGO_TARGET_ROOT.trim()) {
    return path.resolve(process.env.LAH_CARGO_TARGET_ROOT.trim());
  }
  if (fs.existsSync('D:\\')) {
    return path.resolve('D:/tmp/cargo-target');
  }
  return path.resolve('/tmp/cargo-target');
}

function findBundleDir(targetType) {
  const candidates = [];
  if (process.env.CARGO_TARGET_DIR) {
    candidates.push(path.resolve(process.env.CARGO_TARGET_DIR, `release/bundle/${targetType}`));
  }
  candidates.push(path.resolve(__dirname, `../src-tauri/target/release/bundle/${targetType}`));
  candidates.push(path.resolve(__dirname, `../target/release/bundle/${targetType}`));
  const targetRootBundle = path.resolve(resolveCargoTargetRoot(), `lah-messenger/release/bundle/${targetType}`);
  candidates.push(targetRootBundle);
  const driveBundle = path.resolve(`/tmp/cargo-target/lah-messenger/release/bundle/${targetType}`);
  if (!candidates.includes(driveBundle)) {
    candidates.push(driveBundle);
  }

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
  if (process.env.KEEP_CARGO_CACHE !== '1' && !process.argv.includes('--keep-cache')) {
    const cacheRoot = resolveCargoTargetRoot();
    if (fs.existsSync(cacheRoot)) {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      for (const entry of fs.readdirSync(cacheRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.toLowerCase() === 'lah-messenger') continue;
        const full = path.join(cacheRoot, entry.name);
        try {
          if (fs.statSync(full).mtimeMs < cutoff) {
            fs.rmSync(full, { recursive: true, force: true });
            console.log(`🧹 已清除超過 1 天的過期暫存目錄：${full}`);
          }
        } catch (err) {}
      }
    }
  }
  console.log('==================================================\n');
}

copyDist();
