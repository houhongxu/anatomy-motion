# K3s 预览部署 / K3s preview deployment

## 拓扑与数据 / Topology and data

- 域名：`preview.anatomy-motion.zeropress.site`；Namespace：`anatomy-motion`；唯一预览 Deployment/Service/Ingress：`anatomy-motion-preview`。
- 前后端在同一 Node 服务中提供，固定运行于 `vm-12-8-ubuntu`，容忍 `node-role=control-plane:NoSchedule`；不向 `win-hhx` 调度 Web 工作负载。
- SQLite 保存在独立 PVC `anatomy-motion-data`。单副本、Recreate 更新策略避免两个进程并发迁移同一数据库；部署存在短暂中断。回滚镜像不会回滚数据库，涉及数据迁移时须先做一致性备份。
- Traefik 使用已有 `websecure` 入口与 `zeropress` 证书 resolver，不修改共享 Traefik、证书卷或 ACME 状态。

- Host: `preview.anatomy-motion.zeropress.site`; namespace: `anatomy-motion`; the single preview Deployment/Service/Ingress is `anatomy-motion-preview`.
- One Node service serves frontend and backend, pinned to `vm-12-8-ubuntu` with the `node-role=control-plane:NoSchedule` toleration; Web workloads do not run on `win-hhx`.
- SQLite lives on PVC `anatomy-motion-data`. One replica and Recreate updates avoid concurrent processes migrating the same database, with a brief update interruption. Image rollback does not roll back data; take a consistent backup before schema migrations.
- Traefik reuses `websecure` and the `zeropress` certificate resolver. Shared Traefik, certificate storage and ACME state remain unchanged.

## 构建来源 / Build provenance

React前端与后端在同一固定PR提交中构建。Docker独立前端阶段执行锁文件安装和Vite生产构建，不再下载Cocos Release。models/web的压缩GLB在仓库内校验，运行镜像仅包含白名单GLB、目录／学习／穴位元数据和后端记录清单，不包含旧617份JSON网格。镜像使用完整提交SHA标签，部署仍固定image digest。

The React frontend and backend build from the same fixed PR commit. A separate Docker frontend stage installs locked dependencies and runs Vite, without downloading Cocos releases. Compressed models/web GLBs are validated in-repository. Runtime includes whitelist GLBs, catalog/learning/surface metadata and the record manifest, excluding the old617 mesh JSONs. Images retain full-commit SHA tags and digest-pinned deployment.

旧deploy/web-build.json与prepare-web.py仅为旧Cocos版本恢复保留，不参与当前流水线。/ Legacy deploy/web-build.json and prepare-web.py remain only for recovering old Cocos releases, outside the current pipeline.

## 权限与预览选择 / Permissions and preview selection

CI 使用 Namespace 限定的 `github-deployer`，不持有集群管理员配置。SSH 专用密钥仅运行 root 拥有的固定 API stdio 桥，禁止任意命令及所有原生 TCP/Unix socket 转发；校验已知主机密钥。Kubeconfig 校验集群 CA 和 TLS 服务名称，不跳过证书验证。秘密只保存于 GitHub Actions Secrets，不提交到 Git。

CI uses the namespace-scoped `github-deployer`, never an administrator kubeconfig. Its SSH key runs only the root-owned fixed API stdio bridge, denying arbitrary commands and all native TCP/Unix socket forwarding, with known-host verification enforced. Kubeconfig validates the cluster CA and TLS server name. Secrets live only in GitHub Actions Secrets, never Git.

仓库变量 `PREVIEW_PR_NUMBER` 与 `deploy-preview` 标签用于触发镜像构建；仅 `PREVIEW_DEPLOY_ENABLED=true` 时执行集群部署。集群 `preview-selection` ConfigMap 是最终选择依据，CI 只能读取。维护者选中新的 PR 时须同步更新两处。部署串行执行，并再次检查 PR 当前 head；旧部署序号不能覆盖更新版本。关闭 PR 不自动删除预览或 PVC。

Repository variable `PREVIEW_PR_NUMBER` and the `deploy-preview` label gate image builds; cluster deployment additionally requires `PREVIEW_DEPLOY_ENABLED=true`. Cluster ConfigMap `preview-selection` is the final authority and is read-only to CI. Maintainers update both selectors when choosing another PR. Deployments are serialized and recheck the live PR head; older run numbers cannot overwrite newer versions. Closing a PR never automatically deletes preview resources or its PVC.

## 回滚与验收 / Rollback and acceptance

`preview-rollback` 保存升级前完整 Pod template、replicas 和 strategy；失败时恢复这些字段。首次部署失败时缩容为零，不删除持久卷。`preview-state` 记录 PR、SHA 与部署序号。生产发布及资源删除需单独授权。

`preview-rollback` stores the previous full Pod template, replicas and strategy, restored on failure. A failed first deployment scales to zero without deleting storage. `preview-state` records PR, SHA and run ordering. Production releases and resource deletion require separate authorization.

验收必须分别检查 Pod 节点与 Ready、Service endpoints、HTTPS 证书与 `/api/health`，以及静态前端、模型资源是否可用。流水线成功本身不等于应用验收成功。

Acceptance separately checks Pod placement/Ready, Service endpoints, HTTPS certificates and `/api/health`, plus frontend and model assets. A successful workflow alone is not application acceptance.

容器与预览流水线使用 Node.js 22 LTS；本地 React 构建同样使用 Node。/ Containers and the preview workflow use Node.js 22 LTS; local React builds also use Node.

## 固定命令 stdio 桥 / Fixed-command stdio bridge

中文：专用 SSH 公钥使用以下固定命令配置，保留 `restrict` 的全部限制，不重新启用端口转发。非空 `SSH_ORIGINAL_COMMAND` 或脚本额外参数均被拒绝。仅管理员在审核提交后安装远端脚本；文件 `/opt/anatomy-motion/ci-api-bridge.py` 及其父目录由 root 拥有，CI 用户不可写。安装和真实 TLS 验收是提交审核后的独立步骤。

English: The dedicated SSH key uses the fixed command below, retaining every `restrict` constraint without re-enabling port forwarding. Nonempty `SSH_ORIGINAL_COMMAND` and extra script arguments are rejected. Only an administrator installs the reviewed remote script. Both `/opt/anatomy-motion/ci-api-bridge.py` and its parent directory are root-owned and not writable by CI. Installation and live TLS acceptance are separate post-review steps.

```text
restrict,command="/usr/bin/python3 /opt/anatomy-motion/ci-api-bridge.py" ssh-ed25519 <dedicated-public-key>
```

中文：远端桥只连接硬编码的 `127.0.0.1:6443`，通过 SSH stdin/stdout 传递不解析的 TLS 字节，每方向缓冲最多 1 MiB，并分别处理两个方向的 EOF。runner 仅监听 `127.0.0.1:16443`，每个连接启动独立的 `ssh -T` stdio 会话，不附带远端命令，不使用 `-L`、`-R`、`-D` 或 Unix socket 转发。使用 `-F /dev/null`、`IdentitiesOnly=yes`、严格 known_hosts 和 `ClearAllForwardings=yes`，避免本机配置暗中添加转发。并发连接上限 32；退出、异常和信号处理均关闭连接并回收 SSH 子进程。

English: The remote bridge connects only to hard-coded `127.0.0.1:6443` and passes opaque TLS bytes over SSH stdin/stdout. Each direction has at most 1 MiB of buffer, with independent EOF handling. The runner listens only on `127.0.0.1:16443` and starts one independent `ssh -T` stdio session per connection, with no remote command and no `-L`, `-R`, `-D` or Unix socket forwarding. `-F /dev/null`, `IdentitiesOnly=yes`, strict known_hosts and `ClearAllForwardings=yes` prevent inherited local forwarding settings. Concurrency is limited to 32. Exit, errors and signals close connections and reap SSH children.

中文：此方案不修改共享 sshd 配置，也不新增或更换现有令牌和 Secrets。Kubeconfig 仍使用 `https://127.0.0.1:16443`、集群 CA、`tls-server-name=kubernetes.default.svc` 与 `anatomy-motion` 命名空间。代码测试仅使用本地管道、套接字和模拟 SSH 子进程；真实验收须另外确认任意命令、原生 TCP/Unix socket 转发均被拒绝，且 API TLS 与命名空间最小权限验证通过。

English: This design does not modify shared sshd configuration or replace the existing token or Secrets. Kubeconfig retains `https://127.0.0.1:16443`, the cluster CA, `tls-server-name=kubernetes.default.svc` and namespace `anatomy-motion`. Code tests use local pipes, sockets and fixture SSH processes. Live acceptance must separately confirm that arbitrary commands and native TCP/Unix socket forwarding are denied while API TLS and namespace-scoped permission checks pass.

## 令牌到期与续期 / Token expiry and renewal

中文：本轮 `github-deployer` TokenRequest 实际有效期为 2160 小时（90 天），到期时间为 **2027-01-23 23:26:37 Asia/Shanghai**，即 **2027-01-23 15:26:37 UTC**。该时间来自本轮令牌声明，后续续期以新令牌的实际 `exp` 为准。SSH 私钥本身没有这个 Kubernetes 令牌到期时间。

English: This issuance of the `github-deployer` TokenRequest is valid for 2160 hours (90 days), expiring at **2027-01-23 23:26:37 Asia/Shanghai**, or **2027-01-23 15:26:37 UTC**. This is the current token's actual claim; renewed credentials must use their new actual `exp`. The SSH key does not share this Kubernetes token expiry.

中文：续期由管理员对同一 `anatomy-motion/github-deployer` 发起 `kubectl create token github-deployer --duration=2160h -n anatomy-motion`。必须通过捕获 stdout 的程序或权限 0600 的临时文件接收令牌，**不得直接输出到终端、日志或 PR**。在内存中解码声明，只记录实际到期时间；保留原 CA、TLS 服务名、隧道地址和命名空间，生成新的私有 kubeconfig。

English: An administrator renews the same `anatomy-motion/github-deployer` account using `kubectl create token github-deployer --duration=2160h -n anatomy-motion`. Capture stdout in a program or a mode-0600 temporary file; **never print the token to a terminal, log or PR**. Decode claims in memory and record only actual expiry. Keep the existing CA, TLS server name, loopback endpoint and namespace when generating the private kubeconfig.

中文：先通过固定桥验证新 kubeconfig 的 API 读取与拒绝权限，再使用 stdin 执行 `gh secret set K3S_PREVIEW_KUBECONFIG --repo houhongxu/anatomy-motion`，替换指定仓库的 Actions Secret；不要把配置放入命令参数。仅检查 Secret 名称和更新时间，清理私有临时文件。若 SSH 密钥和主机密钥未变，不需要更新另外两个 Secrets；续期不会开启 `PREVIEW_DEPLOY_ENABLED`。

English: Verify API reads and denied permissions through the fixed bridge before replacing the repository Actions Secret with `gh secret set K3S_PREVIEW_KUBECONFIG --repo houhongxu/anatomy-motion` fed through stdin. Do not place credential contents in command arguments. Verify only the Secret name and update time, then remove private temporary files. If SSH and host keys are unchanged, the other two Secrets need no update. Renewal does not enable `PREVIEW_DEPLOY_ENABLED`.
