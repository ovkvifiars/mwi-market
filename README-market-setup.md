# MWI 价格采集与 mooket 对接（GitHub 版）

这套文件已经帮你准备好：
- 定时采集官方价格：`scripts/collect-market.mjs`
- GitHub Actions 自动跑：`.github/workflows/collect-market.yml`
- 产出给插件用的数据：
  - `data/market/api.json`
  - `data/market/history-db.json`

## 1. 上传到 GitHub

1. 新建一个 GitHub 仓库（必须是 Public，方便脚本直接读取 Raw 文件）。
2. 把当前目录文件上传到仓库。
3. 进入仓库的 `Actions` 页面，点击启用（Enable）。
4. 打开 `collect-market` 工作流，手动点一次 `Run workflow`。

## 2. 确认数据文件可访问

假设你的 GitHub 用户名是 `YOUR_NAME`，仓库名是 `YOUR_REPO`，分支是 `main`：

- `https://raw.githubusercontent.com/YOUR_NAME/YOUR_REPO/main/data/market/api.json`
- `https://raw.githubusercontent.com/YOUR_NAME/YOUR_REPO/main/data/market/history-db.json`

浏览器打开能看到 JSON 就说明成功。

## 3. 配置油猴脚本数据源

在 `https://www.milkywayidle.com/` 页面按 `F12` 打开控制台，执行：

```js
localStorage.setItem("mooket_source_config", JSON.stringify({
  apiJsonUrl: "https://raw.githubusercontent.com/YOUR_NAME/YOUR_REPO/main/data/market/api.json",
  historyDbUrl: "https://raw.githubusercontent.com/YOUR_NAME/YOUR_REPO/main/data/market/history-db.json"
}));
location.reload();
```

说明：
- `apiJsonUrl`：当前市场快照（插件实时显示/初始化用）
- `historyDbUrl`：历史数据库（插件画历史曲线用）

## 4. 采集频率和保留时长

- 当前工作流每 10 分钟执行一次。
- 价格写入按“小时桶”更新（同一小时会覆盖成该小时最新值）。
- 默认保留 90 天历史（可在工作流里改 `RETENTION_DAYS`）。

## 5. 常见问题

- 看不到更新：
  - 确认 Actions 没报错。
  - 确认仓库是 Public。
  - 手动打开 Raw URL 看 `updatedAt` 是否变化。

- 想恢复默认源：

```js
localStorage.removeItem("mooket_source_config");
location.reload();
```
