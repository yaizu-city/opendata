const fs = require('fs');
const glob = require('glob');
const path = require('path');

const locationDataCategoriesPath = path.resolve(__dirname, 'location-data-categories.json');
const standardDataCategoriesPath = path.resolve(__dirname, 'standard-data-categories.json');

class BuildReadme {
  run() {
    const opendataViewerUrl = "https://geolonia.github.io/opendata-editor/";
    let readme = "# 焼津オープンデータカタログ\n\n";
    readme += "焼津市では、以下の地図データをオープンデータとして提供しています。\n\nご利用にあたっては、[焼津市オープンデータカタログ利用規約](https://yaizu-smartcity.jp/%E7%84%BC%E6%B4%A5%E3%82%AA%E3%83%BC%E3%83%95%E3%82%9A%E3%83%B3%E3%83%86%E3%82%99%E3%83%BC%E3%82%BF%E3%82%AB%E3%82%BF%E3%83%AD%E3%82%AF%E3%82%99%E5%88%A9%E7%94%A8%E8%A6%8F%E7%B4%8420250306.pdf) をご確認ください。\n\n";
    readme += "[本データ](https://github.com/yaizu-city/opendata/tree/main/data)は、[公共データ利用規約（第1.0版）](https://www.digital.go.jp/resources/open_data/public_data_license_v1.0)の下に提供されています。\n\n";
    readme += "なお、このリポジトリに含まれるソースコードは、上記ライセンスの適用外です。\n\n";
    readme += "## ▼焼津オープンデータカタログの使い方\n\n";
    readme += "- 表内の **「CSV」** や **「GeoJSON」** 、 **「JSON」**、 **「TileJSON」**をクリックすると、最新の該当データが得られます。\n\n - 「フォルダ」には、xlsxファイルが格納されています。\n\n - CSVファイルダウンロード時、文字化けする場合は、xlsxファイルをダウンロードしてください。\n\n - 位置情報を含むデータを編集する場合には、**編集**リンクをクリックします。データが地図上に表示され、表組み形式でデータを編集し、編集済みデータをダウンロードすることができます。\n\n";

    if (fs.existsSync(locationDataCategoriesPath)) {

      const locationDataCategoriesRaw = fs.readFileSync(locationDataCategoriesPath);
      const locationDataCategories = JSON.parse(locationDataCategoriesRaw);

      // locationDataCategories が存在する場合のみ処理
      if (locationDataCategories.length > 0) {

        readme += "| データ名 | フォルダ | CSV | GeoJSON | TileJSON | 地図で編集 |\n";
        readme += "| --- | --- | --- | --- | --- | --- |\n";
    
        for (let i = 0; i < locationDataCategories.length; i++) {
          const category = locationDataCategories[i];
          const csvFile = glob.sync(`data/${category.category}/*.csv`)[0];
          const csvFolderUrl = `https://github.com/yaizu-city/opendata/tree/main/data/${category.category}`;
          const csvFileUrl = `https://yaizu-smartcity.jp/${category.category}/data.csv`;
          const jsonFileUrl = `https://yaizu-smartcity.jp/${category.category}/data.geojson`;
          const tileJsonFileUrl = `https://yaizu-smartcity.jp/tiles/opendata/${category.category}/tiles.json`;
          const mapUrl = `${opendataViewerUrl}?data=${csvFileUrl}`;
  
          if (!csvFile || path.basename(csvFile) === "attributes.csv") {
            readme += `| ${category.name} | [フォルダ](${csvFolderUrl}) | [GeoJSON](${jsonFileUrl}) | [TileJSON](${tileJsonFileUrl}) |\n`;
          } else {
            readme += `| ${category.name} | [フォルダ](${csvFolderUrl}) | [CSV](${csvFileUrl}) | [GeoJSON](${jsonFileUrl}) | [TileJSON](${tileJsonFileUrl}) | [編集](${mapUrl}) |\n`;
          }
        }
      }
    }

    if (fs.existsSync(standardDataCategoriesPath)) {

      const standardDataCategoriesRaw = fs.readFileSync(standardDataCategoriesPath);
      const standardDataCategories = JSON.parse(standardDataCategoriesRaw);

      // standardDataCategories が存在する場合のみ処理
      if (standardDataCategories.length > 0) {

        readme += "\n以下のデータは位置情報を含まないデータです。\n\n";
        readme += "| データ名 | フォルダ | CSV | JSON |\n";
        readme += "| --- | --- | --- | --- |\n";

        for (let i = 0; i < standardDataCategories.length; i++) {
          const category = standardDataCategories[i];
          const csvFolderUrl = `https://github.com/yaizu-city/opendata/tree/main/data/${category.category}`;
          const csvFileUrl = `https://yaizu-smartcity.jp/${category.category}/data.csv`;
          const jsonFileUrl = `https://yaizu-smartcity.jp/${category.category}/data.json`;

          if (category.category === "city_planning_basic_survey_information") {
            const csvFiles = glob.sync(`data/${category.category}/*.csv`);
            const xlsxFiles = glob.sync(`data/${category.category}/*.xlsx`);
            const mixedFiles = csvFiles.concat(xlsxFiles);
            const allFileNames = [...new Set(mixedFiles.map(file => path.basename(file, path.extname(file))))];

            allFileNames.map(filename => {
              const jsonFileUrl = `https://yaizu-smartcity.jp/${category.category}/${filename}.json`;
              const csvFileUrl = `https://yaizu-smartcity.jp/${category.category}/${filename}.csv`;
              const subCategory = filename.split('_')[1];
              if (filename === allFileNames[0]) {
                readme += `| ${category.name} | [フォルダ](${csvFolderUrl}) | [CSV(${subCategory})](${csvFileUrl}) | [JSON(${subCategory})](${jsonFileUrl}) |\n`;
              } else {
                readme += `||| [CSV(${subCategory})](${csvFileUrl}) | [JSON(${subCategory})](${jsonFileUrl}) |\n`;
              }
            });
          } else if (category.historical) {
            readme += `| ${category.name} | [フォルダ](${csvFolderUrl}) | [CSV(最新データ)](${csvFileUrl}) | [JSON(最新データ)](${jsonFileUrl}) |\n`;
          } else {
            readme += `| ${category.name} | [フォルダ](${csvFolderUrl}) | [CSV](${csvFileUrl}) | [JSON](${jsonFileUrl}) |\n`;
          }
        }
      }
    }

    readme += "## 備考\n";
    readme += "- Excel から CSV に変換する際、CSVに出力される値は、Excel のセル書式で指定された値が出力されます。\n";
    readme += "- 日付（セル書式：日付、ユーザー定義）については、`m/d/yy` 形式で CSV に出力されます。ご注意ください。\n";

    fs.writeFileSync("README.md", readme);
  }
}

const buildReadme = new BuildReadme();
buildReadme.run();