const fs = require('fs');
const glob = require('glob');
const path = require('path');

const locationDataCategoriesPath = path.resolve(__dirname, 'location-data-categories.json');
const standardDataCategoriesPath = path.resolve(__dirname, 'standard-data-categories.json');

class BuildApi {
  run() {
    const data = [];

    if (fs.existsSync(locationDataCategoriesPath)) {
      const locationDataCategories = JSON.parse(fs.readFileSync(locationDataCategories));

      for (let i = 0; i < locationDataCategories.length; i++) {
        const category = locationDataCategories[i];

        const csvFileUrl = `https://yaizu-smartcity.jp/${category.category}/data.csv`;
        const jsonFileUrl = `https://yaizu-smartcity.jp/${category.category}/data.geojson`;

        data.push(
          {
            "name": category.name,
            "csv": csvFileUrl,
            "json": jsonFileUrl,
            "location": true
          }
        );
      }
    }

    if (fs.existsSync(standardDataCategoriesPath)) {
      const standardDataCategories = JSON.parse(fs.readFileSync(standardDataCategories));

      for (let i = 0; i < standardDataCategories.length; i++) {
        const category = standardDataCategories[i];

        const csvFilesPattern = `data/${category.category}/*.csv`;

        // 最新順にソート
        const csvFiles = glob.sync(csvFilesPattern).reverse();

        const csvs = []
        const jsons = []
        csvFiles.map(file => {
          const filename = path.basename(file, '.csv');
          const jsonFileUrl = `https://yaizu-smartcity.jp/${category.category}/${filename}.json`;
          const csvFileUrl = `https://yaizu-smartcity.jp/${category.category}/${filename}.csv`;
          csvs.push(csvFileUrl)
          jsons.push(jsonFileUrl);
        });

        const defaultJsonFileUrl = `https://yaizu-smartcity.jp/${category.category}/data.json`;
        const defaultCsvFileUrl = `https://yaizu-smartcity.jp/${category.category}/data.csv`;

        data.push(
          {
            "name": category.name,
            "csv": csvs.length > 1 ? [defaultCsvFileUrl].concat(csvs) : defaultCsvFileUrl,
            "json": jsons.length > 1 ? [defaultJsonFileUrl].concat(jsons) : defaultJsonFileUrl,
            "location": false
          }
        )
      }
    }

    // build ディレクトリがない場合は作成する
    if (!fs.existsSync('build')) {
      fs.mkdirSync('build', { recursive: true });
    }

    const dest = fs.createWriteStream(`build/index.json`);
    dest.write(JSON.stringify(data));
  }
}

const buildApi = new BuildApi();
buildApi.run();
