const fs = require('fs');
const csv = require('csvtojson');

// コマンドライン引数からCSVファイルパスを取得
const args = process.argv.slice(2);

if (args.length === 0) {
    console.error('エラー: CSVファイルのパスを指定してください。');
    process.exit(1);
}

const csvFilePath = args[0]; // 1つ目の引数をCSVファイルパスとして使用
const jsonFilePath = csvFilePath.replace(/\.csv$/, '.json'); // JSONファイル名を自動生成

// CSVをJSONに変換する関数
async function convertCsvToJson() {
    try {
        // ファイル存在確認
        if (!fs.existsSync(csvFilePath)) {
            console.error('エラー: 指定されたCSVファイルが存在しません:', csvFilePath);
            process.exit(1);
        }

        // CSVをJSONに変換
        const jsonArray = await csv().fromFile(csvFilePath);

        // JSONファイルに書き込み
        fs.writeFileSync(jsonFilePath, JSON.stringify(jsonArray, null, 2), 'utf-8');
        console.log('CSVからJSONへの変換が完了しました:', jsonFilePath);
    } catch (error) {
        console.error('エラーが発生しました:', error);
    }
}

// 実行
convertCsvToJson();
