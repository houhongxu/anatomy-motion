# K3s 预览部署 / K3s preview deployment

中文：本目录将单个受选 PR 发布到 `https://preview.anatomy-motion.zeropress.site`。镜像构建发生在 GitHub runner，运行时使用 Node 22；本地 WSL 与既有普通 CI 环境不变。预览仅使用 `anatomy-motion` 命名空间及本应用资源，单实例 `Recreate` 更新会有短暂中断。

English: This directory publishes one selected PR to `https://preview.anatomy-motion.zeropress.site`. GitHub runners build images with Node 22; local WSL and existing general CI remain unchanged. Preview resources stay in the `anatomy-motion` namespace. Single-replica `Recreate` updates have a brief interruption.

## 开关与来源校验 / Gates and provenance

中文：只有同仓库、带 `deploy-preview` 标签、PR 编号与仓库变量 `PREVIEW_PR_NUMBER` 相同的 PR 才进行测试、网页制品校验和镜像构建。默认不部署；只有 `PREVIEW_DEPLOY_ENABLED=true` 才运行最后部署步骤。镜像准备成功不能作为公网应用验收证据。

English: Tests, web-artifact verification and image building run only for same-repository PRs carrying `deploy-preview` and matching repository variable `PREVIEW_PR_NUMBER`. Deployment is disabled by default; only `PREVIEW_DEPLOY_ENABLED=true` enables the final deployment step. A successful image build is not evidence that the public application works.

中文：部署前，以集群 `preview-selection.data.pr` 作为最终选择依据，重新查询 GitHub 确认 PR 仍开放、标签存在、仓库一致、head SHA 与构建 SHA 一致。使用 PR head SHA 而非合并测试 SHA。固定 concurrency 串行执行；`preview-state.highestRunId` 和 resourceVersion 比较拒绝旧 run 或竞争写入。GitHub 变量仅作为触发前置条件，不能覆盖集群选择项。

English: Before deployment, the cluster's `preview-selection.data.pr` is authoritative. GitHub is queried again to confirm an open, labelled, same-repository PR whose head SHA equals the built SHA. The PR head SHA is used instead of the synthetic merge SHA. Fixed concurrency serializes runs; `preview-state.highestRunId` and resourceVersion checks reject older runs or competing writes. The GitHub variable is an initial gate and cannot override cluster selection.

中文：`web-build.json` 固定官方网页 release 的源提交、Creator tree、标签、文件名和 SHA256。`prepare-web.py` 同时比较当前 Creator tree 与来源提交的 Creator tree，再校验下载摘要。解包拒绝绝对路径、向上穿越、反斜线、链接、特殊文件和重复路径，根目录必须有 `index.html`；现有 `.build/web` 不会被覆盖。Creator 内容改变后必须先生成新的官方网页制品并更新元数据。

English: `web-build.json` pins the official web release's source commit, Creator tree, tag, filename and SHA256. `prepare-web.py` checks both current and source-commit Creator trees, then verifies the downloaded digest. Extraction rejects absolute paths, traversal, backslashes, links, special files and duplicate paths, and requires root `index.html`. Existing `.build/web` directories are not overwritten. Creator changes require a new official web artifact and updated metadata.

## 引导与权限 / Bootstrap and permissions

中文：集群管理员首次引导使用 `namespace.yaml`、`rbac.yaml`、`bootstrap.yaml`。命名空间强制 Pod Security `restricted:v1.36`。引导包含仅读的 `preview-selection`，及预创建的 `preview-state`、`preview-rollback`。**不要在已有运行状态上重新应用初始化 bootstrap 文件**，否则会重置选择项和 run 防倒退状态。

English: Cluster administrators bootstrap with `namespace.yaml`, `rbac.yaml` and `bootstrap.yaml`. The namespace enforces Pod Security `restricted:v1.36`. Bootstrap creates read-only `preview-selection` plus precreated `preview-state` and `preview-rollback`. **Do not reapply initial bootstrap data over existing runtime state**, because that resets selection and the run-order fence.

中文：CI 的 `github-deployer` 不能读取或修改 Secret、RBAC、其他命名空间，也没有任何删除权限；选择 ConfigMap 只读，仅能更新现成的状态与回滚 ConfigMap。应用 Pod 禁用自动挂载 ServiceAccount token，UID/GID/fsGroup 为 1000，移除全部 capabilities，禁止提权，根文件系统只读。数据仅在独立 1 GiB `local-path` PVC 持久化。

English: CI's `github-deployer` cannot read or change Secrets, RBAC or other namespaces and has no delete permission. Selection is read-only; only existing state and rollback ConfigMaps can be updated. Application pods disable automatic ServiceAccount token mounts, use UID/GID/fsGroup 1000, drop all capabilities, prohibit privilege escalation and use a read-only root filesystem. Data persists in a dedicated 1 GiB `local-path` PVC.

中文：预览环境需要 GitHub Secrets `K3S_PREVIEW_KUBECONFIG`、`K3S_PREVIEW_SSH_KEY`、`K3S_PREVIEW_KNOWN_HOSTS`。Kubeconfig 指向 `https://127.0.0.1:16443`，TLS server-name 为 `kubernetes.default.svc`，凭据仅限本命名空间。SSH 仅建立 `127.0.0.1:16443 → 服务器 127.0.0.1:6443` 隧道，使用核实的 known_hosts，密钥应受 restrict、port-forwarding、permitopen 和禁止远程命令约束。工作流临时文件权限为 0600，退出时关闭隧道并清理凭据。kubectl v1.36.2 从官方来源下载并校验 SHA256。

English: The preview environment requires GitHub Secrets `K3S_PREVIEW_KUBECONFIG`, `K3S_PREVIEW_SSH_KEY` and `K3S_PREVIEW_KNOWN_HOSTS`. Kubeconfig uses `https://127.0.0.1:16443`, TLS server-name `kubernetes.default.svc` and namespace-scoped credentials. SSH opens only the loopback tunnel to the server's `127.0.0.1:6443`, with verified known_hosts and a key constrained by restrict, port-forwarding, permitopen and a forbidden remote command. Temporary credentials use mode 0600; exit cleanup closes the tunnel and removes them. kubectl v1.36.2 is downloaded from its official source with SHA256 verification.

中文：镜像为 `ghcr.io/houhongxu/anatomy-motion:sha-完整SHA`；部署优先使用构建器返回的不可变 digest。`ghcr-read` 必须由管理员提前配置有效的拉取凭据，或在镜像公开后调整引用；短期 GitHub 工作流 token 不能作为持久拉取凭据。Docker 镜像保留项目 LICENSE、BodyParts3D 署名与 CC BY 4.0 全文。

English: Images use `ghcr.io/houhongxu/anatomy-motion:sha-FULL_SHA`; deployment prefers the builder's immutable digest. Administrators must provision valid `ghcr-read` pull credentials or adjust the reference after making the image public. Short-lived workflow tokens are not persistent pull credentials. Images retain the project LICENSE, BodyParts3D attribution and full CC BY 4.0 text.

## 失败恢复与验证 / Recovery and validation

中文：修改应用前，已有非零实例必须满足 observedGeneration、ready、updated、available 的健康条件，再将完整 Pod template、replicas 与 strategy 写入 `preview-rollback`；快照保存失败不修改工作负载。发布等待 180 秒；失败恢复整个模板和策略，而非只恢复镜像。首次发布失败将 Deployment 缩到 0，不删除 PVC。失败保留最高 run ID；成功后记录 PR、SHA、run ID 和镜像 digest。不会在 PR 关闭时自动删除应用或数据。

English: Before workload changes, an existing nonzero deployment must satisfy observedGeneration, ready, updated and available health checks. Its complete pod template, replica count and strategy are saved in `preview-rollback`; failed snapshot writes prevent workload mutation. Rollout waits 180 seconds. Failure restores the whole template and strategy, not only the image. First-deployment failure scales to zero without deleting the PVC. The highest run ID survives failures; success records PR, SHA, run ID and image digest. PR closure does not automatically delete application resources or data.

```sh
python3 -m unittest discover -s deploy/tests -v
python3 deploy/prepare-web.py
```

中文：测试是离线边界验证，不构建镜像或访问集群。真实制品校验会下载固定 release 到 `.build/web`。实际验收另需确认 Deployment 状态、EndpointSlices、持久化、TLS 证书与网页/API 功能；仅配置应用或端口可达不足以宣称部署成功。

English: Tests validate offline boundaries without building images or contacting the cluster. Real artifact verification downloads the pinned release to `.build/web`. Deployment acceptance separately requires deployment state, EndpointSlices, persistence, TLS certificate and application/API checks. Applied configuration or a reachable port alone does not prove a successful deployment.
