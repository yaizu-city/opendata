#!/usr/bin/env node
/**
 * aggregate-to-excel.js
 *
 * このスクリプトは、ひとつ上の階層にある data ディレクトリ内の各データセットについて、
 * ・data/<各ディレクトリ>/data.geojson から元データの属性（プロパティ名）を抽出し、
 * ・同一ディレクトリ内の attributes.csv から { original_name, display_name } のマッピングを取得し、
 * ・同一ディレクトリ内の config.yml の name をシート上部（1行目）に表示し、
 * シート名はディレクトリ名（31文字超は先頭31文字に切り捨て）とします。
 *
 * また、特定のデータセットについてはハードコードされた属性定義を使用し、
 * 「属性なし」や「非掲載」となっているデータはシート作成をスキップします。
 *
 * 利用方法:
 *   node aggregate-to-excel.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const XLSX = require('xlsx');

// --- 必要な関数定義 ---
// geojson から属性（properties キーのユニオン）を取得する関数
function extractAttributes(geojsonPath) {
  const attributeSet = new Set();
  if (!fs.existsSync(geojsonPath)) {
    console.warn(`ファイルが存在しません: ${geojsonPath}`);
    return attributeSet;
  }
  try {
    const content = fs.readFileSync(geojsonPath, 'utf8');
    const geojson = JSON.parse(content);
    if (geojson.features && Array.isArray(geojson.features)) {
      geojson.features.forEach(feature => {
        if (feature.properties && typeof feature.properties === 'object') {
          Object.keys(feature.properties).forEach(key => attributeSet.add(key));
        }
      });
    } else {
      console.warn(`features が存在しないか配列ではありません: ${geojsonPath}`);
    }
  } catch (err) {
    console.error(`JSON のパースエラー: ${geojsonPath}`, err);
  }
  return attributeSet;
}

// attributes.csv から mapping を取得する関数
function extractAttributeMapping(csvPath) {
  const mapping = {};
  if (!fs.existsSync(csvPath)) {
    console.warn(`attributes.csv が存在しません: ${csvPath}`);
    return mapping;
  }
  const content = fs.readFileSync(csvPath, 'utf8');
  const lines = content.split(/\r?\n/);
  if (lines.length < 2) {
    return mapping;
  }
  const header = lines[0].split(',');
  const originalIdx = header.indexOf('original_name');
  const displayIdx = header.indexOf('display_name');
  if (originalIdx === -1) {
    console.warn(`original_name カラムが見つかりません: ${csvPath}`);
    return mapping;
  }
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = lines[i].split(',');
    if (cols.length > originalIdx) {
      const original = cols[originalIdx].trim();
      const display = (cols.length > displayIdx ? cols[displayIdx].trim() : "");
      mapping[original] = display;
    }
  }
  return mapping;
}

// 通常の属性抽出処理（attributes.csv, data.geojson）
function extractDefaultAttributes(datasetDir) {
  const geojsonPath = path.join(datasetDir, 'data.geojson');
  const attributesCsvPath = path.join(datasetDir, 'attributes.csv');
  const rawAttrs = extractAttributes(geojsonPath);
  const attrMapping = extractAttributeMapping(attributesCsvPath);
  const attrArr = Array.from(rawAttrs).sort();
  return attrArr.map(attr => ({
    raw: attr,
    display: attrMapping[attr] || "",
    flag: (attr in attrMapping && attrMapping[attr] !== "") ? "表示" : "非表示"
  }));
}

// config.yml から name を取得する関数
function extractConfigName(configPath) {
  if (!fs.existsSync(configPath)) {
    console.warn(`config.yml が存在しません: ${configPath}`);
    return "";
  }
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(content);
    return config && config.name ? String(config.name) : "";
  } catch (err) {
    console.error(`YAML のパースエラー: ${configPath}`, err);
    return "";
  }
}

// --- ハードコード属性定義のマッピング ---
const datasetMapping = [
  { pattern: /航空写真/, process: "skip" },
  { pattern: /用水受益区域図/, process: "skip" },
  { pattern: /大絵図/, process: "skip" },
  { pattern: /道路台帳図/, process: "skip" },
  { pattern: /地盤調査箇所図/, process: "skip" },
  { pattern: /街路樹管理図面/, process: "skip" },
  { pattern: /指定道路網図/, process: "skip" },
  { pattern: /配水管管網図/, process: "skip" },
  { pattern: /雨水汚水管路図/, process: "skip" },
  { pattern: /選挙ポスター掲示場位置図/, process: "skip" },

  { pattern: /路線価格図/, process: "hardcode", attributes: [
      { raw: "EL", display: "内部 ID", flag: "非表示" },
      { raw: "XMAX", display: "X 座標最大値", flag: "非表示" },
      { raw: "YMAX", display: "Y 座標最大値", flag: "非表示" },
      { raw: "XMIN", display: "X 座標最小値", flag: "非表示" },
      { raw: "YMIN", display: "Y 座標最小値", flag: "非表示" },
      { raw: "LTP", display: "線種番号", flag: "非表示" },
      { raw: "LAY", display: "階層番号", flag: "非表示" },
      { raw: "ANG", display: "データ角度", flag: "非表示" },
      { raw: "POINT", display: "データ原点位置", flag: "非表示" },
      { raw: "ROSEN_N", display: "路線番号路線価番号", flag: "表示" },
      { raw: "GAIRO_F", display: "主要な街路コード", flag: "非表示" },
      { raw: "ROSEN_K", display: "R６路線価路線価", flag: "表示" },
      { raw: "YOUTO", display: "用途地区分コード", flag: "非表示" },
      { raw: "JITEN_K", display: "時点修正期間コード", flag: "非表示" },
      { raw: "JITEN_1", display: "時点修正率 1", flag: "表示" },
      { raw: "ROSEN_K_J1", display: "時点修正反映後路線価時点修正率 1 反映路線価", flag: "表示" },
      { raw: "JYOU", display: "状況類似地域番号", flag: "非表示" }
    ]},
  { pattern: /標準宅地/, process: "hardcode", attributes: [
      { raw: "EL", display: "内部 ID", flag: "非表示" },
      { raw: "XMAX", display: "X 座標最大値", flag: "非表示" },
      { raw: "YMAX", display: "Y 座標最大値", flag: "非表示" },
      { raw: "XMIN", display: "X 座標最小値", flag: "非表示" },
      { raw: "YMIN", display: "Y 座標最小値", flag: "非表示" },
      { raw: "LTP", display: "線種番号", flag: "非表示" },
      { raw: "LAY", display: "階層番号", flag: "非表示" },
      { raw: "ANG", display: "データ角度", flag: "非表示" },
      { raw: "POINT", display: "データ原点位置", flag: "非表示" },
      { raw: "HYOTK_N", display: "標準宅地番号", flag: "表示" },
      { raw: "HYOTK_F", display: "標準宅地フラグ", flag: "非表示" },
      { raw: "SYOZAI", display: "SYOZAI", flag: "非表示" },
      { raw: "YOUTO", display: "用途地区分コード", flag: "非表示" },
      { raw: "HYOTA_K", display: "価格", flag: "非表示" },
      { raw: "JITEN_K", display: "時点修正期間コード", flag: "非表示" },
      { raw: "JITEN_1", display: "時点修正率 1", flag: "非表示" },
      { raw: "HYOTA_K_J1", display: "時点修正率 1 反映路線価", flag: "非表示" },
      { raw: "JYOU", display: "状況類似地域番号", flag: "非表示" }
    ]},
  { pattern: /状況類似地区/, process: "hardcode", attributes: [
      { raw: "EL", display: "内部 ID", flag: "非表示" },
      { raw: "XMAX", display: "図面名", flag: "非表示" },
      { raw: "YMAX", display: "X 座標最大値", flag: "非表示" },
      { raw: "XMIN", display: "Y 座標最大値", flag: "非表示" },
      { raw: "YMIN", display: "X 座標最小値", flag: "非表示" },
      { raw: "LTP", display: "Y 座標最小値", flag: "非表示" },
      { raw: "LAY", display: "線種番号", flag: "非表示" },
      { raw: "ANG", display: "階層番号", flag: "非表示" },
      { raw: "POINT", display: "データ角度", flag: "非表示" },
      { raw: "JKONO", display: "状況類似地域番号", flag: "表示" },
      { raw: "YOUTO", display: "用途地区分コード", flag: "非表示" },
      { raw: "JITEN_K", display: "時点修正期間コード", flag: "非表示" },
      { raw: "JITEN_1", display: "時点修正率 1", flag: "非表示" },
      { raw: "GAIRO_N", display: "主要な街路路線価番号", flag: "非表示" }
    ]},
  { pattern: /防災地図.*地震予測図/, process: "hardcode", attributes: [
      { raw: "EW", display: "メッシュの中心座標(X,東西)", flag: "表示" },
      { raw: "NS", display: "メッシュの中心座標(Y,南北)", flag: "表示" },
      { raw: "最高水位", display: "メッシュにおける最大水位(T.P.m)", flag: "表示" },
      { raw: "最大浸水深", display: "メッシュにおける最大浸水深(m)", flag: "表示" },
      { raw: "標高変動後", display: "断層運動に伴う地殻変動後の標高(m)", flag: "表示" },
      { raw: "地殻変動量", display: "断層運動に伴う地殻の上下変動量(m)", flag: "表示" },
      { raw: "到達1cm", display: "浸水深が1cmに到達する時間（秒）", flag: "表示" },
      { raw: "到達30cm", display: "浸水深が30cmに到達する時間（秒）", flag: "表示" },
      { raw: "到達50cm", display: "浸水深が50cmに到達する時間（秒）", flag: "表示" },
      { raw: "到達1m", display: "浸水深が1mに到達する時間（秒）", flag: "表示" },
      { raw: "到達3m", display: "浸水深が3mに到達する時間（秒）", flag: "表示" },
      { raw: "到達5m", display: "浸水深が5mに到達する時間（秒）", flag: "表示" },
      { raw: "到達10m", display: "浸水深が10mに到達する時間（秒）", flag: "表示" },
      { raw: "到達20m", display: "浸水深が20mに到達する時間（秒）", flag: "表示" },
      { raw: "到達30m", display: "浸水深が30mに到達する時間（秒）", flag: "表示" },
      { raw: "到達40m", display: "浸水深が40mに到達する時間（秒）", flag: "表示" },
      { raw: "到達_最高水位", display: "浸水深が最大に到達する時間（秒）", flag: "表示" }
    ]},
  { pattern: /路線網図/, process: "hardcode", attributes: [
      { raw: "EX1", display: "例属性1", flag: "表示" }
    ]},
  { pattern: /^SC_1/, process: "hardcode", attributes: [
      { raw: "EL", display: "内部 ID", flag: "非表示" },
      { raw: "XMAX", display: "X 座標最大値", flag: "非表示" },
      { raw: "YMAX", display: "Y 座標最大値", flag: "非表示" },
      { raw: "XMIN", display: "X 座標最小値", flag: "非表示" },
      { raw: "YMIN", display: "Y 座標最小値", flag: "非表示" },
      { raw: "LTP", display: "線種番号", flag: "非表示" },
      { raw: "LAY", display: "階層番号", flag: "非表示" },
      { raw: "ANG", display: "データ角度", flag: "非表示" },
      { raw: "POINT", display: "データ原点位置", flag: "非表示" },
      { raw: "ROSEN_N", display: "路線番号路線価番号", flag: "表示" },
      { raw: "GAIRO_F", display: "主要な街路コード", flag: "非表示" },
      { raw: "ROSEN_K", display: "R６路線価路線価", flag: "表示" },
      { raw: "YOUTO", display: "用途地区分コード", flag: "非表示" },
      { raw: "JITEN_K", display: "時点修正期間コード", flag: "非表示" },
      { raw: "JITEN_1", display: "時点修正率 1", flag: "表示" },
      { raw: "ROSEN_K_J1", display: "時点修正反映後路線価時点修正率 1 反映路線価", flag: "表示" },
      { raw: "JYOU", display: "状況類似地域番号", flag: "非表示" }
    ]},
  // その他 SC系、その他のハードコードがあれば追加
];

function getMappingForDirectory(dirName) {
  for (const item of datasetMapping) {
    if (item.pattern.test(dirName)) {
      return item;
    }
  }
  return { process: "default" };
}

// --- ディレクトリ操作 ---
const dataDir = path.join(__dirname, '..', 'data');
const processedPrefixes = new Set();
const directories = fs.readdirSync(dataDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

// 新規 Excel ワークブック作成
const workbook = XLSX.utils.book_new();

directories.forEach(dirName => {
  // プレフィックスでグループ化（例："通学路_" でまとめる）
  let useDir = true;
  if (dirName.includes('_')) {
    const prefix = dirName.split('_')[0] + '_';
    if (processedPrefixes.has(prefix)) {
      useDir = false;
    } else {
      processedPrefixes.add(prefix);
    }
  }
  if (!useDir) return;

  const datasetDir = path.join(dataDir, dirName);
  const configPath = path.join(datasetDir, 'config.yml');

  // マッピング判定
  const mapping = getMappingForDirectory(dirName);
  if (mapping.process === "skip") {
    console.log(`スキップ: ${dirName} は属性なし/非掲載のためシート作成をスキップします。`);
    return;
  }

  // シート名はディレクトリ名（31文字超は切り捨て）
  let sheetName = dirName;
  if (sheetName.length > 31) {
    sheetName = sheetName.slice(0, 31);
  }

  // config.yml から name を取得
  const configName = extractConfigName(configPath);

  // シートデータ初期化：1行目に configName、2行目にヘッダー
  const sheetData = [];
  sheetData.push([configName, "", ""]);
  sheetData.push(["元データの属性名", "表示用の属性名", "表示/非表示"]);

  let attributes;
  if (mapping.process === "hardcode") {
    attributes = mapping.attributes;
  } else { // default
    attributes = extractDefaultAttributes(datasetDir);
  }

  if (!attributes || attributes.length === 0) {
    sheetData.push(["属性データがありません。属性定義を入力してください。", "", ""]);
    console.log(`注意: ${dirName} の属性データが入力されていません。属性定義を入力してください。`);
  } else {
    attributes.forEach(attr => {
      sheetData.push([attr.raw, attr.display, attr.flag]);
    });
  }

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
});

const outputFile = path.join(__dirname, '..', 'aggregated_attributes.xlsx');
XLSX.writeFile(workbook, outputFile);
console.log(`Excel ファイルを ${outputFile} に出力しました。`);
