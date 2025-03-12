const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const locationDataCategories = fs.existsSync('./location-data-categories.json')
  ? require('./location-data-categories.json')
  : [];
const standardDataCategories = fs.existsSync('./standard-data-categories.json')
  ? require('./standard-data-categories.json')
  : [];
const pdfDataCategories = fs.existsSync('./pdf-data-categories.json')
  ? require('./pdf-data-categories.json')
  : [];

const categories = [...locationDataCategories, ...standardDataCategories, ...pdfDataCategories];

class BuildDataUpdates {
  run() {
    const cmd = "git ls-files data | xargs -n1 -I{} git log --reverse -1 --format='%cd {}' --date=iso-local {} | sort";
    const result = execSync(cmd).toString();
    let updates = result.split("\n").map(line => {
      // NOTE: デバッグ用に出力
      console.log({line});
      if (line) {
        const parts = line.split(" ");
        if (parts.length < 4) return;
        const category = path.basename(path.dirname(parts[3]));
        // NOTE: デバッグ用に出力
        console.log({category});
        const found = categories.find(c => c.category === category);
        // JSON ファイルが存在していなかった場合はスキップ
        if (!found) return;
        return {
          date: parts[0],
          file: parts[3],
          category: category,
          category_name: found.name
        }
      }
    });

    // null を配列から除去
    updates = updates.filter(update => update);
    updates.reverse();
    const dest = fs.createWriteStream(`build/data-updates.json`);
    dest.write(JSON.stringify(updates));
  }
}

const buildDataUpdates = new BuildDataUpdates();
buildDataUpdates.run();
