const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const scriptPath = path.join(__dirname, '..', 'src', 'sync-to-platform.sh');

/**
 * アップロード API のスタブサーバー。
 * POST /v1/upload で受け取ったリクエストを requests に記録し、指定されたレスポンスを返す。
 * GET /status.json で status.json を返す。
 */
const startStubServer = (options = {}) => {
  const {
    uploadStatus = 202,
    uploadBody = null,
    jobStatus = 'success',
    uploadDelayMs = 0,
  } = options;

  const requests = [];
  const statusRequests = [];

  const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        requests.push({
          apiKey: req.headers['x-api-key'],
          contentType: req.headers['content-type'],
          host: req.headers.host,
          fields: parseMultipartFields(raw),
          filename: (raw.match(/name="data"; filename="([^"]*)"/) || [])[1],
          body: raw,
        });

        const port = server.address().port;
        const payload = typeof uploadBody === 'function'
          ? uploadBody(port)
          : uploadBody || {
            message: 'Request accepted. Starting to process task.',
            jobId: 'job-1',
            statusUrl: `http://127.0.0.1:${port}/status.json`,
          };
        if (uploadDelayMs > 0) {
          // 応答が返らないケースの再現。クライアントが切っていれば書き込みは捨てられる
          setTimeout(() => {
            if (!res.writableEnded) respondJson(res, uploadStatus, payload);
          }, uploadDelayMs).unref();
          return;
        }
        respondJson(res, uploadStatus, payload);
      });
      return;
    }

    statusRequests.push(req.url);
    respondJson(res, 200, {
      jobId: 'job-1',
      status: jobStatus,
      error: jobStatus === 'error'
        ? { code: 'TILE_GENERATION_FAILED', message: 'タイル生成に失敗しました' }
        : null,
      previewUrl: null,
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        requests,
        statusRequests,
        domain: `127.0.0.1:${server.address().port}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
};

const respondJson = (res, status, payload) => {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': body.length,
  });
  res.end(body);
};

/** multipart/form-data のテキストフィールドだけを name => value で取り出す */
const parseMultipartFields = (raw) => {
  const fields = {};
  const pattern = /name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n--/g;
  let match;
  while ((match = pattern.exec(raw)) !== null) {
    fields[match[1]] = match[2];
  }
  return fields;
};

/**
 * data/<name>/config.yml と build/<name>/data.geojson を持つ一時的なデータセットを作る。
 * スクリプトは data/ と build/ を相対パスで見るため、テストは cwd を一時ディレクトリにする。
 */
const createWorkspace = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-platform-'));
  // スクリプトは js-yaml を cwd の node_modules から解決するため、本番と同じ状態にする
  fs.symlinkSync(path.join(__dirname, '..', 'node_modules'), path.join(root, 'node_modules'), 'dir');
  return {
    root,
    addDataset: ({ name, config, geojson }) => {
      fs.mkdirSync(path.join(root, 'data', name), { recursive: true });
      fs.writeFileSync(path.join(root, 'data', name, 'config.yml'), config);
      if (geojson !== undefined) {
        fs.mkdirSync(path.join(root, 'build', name), { recursive: true });
        fs.writeFileSync(path.join(root, 'build', name, 'data.geojson'), geojson);
      }
      return path.join('data', name);
    },
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
};

/**
 * スクリプトを実行して stdout と終了コードを返す。
 * スタブサーバーは同じプロセスで動くので、同期実行にするとイベントループが塞がって
 * レスポンスを返せなくなる。必ず非同期で実行する。
 */
const runScript = (workspace, dirs, env = {}) => new Promise((resolve) => {
  execFile('bash', [scriptPath, ...dirs], {
    cwd: workspace.root,
    encoding: 'utf-8',
    env: {
      ...process.env,
      PLATFORM_UPLOAD_SCHEME: 'http',
      PLATFORM_API_KEY: 'test-api-key',
      PLATFORM_POLL_ATTEMPTS: '3',
      PLATFORM_POLL_INTERVAL: '1',
      ...env,
    },
  }, (error, stdout, stderr) => {
    resolve({
      code: error ? error.code : 0,
      stdout: stdout || '',
      stderr: stderr || '',
    });
  });
});

const FEATURE_COLLECTION = JSON.stringify({
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [138.32, 34.86] },
    properties: { title: 'テスト' },
  }],
});

describe('sync-to-platform.sh', () => {
  let workspace;
  let stub;

  beforeEach(() => {
    workspace = createWorkspace();
  });

  afterEach(async () => {
    workspace.cleanup();
    if (stub) {
      await stub.close();
      stub = null;
    }
  });

  it('sourceDataId があるデータセットを連携し、dataId と description を送信する', async () => {
    stub = await startStubServer();
    const dir = workspace.addDataset({
      name: 'AED設置箇所一覧',
      config: 'category: AED設置箇所一覧\nname: AED設置箇所一覧\ndataType: location\nsourceDataId: aed\n',
      geojson: FEATURE_COLLECTION,
    });

    const result = await runScript(workspace, [dir], { PLATFORM_UPLOAD_DOMAIN: stub.domain });

    expect(result.code).toBe(0);
    expect(stub.requests).toHaveLength(1);

    const request = stub.requests[0];
    expect(request.apiKey).toBe('test-api-key');
    expect(request.contentType).toMatch(/^multipart\/form-data/);
    // sourceDataId が dataId、name が description になる
    expect(request.fields.dataId).toBe('aed');
    expect(request.fields.description).toBe('AED設置箇所一覧');
    // 拡張子で種別判定されるため .geojson で送る必要がある
    expect(request.filename).toBe('aed.geojson');
    expect(request.body).toContain('FeatureCollection');
  });

  it('PLATFORM_NOTIFY_EMAIL があれば email フィールドを送る', async () => {
    stub = await startStubServer();
    const dir = workspace.addDataset({
      name: 'park',
      config: 'name: 公園一覧\ndataType: location\nsourceDataId: park\n',
      geojson: FEATURE_COLLECTION,
    });

    const result = await runScript(workspace, [dir], {
      PLATFORM_UPLOAD_DOMAIN: stub.domain,
      PLATFORM_NOTIFY_EMAIL: 'ops@example.com',
    });

    expect(result.code).toBe(0);
    expect(stub.requests[0].fields.email).toBe('ops@example.com');
  });

  it('連携先のドメインや statusUrl をログに出力しない', async () => {
    stub = await startStubServer();
    const dir = workspace.addDataset({
      name: 'aed',
      config: 'name: AED\ndataType: location\nsourceDataId: aed\n',
      geojson: FEATURE_COLLECTION,
    });

    const result = await runScript(workspace, [dir], { PLATFORM_UPLOAD_DOMAIN: stub.domain });

    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain(stub.domain);
    expect(result.stdout).not.toContain('status.json');
    // 進捗はデータ ID で分かるようにする
    expect(result.stdout).toContain('aed');
  });

  it('sourceDataId が無いデータセットはスキップし、API を呼ばない', async () => {
    stub = await startStubServer();
    const dir = workspace.addDataset({
      name: 'あかちゃんえき一覧',
      config: 'category: あかちゃんえき一覧\nname: あかちゃんえき一覧\ndataType: location\n',
      geojson: FEATURE_COLLECTION,
    });

    const result = await runScript(workspace, [dir], { PLATFORM_UPLOAD_DOMAIN: stub.domain });

    expect(result.code).toBe(0);
    expect(stub.requests).toHaveLength(0);
    expect(result.stdout).toContain('スキップ');
  });

  it('config.yml が無いディレクトリはスキップする', async () => {
    stub = await startStubServer();

    const result = await runScript(workspace, ['data/存在しないデータ'], {
      PLATFORM_UPLOAD_DOMAIN: stub.domain,
    });

    expect(result.code).toBe(0);
    expect(stub.requests).toHaveLength(0);
  });

  it('sourceDataId が API の制約に反する場合は失敗し、API を呼ばない', async () => {
    stub = await startStubServer();
    const dir = workspace.addDataset({
      name: 'invalid',
      config: 'name: 不正なID\ndataType: location\nsourceDataId: 日本語のID\n',
      geojson: FEATURE_COLLECTION,
    });

    const result = await runScript(workspace, [dir], { PLATFORM_UPLOAD_DOMAIN: stub.domain });

    expect(result.code).toBe(1);
    expect(stub.requests).toHaveLength(0);
  });

  it('sourceDataId が 32 文字を超える場合は失敗する', async () => {
    stub = await startStubServer();
    const dir = workspace.addDataset({
      name: 'toolong',
      config: `name: 長すぎるID\ndataType: location\nsourceDataId: ${'a'.repeat(33)}\n`,
      geojson: FEATURE_COLLECTION,
    });

    const result = await runScript(workspace, [dir], { PLATFORM_UPLOAD_DOMAIN: stub.domain });

    expect(result.code).toBe(1);
    expect(stub.requests).toHaveLength(0);
  });

  it('GeoJSON が生成されていない場合は失敗する', async () => {
    stub = await startStubServer();
    const dir = workspace.addDataset({
      name: 'nogeojson',
      config: 'name: GeoJSONなし\ndataType: location\nsourceDataId: nogeojson\n',
    });

    const result = await runScript(workspace, [dir], { PLATFORM_UPLOAD_DOMAIN: stub.domain });

    expect(result.code).toBe(1);
    expect(stub.requests).toHaveLength(0);
  });

  it('build/ に GeoJSON が無い場合は data/ 側にフォールバックする', async () => {
    stub = await startStubServer();
    fs.mkdirSync(path.join(workspace.root, 'data', 'fallback'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace.root, 'data', 'fallback', 'config.yml'),
      'name: フォールバック\ndataType: location\nsourceDataId: fallback\n',
    );
    fs.writeFileSync(
      path.join(workspace.root, 'data', 'fallback', 'data.geojson'),
      FEATURE_COLLECTION,
    );

    const result = await runScript(workspace, ['data/fallback'], {
      PLATFORM_UPLOAD_DOMAIN: stub.domain,
    });

    expect(result.code).toBe(0);
    expect(stub.requests).toHaveLength(1);
  });

  it('アップロード API がエラーを返したら失敗する', async () => {
    stub = await startStubServer({
      uploadStatus: 400,
      uploadBody: { message: 'Bad Request: only .zip, .geojson, or .json is supported' },
    });
    const dir = workspace.addDataset({
      name: 'badrequest',
      config: 'name: エラー\ndataType: location\nsourceDataId: badrequest\n',
      geojson: FEATURE_COLLECTION,
    });

    const result = await runScript(workspace, [dir], { PLATFORM_UPLOAD_DOMAIN: stub.domain });

    expect(result.code).toBe(1);
    expect(result.stdout).toContain('HTTP 400');
  });

  it('タイル生成が失敗したら失敗する', async () => {
    stub = await startStubServer({ jobStatus: 'error' });
    const dir = workspace.addDataset({
      name: 'tileerror',
      config: 'name: タイル生成失敗\ndataType: location\nsourceDataId: tileerror\n',
      geojson: FEATURE_COLLECTION,
    });

    const result = await runScript(workspace, [dir], { PLATFORM_UPLOAD_DOMAIN: stub.domain });

    expect(result.code).toBe(1);
    expect(result.stdout).toContain('TILE_GENERATION_FAILED');
  });

  it('タイル生成が終わらない場合はタイムアウトして失敗する', async () => {
    stub = await startStubServer({ jobStatus: 'processing' });
    const dir = workspace.addDataset({
      name: 'timeout',
      config: 'name: タイムアウト\ndataType: location\nsourceDataId: timeout\n',
      geojson: FEATURE_COLLECTION,
    });

    const result = await runScript(workspace, [dir], {
      PLATFORM_UPLOAD_DOMAIN: stub.domain,
      PLATFORM_POLL_ATTEMPTS: '2',
    });

    expect(result.code).toBe(1);
    expect(result.stdout).toContain('タイムアウト');
  });

  it('1 リクエストが複数データセットに分割された場合は全ての statusUrl を待つ', async () => {
    stub = await startStubServer({
      uploadBody: (port) => ({
        message: 'Request accepted. Starting to process task.',
        jobId: 'job-1',
        statusUrl: `http://127.0.0.1:${port}/status.json`,
        results: [
          { dataId: 'multi-1', jobId: 'job-1', statusUrl: `http://127.0.0.1:${port}/status.json` },
          { dataId: 'multi-2', jobId: 'job-2', statusUrl: `http://127.0.0.1:${port}/status2.json` },
        ],
      }),
    });

    const dir = workspace.addDataset({
      name: 'multi',
      config: 'name: 複数分割\ndataType: location\nsourceDataId: multi\n',
      geojson: FEATURE_COLLECTION,
    });

    const result = await runScript(workspace, [dir], { PLATFORM_UPLOAD_DOMAIN: stub.domain });

    expect(result.code).toBe(0);
    // statusUrl は重複排除されるので 2 件を待つ
    expect(result.stdout).toContain('(1/2)');
    expect(result.stdout).toContain('(2/2)');
  });

  it('複数データセットのうち一部が失敗しても残りは連携し、最後に失敗を返す', async () => {
    stub = await startStubServer();
    const ok = workspace.addDataset({
      name: 'ok',
      config: 'name: 成功する\ndataType: location\nsourceDataId: ok\n',
      geojson: FEATURE_COLLECTION,
    });
    const ng = workspace.addDataset({
      name: 'ng',
      config: 'name: 失敗する\ndataType: location\nsourceDataId: 不正\n',
      geojson: FEATURE_COLLECTION,
    });

    const result = await runScript(workspace, [ng, ok], { PLATFORM_UPLOAD_DOMAIN: stub.domain });

    expect(result.code).toBe(1);
    // 先に失敗しても後続の連携は実行される
    expect(stub.requests).toHaveLength(1);
    expect(stub.requests[0].fields.dataId).toBe('ok');
  });

  it('連携対象があるのに接続先ドメインが未設定なら失敗し、API を呼ばない', async () => {
    stub = await startStubServer();
    const dir = workspace.addDataset({
      name: 'noenv',
      config: 'name: 環境変数なし\ndataType: location\nsourceDataId: noenv\n',
      geojson: FEATURE_COLLECTION,
    });

    const result = await runScript(workspace, [dir], { PLATFORM_UPLOAD_DOMAIN: '' });

    // 設定ミスによる連携漏れを見逃さないよう、スキップではなくエラーにする
    expect(result.code).toBe(1);
    expect(stub.requests).toHaveLength(0);
    expect(result.stderr).toContain('PLATFORM_UPLOAD_DOMAIN');
  });

  it('連携対象があるのに API キーが未設定なら失敗する', async () => {
    stub = await startStubServer();
    const dir = workspace.addDataset({
      name: 'nokey',
      config: 'name: キーなし\ndataType: location\nsourceDataId: nokey\n',
      geojson: FEATURE_COLLECTION,
    });

    const result = await runScript(workspace, [dir], {
      PLATFORM_UPLOAD_DOMAIN: stub.domain,
      PLATFORM_API_KEY: '',
    });

    expect(result.code).toBe(1);
    expect(stub.requests).toHaveLength(0);
    expect(result.stderr).toContain('PLATFORM_API_KEY');
  });

  it('連携対象が無ければ接続情報が未設定でも正常終了する', async () => {
    const dir = workspace.addDataset({
      name: '対象外',
      config: 'name: 対象外\ndataType: location\n',
      geojson: FEATURE_COLLECTION,
    });

    const result = await runScript(workspace, [dir], {
      PLATFORM_UPLOAD_DOMAIN: '',
      PLATFORM_API_KEY: '',
    });

    expect(result.code).toBe(0);
  });

  it('アップロード API が応答しない場合はタイムアウトして失敗する', async () => {
    stub = await startStubServer({ uploadDelayMs: 5000 });
    const dir = workspace.addDataset({
      name: 'hang',
      config: 'name: 応答なし\ndataType: location\nsourceDataId: hang\n',
      geojson: FEATURE_COLLECTION,
    });

    const result = await runScript(workspace, [dir], {
      PLATFORM_UPLOAD_DOMAIN: stub.domain,
      PLATFORM_UPLOAD_MAX_TIME: '1',
    });

    // タイムアウトせずジョブが張り付くと、この期待は満たされない
    expect(result.code).toBe(1);
    expect(result.stdout).toContain('接続に失敗');
  }, 20000);

  it('ステータス取得はキャッシュを避けるため毎回異なる URL で問い合わせる', async () => {
    stub = await startStubServer({ jobStatus: 'processing' });
    const dir = workspace.addDataset({
      name: 'cachebust',
      config: 'name: キャッシュ回避\ndataType: location\nsourceDataId: cachebust\n',
      geojson: FEATURE_COLLECTION,
    });

    const result = await runScript(workspace, [dir], {
      PLATFORM_UPLOAD_DOMAIN: stub.domain,
      PLATFORM_POLL_ATTEMPTS: '3',
    });

    expect(result.code).toBe(1);
    expect(stub.statusRequests).toHaveLength(3);
    // status.json は CloudFront 配信のため、同じ URL だと古い応答を掴み続けうる
    expect(stub.statusRequests.every((url) => /[?&]_=/.test(url))).toBe(true);
    expect(new Set(stub.statusRequests).size).toBe(stub.statusRequests.length);
  });

  it('引数が無い場合は使い方を表示して失敗する', async () => {
    const result = await runScript(workspace, [], { PLATFORM_UPLOAD_DOMAIN: 'example.invalid' });

    expect(result.code).toBe(1);
    expect(result.stdout).toContain('Usage');
  });
});
