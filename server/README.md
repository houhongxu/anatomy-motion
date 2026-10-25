# 后端服务 / Backend service

中文：Node 20 + Express + SQLite 提供账号与按日期保存的训练反馈。数据库保存在 `server/data/anatomy.sqlite`，通过 `DATABASE_PATH` 可指定绝对路径；数据目录及环境文件不得提交。此服务读取根目录 `shared/anatomy-manifest.json`，仅接受肌肉/肌腱及清单中匹配的左右侧，骨骼仅供显示。

English: Node 20, Express and SQLite provide accounts and dated training feedback. The default database is `server/data/anatomy.sqlite`; set `DATABASE_PATH` to use an absolute path. Do not commit data or environment files. The service loads `shared/anatomy-manifest.json` and accepts only muscles/tendons with the manifest's matching side; bones are display-only.

## 运行 / Run

```sh
cd server
npm ci
npm test
APP_ORIGIN=http://localhost:3000 npm start
```

中文：示例环境文件不会自动加载；通过 shell 或进程管理器传入变量。服务器从 `creator/build/web-desktop` 提供 Cocos 网页构建，通过 `/models` 提供根目录模型资源；`WEB_ROOT` 可覆盖网页构建目录。缺失资源返回 404，不回退为 HTML。超过 1 KiB 的可压缩资源会按客户端 Accept-Encoding 自动使用 gzip/deflate，减小模型传输体积。生产环境必须使用 HTTPS，设 `NODE_ENV=production` 及准确的 `APP_ORIGIN=https://your-host`。默认仅监听 `127.0.0.1:3000`，可用 `HOST`、`PORT` 调整。代理终止 HTTPS 后会继续收到 Secure Cookie；按自身网络配置限制可信代理及直接访问。默认不信任转发 IP，因此代理后的限流按代理地址合并计算。

English: Example environment files are not loaded automatically; pass variables through your shell or process manager. The server serves the Cocos web build from `creator/build/web-desktop` and root model assets under `/models`; `WEB_ROOT` overrides the web build directory. Missing resources return 404 without an HTML fallback. Compressible responses above 1 KiB negotiate gzip/deflate via Accept-Encoding to reduce model transfer sizes. Production requires HTTPS, `NODE_ENV=production`, and the exact `APP_ORIGIN=https://your-host`. The default listener is `127.0.0.1:3000`; configure `HOST` and `PORT` as needed. Secure cookies work behind TLS termination; restrict trusted proxies and direct access for your network. Forwarded IP addresses are not trusted by default, so rate limiting behind a proxy is shared by the proxy IP.

## 接口 / API

中文：所有变更请求必须携带与 `APP_ORIGIN` 完全一致的 `Origin`。浏览器默认携带同源会话 Cookie。错误格式为 `{error:{code,message}}`。用户名转为小写，3–32 个字母、数字或下划线；密码 10–128 字符。注册即登录。

English: Every mutation must include an `Origin` exactly matching `APP_ORIGIN`. Browsers send the same-origin session cookie automatically. Errors use `{error:{code,message}}`. Usernames are normalized to lowercase and contain 3–32 letters, digits or underscores; passwords contain 10–128 characters. Registration signs the user in.

| 方法 / Method | 路径 / Path | 行为 / Behavior |
| --- | --- | --- |
| GET | /api/health | 数据库就绪检查 / Database readiness; 200 {status:"ok"} |
| POST | /api/auth/register | 账号密码注册 / Register with {username,password}; 201 {user} |
| POST | /api/auth/login | 登录 / Login with {username,password}; 200 {user} |
| POST | /api/auth/logout | 注销会话 / Revoke session; 204 |
| GET | /api/auth/me | 当前用户 / Current {user}; unauthenticated 401 |
| GET | /api/records | 历史记录 / History {records,total} |
| POST | /api/records | 唯一键新增或覆盖 / Upsert by date + structureId + side; 200 {record} |
| PATCH | /api/records/:id | 修改本人的记录 / Update own record; 200 {record}; key collision 409 |
| DELETE | /api/records/:id | 删除本人的记录 / Delete own record; 204 |

中文：记录包含 `id,date,structureId,side,intensity,note,createdAt,updatedAt`。`date` 为真实的 `YYYY-MM-DD` 日期，允许 1900–9999 年；`side` 为 `left|right|midline`；`intensity` 为 0–10 整数；`note` 最多 2000 字符，创建时可省略。历史筛选支持 `from,to,structureId,side,limit,offset`，日期为包含边界；默认最多 1000 条，可分页，`total` 为筛选后的总数，按日期及更新时间倒序。跨账号 ID 查询、更新和删除均不可见。会话 30 天到期，密码用 scrypt 加盐存储，会话只存令牌哈希；登录替换当前 Cookie 对应会话。注册与登录共用每 IP 每 15 分钟 30 次限额。

English: Records contain `id,date,structureId,side,intensity,note,createdAt,updatedAt`. Dates must be real `YYYY-MM-DD` calendar dates in years 1900–9999. Side is `left|right|midline`; intensity is an integer from 0–10; note is at most 2000 characters and optional on creation. History filters are `from,to,structureId,side,limit,offset`, with inclusive dates. The default maximum is 1000 records per page; `total` reports the filtered count. Results sort by date and update time descending. Other accounts' record IDs are invisible to reads, edits and deletion. Sessions expire after 30 days. Passwords use salted scrypt and only session-token hashes are stored. Login replaces the session associated with the current cookie. Registration and login share a limit of 30 attempts per IP per 15 minutes.

## 验证与运维范围 / Verification and operations scope

中文：`npm test` 使用临时 SQLite 与真实 HTTP 请求验证账号隔离、持久化、日期/清单校验、会话轮换/过期/注销、来源检查及限流。当前为单进程本地应用基线，没有邮件找回、多人共享、云端同步或分布式限流。备份时停止进程再复制 SQLite，或使用 SQLite 在线备份工具，避免仅复制活跃 WAL 模式的主文件。

English: `npm test` uses temporary SQLite databases and real HTTP requests to verify account isolation, persistence, date/catalog validation, session rotation/expiry/logout, Origin checks and throttling. This is a single-process local application baseline without email recovery, sharing, cloud synchronization or distributed rate limiting. For backups, stop the process before copying SQLite or use SQLite's online backup tools; copying only the main file while WAL is active is insufficient.
