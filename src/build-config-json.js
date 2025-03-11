const fs = require('fs');
const yaml = require('js-yaml');
const glob = require('glob');
const path = require('path');

const buildConfigJSON = async (filePaths, targetPath) => {

  // 各ファイルの内容を読み取り、適切なJSONファイルに追加
  const locationData = [];
  const standardData = [];
  const pdfData = [];

  for (const file of filePaths) {
    const fileContent = fs.readFileSync(file, 'utf-8');
    // NOTE: 20250312_6 のようなアンダースコアが含まれる数値が 202503126 に変換されるのを防ぐため、yaml.FAILSAFE_SCHEMA を指定
    const parsedYaml = yaml.load(fileContent, { schema: yaml.FAILSAFE_SCHEMA });

    switch (parsedYaml.dataType) {
      case 'location':
        locationData.push(parsedYaml);
        break;
      case 'standard':
        standardData.push(parsedYaml);
        break;
      case 'pdf':
        pdfData.push(parsedYaml);
        break;
      default:
        console.warn(`Unknown dataType in file: ${file}`);
    }
  }

  const targetDir = targetPath || __dirname

  // name（データ名） でソート
  locationData.sort((a, b) => a.name.localeCompare(b.name));
  standardData.sort((a, b) => a.name.localeCompare(b.name));
  pdfData.sort((a, b) => a.name.localeCompare(b.name));

  if (locationData.length > 0) fs.writeFileSync(path.join(targetDir, 'location-data-categories.json'), JSON.stringify(locationData));
  if (standardData.length > 0) fs.writeFileSync(path.join(targetDir, 'standard-data-categories.json'), JSON.stringify(standardData));
  if (pdfData.length > 0) fs.writeFileSync(path.join(targetDir, 'pdf-data-categories.json'), JSON.stringify(pdfData));

  console.log("Conversion completed.");
};


if (require.main === module) {
  // data/**/config.yml のすべてのファイルを取得
  const configFiles = glob.sync(path.join(__dirname, '..', 'data/**/config.yml'));
  buildConfigJSON(configFiles).catch(error => {
    console.error("Error during conversion:", error);
  });

} else {
  module.exports = buildConfigJSON;
}


