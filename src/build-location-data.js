const fs = require('fs');
const glob = require('glob');
const path = require('path');
const iconv = require('iconv-lite');
const csvToGeoJSON = require('./csv-to-geojson.js');

// CSVの文字コードを自動判定して読み込む。
// 焼津市等から提供されるCSVはUTF-8が基本だが、Excel等からのエクスポートで
// Shift_JIS/CP932のまま提供されるケースがある。UTF-8として不正なバイト列が
// あればShift_JIS/CP932とみなして読み直す（元ファイルは書き換えない）。
function readCsvAutoDetect(file) {
  const buffer = fs.readFileSync(file);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch (e) {
    console.warn(`警告: ${file} は有効なUTF-8として読み込めませんでした。Shift_JIS/CP932として読み込みます。`);
    return iconv.decode(buffer, 'shift_jis');
  }
}

// コマンドライン引数からディレクトリ名を取得
const targetDir = process.argv[2];

if (!targetDir) {
  console.error('Usage: node script.js <directory>');
  process.exit(1);
}

console.log(`Processing directory: ${targetDir}`);

// csv を geojson に変換して build ディレクトリに保存する
const csvFiles = `${targetDir}/*.csv`;
glob(csvFiles, async (err, files) => {
  if (err) {
    console.error(err);
    return;
  }

  for (let j = 0; j < files.length; j++) {
    const file = files[j];

    // 属性翻訳ファイルの場合は geojson に変換しない
    if (path.basename(file) === 'attributes.csv') {
      continue;
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const dest = fs.createWriteStream(`${targetDir}/data.geojson`);
    const csvString = readCsvAutoDetect(file);

    try {
      const data = await csvToGeoJSON(csvString);
      dest.write(JSON.stringify(data));
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
});
