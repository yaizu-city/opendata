const fs = require('fs');
const glob = require('glob');
const path = require('path');
const csvToGeoJSON = require('./csv-to-geojson.js');

const categories = require('./location-data-categories.json');

for (let i = 0; i < categories.length; i++) {
  const category = categories[i].category;

  // geojson がアップロードされている場合は build ディレクトリにコピーする
  const geojsonFiles = `data/${category}/*.geojson`;
  glob(geojsonFiles, async (err, files) => {
    for(let j = 0; j < files.length; j++) {
      const file = files[j];
      const category = path.basename(path.dirname(file));
      const categoryPath = `build/${category}`;
      if (!fs.existsSync(categoryPath)) {
        fs.mkdirSync(categoryPath, { recursive: true });
      }

      fs.copyFileSync(file, `${categoryPath}/data.geojson`);
    };
  });

  // csv を geojson に変換して build ディレクトリに保存する
  const csvFiles = `data/${category}/*.csv`;
  glob(csvFiles, async (err, files) => {
    for(let j = 0; j < files.length; j++) {
      const file = files[j];

      // 属性翻訳ファイルの場合は geojson に変換しない
      if (path.basename(file) === 'attributes.csv') {
        continue;
      }

      const category = path.basename(path.dirname(file));
      const categoryPath = `data/${category}`;
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
    };
  });
}
