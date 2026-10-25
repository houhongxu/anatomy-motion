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

Cocos 前端由官方 Creator 3.8.8 构建，发布为指定源提交的 Release 资源。`deploy/web-build.json` 固定源提交、creator 源树、资源名与 SHA256；流水线下载并验证，防止把新代码与旧前端混合。更改 creator 内容后须重新构建并更新该文件。镜像使用完整提交 SHA 标签，部署固定镜像 digest。

The frontend is built with official Creator 3.8.8 and uploaded as a Release asset for a source commit. `deploy/web-build.json` pins its source commit, creator tree, asset and SHA256. The workflow verifies them to prevent mixing new source with an old frontend. Rebuild and update this file after creator changes. Images use full-commit SHA tags; deployments pin image digests.

## 权限与预览选择 / Permissions and preview selection

CI 使用 Namespace 限定的 `github-deployer`，不持有集群管理员配置。SSH 专用密钥仅允许到服务器 `127.0.0.1:6443` 的隧道，禁止命令执行；校验已知主机密钥。Kubeconfig 校验集群 CA 和 TLS 服务名称，不跳过证书验证。秘密只保存于 GitHub Actions Secrets，不提交到 Git。

CI uses the namespace-scoped `github-deployer`, never an administrator kubeconfig. Its SSH key permits only a tunnel to server `127.0.0.1:6443`, with command execution disabled and known-host verification enforced. Kubeconfig validates the cluster CA and TLS server name. Secrets live only in GitHub Actions Secrets, never Git.

仓库变量 `PREVIEW_PR_NUMBER` 与 `deploy-preview` 标签用于触发镜像构建；仅 `PREVIEW_DEPLOY_ENABLED=true` 时执行集群部署。集群 `preview-selection` ConfigMap 是最终选择依据，CI 只能读取。维护者选中新的 PR 时须同步更新两处。部署串行执行，并再次检查 PR 当前 head；旧部署序号不能覆盖更新版本。关闭 PR 不自动删除预览或 PVC。

Repository variable `PREVIEW_PR_NUMBER` and the `deploy-preview` label gate image builds; cluster deployment additionally requires `PREVIEW_DEPLOY_ENABLED=true`. Cluster ConfigMap `preview-selection` is the final authority and is read-only to CI. Maintainers update both selectors when choosing another PR. Deployments are serialized and recheck the live PR head; older run numbers cannot overwrite newer versions. Closing a PR never automatically deletes preview resources or its PVC.

## 回滚与验收 / Rollback and acceptance

`preview-rollback` 保存升级前完整 Pod template、replicas 和 strategy；失败时恢复这些字段。首次部署失败时缩容为零，不删除持久卷。`preview-state` 记录 PR、SHA 与部署序号。生产发布及资源删除需单独授权。

`preview-rollback` stores the previous full Pod template, replicas and strategy, restored on failure. A failed first deployment scales to zero without deleting storage. `preview-state` records PR, SHA and run ordering. Production releases and resource deletion require separate authorization.

验收必须分别检查 Pod 节点与 Ready、Service endpoints、HTTPS 证书与 `/api/health`，以及静态前端、模型资源是否可用。流水线成功本身不等于应用验收成功。

Acceptance separately checks Pod placement/Ready, Service endpoints, HTTPS certificates and `/api/health`, plus frontend and model assets. A successful workflow alone is not application acceptance.

容器与预览流水线使用 Node.js 22 LTS；本地 Cocos 构建工具链独立。/ Containers and the preview workflow use Node.js 22 LTS; the local Cocos build toolchain remains separate.
