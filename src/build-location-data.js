const fs = require('fs');
const glob = require('glob');
const path = require('path');
const csvToGeoJSON = require('./csv-to-geojson.js');

// コマンドライン引数からディレクトリ名を取得
const targetDir = process.argv[2];

if (!targetDir) {
  console.error('Usage: node script.js <directory>');
  process.exit(1);
}

console.log(`Processing directory: ${targetDir}`);

// geojson がアップロードされている場合は build ディレクトリにコピーする
const geojsonFiles = `${targetDir}/*.geojson`;
glob(geojsonFiles, async (err, files) => {
  if (err) {
    console.error(err);
    return;
  }

  for (let j = 0; j < files.length; j++) {
    const file = files[j];
    const category = path.basename(path.dirname(file));
    const categoryPath = `build/${category}`;
    if (!fs.existsSync(categoryPath)) {
      fs.mkdirSync(categoryPath, { recursive: true });
    }

    fs.copyFileSync(file, `${categoryPath}/data.geojson`);
  }
});

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

    const category = path.basename(path.dirname(file));
    const categoryPath = `build/${category}`;
    if (!fs.existsSync(categoryPath)) {
      fs.mkdirSync(categoryPath, { recursive: true });
    }

    const dest = fs.createWriteStream(`${categoryPath}/data.geojson`);
    const csvString = fs.readFileSync(file, 'utf8');

    try {
      const data = await csvToGeoJSON(csvString);
      dest.write(JSON.stringify(data));
    } catch (err) {
      console.error(err);
      throw err;
    }

    if (files.length === 1) {
      fs.copyFileSync(file, `${categoryPath}/data.csv`);
    }
  }
});
