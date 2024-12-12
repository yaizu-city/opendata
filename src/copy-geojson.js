const fs = require('fs');
const glob = require('glob');
const path = require('path');
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
}
