# 腾讯 EdgeOne Pages 部署说明

hugozhu.site（博客，加上 `/notes` 下的 ai-notepad）托管在腾讯 EdgeOne Pages 免费版，DNS 继续放在 DNSPod。
本文记录这套部署是怎么搭起来的、怎么发布、怎么切换和回滚，以及踩过的坑。

> 本仓库是公开仓库，**不要**在本文或任何提交里写入 token、密钥。

## 架构

```
用户 ──→ DNSPod
           ├─ hugozhu.site      CNAME → hugozhu.site.pages.dnsoe9.com（EdgeOne 分配）
           │                       EdgeOne Pages 项目 hugozhu-blog
           │                         ├─ /         Hugo 博客
           │                         └─ /notes/   ai-notepad（私有仓库的静态文件）
           │                         ├─ /skills/ai-notepad/   skill 文档、SKILL.md、cli
           │                         ├─ /api/functions/v1/*   Edge Function → Supabase（钉钉登录）
           │                         └─ /notes/p/<slug>       Edge Function → Supabase pub-note
           ├─ www.hugozhu.site  CNAME → hugozhu.site（需在 EdgeOne 绑定，见"待办"）
           └─ us3 / us4 等      → 原服务器，不受影响

ai-notepad 的数据和登录 ──→ Supabase（xryosrxuoqwohyqxszhs.supabase.co）
```

- 加速区域：**Global (MLC excluded)**，即 CLI 参数 `-a overseas`。这个区域不需要 ICP 备案，大陆用户走香港等境外节点。
- 加速区域在项目创建时就固定了，之后改不了。如果要换区域，只能新建项目：改仓库变量 `EDGEONE_PROJECT` 为新名字，CLI 部署时会自动创建。
- 旧的 GitHub Pages 发布（`.github/workflows/hugo.yaml` → `hugozhu/hugozhu.github.com`）继续保留，作为冷备份，两边互不影响。

## 相关文件

| 文件 | 作用 |
|---|---|
| `.github/workflows/tencent-edgeone.yaml` | 构建博客和 notepad 并部署到 EdgeOne，最后发钉钉通知 |
| `edgeone/edgeone.json` | EdgeOne 配置：www→apex 跳转、`/notes`→`/notes/`、缓存头、Content-Type、CORS |
| `edge-functions/api/functions/v1/[[default]].js` | 把 `/api/functions/v1/*` 转发到 Supabase，用于钉钉登录（`dingtalk-auth`、`dingtalk-sso`、`dingtalk-callback`） |
| `edge-functions/notes/p/[slug].js` | 把 `/notes/p/<slug>` 转发到 Supabase `pub-note`，这是已发布笔记的公开页面。Supabase 默认域名返回的是 `text/plain`，这里改成 `text/html` |

## 仓库配置（Settings → Secrets and variables → Actions）

| 类型 | 名称 | 说明 |
|---|---|---|
| Variable | `EDGEONE_PROJECT` | EdgeOne 项目名，当前是 `hugozhu-blog`。**不设置时 workflow 会自动跳过** |
| Secret | `EDGEONE_API_TOKEN` | 腾讯云控制台 → EdgeOne Pages → 设置 → API Token |
| Secret | `NOTEPAD_READ_TOKEN` | GitHub fine-grained PAT，只授权 `hugozhu/ai-notepad`，权限 Contents: Read-only |
| Secret | `TOKEN` / `DINGTALK_TOKEN` | 和 `hugo.yaml` 共用，分别用于拉取子模块和发钉钉通知 |

用命令行设置（token 不会出现在终端历史里）：

```bash
gh variable set EDGEONE_PROJECT -b hugozhu-blog
gh secret set EDGEONE_API_TOKEN
gh secret set NOTEPAD_READ_TOKEN
```

## 发布流程

以下三种情况会触发 workflow：
- push 到 `main`
- 在 Actions 页面手动运行（`gh workflow run tencent-edgeone.yaml`）
- 收到 `repository_dispatch` 事件 `notepad-updated`（ai-notepad 那边还没接上，见"待办"）

workflow 的步骤：

1. 用 Hugo 构建博客，生成搜索索引，删掉 `public/CNAME`。
2. 用 `NOTEPAD_READ_TOKEN` 拉取私有的 ai-notepad，按它 Dockerfile 里的 COPY 清单把静态文件拷到 `public/notes/`，再生成 `public/.well-known/agent-skills.json`。拷完立即删除源码。
3. 把 `edgeone/edgeone.json` 拷到 `public/edgeone.json`。
4. 部署：`npx edgeone pages deploy public -n $EDGEONE_PROJECT -a overseas -t $EDGEONE_API_TOKEN`。
5. 发钉钉通知。

暂停部署有三种办法：在 Actions 页面禁用 "Deploy to Tencent EdgeOne Pages"，删掉 `EDGEONE_PROJECT` 变量，或者直接删除 workflow 文件。

### 公开仓库 + 私有仓库的安全约束

- workflow 只用 push、dispatch 和手动触发，**不要加** `pull_request` 或 `pull_request_target`，否则 fork 的 PR 可能拿到 token。
- 公开仓库的 Actions 日志任何人都能看。**不要**打印 ai-notepad 的源码，也**不要**上传 artifacts。
- 部署出去的 `/notes/` 文件本来就是公开的，前端里的 Supabase anon key 是设计上就公开的 key，不算泄露。

## Edge Functions 与整站 404 的根因

每次部署都是**整站快照**：会把上一次部署整体替换掉。所以静态文件和函数必须在同一次部署里一起上传，单独上传静态文件会把函数覆盖掉。

`edgeone pages deploy <目录>` 只上传静态文件，会忽略 `edge-functions/`。要带上函数，workflow 的做法是：
1. 先在暂存目录 `eo-deploy/` 里执行 `edgeone pages build`，生成 `.edgeone/`，里面包含 assets 和编译好的函数。
2. 再执行 `edgeone pages deploy .edgeone`。CLI 会把当前目录下的 `edgeone.json` 一起打包上传。

**暂存目录名不能以点开头。** CLI 用当前目录名作为 zip 包的根目录名。之前用的是 `.eo-deploy`，平台拿到的是一个空站点，整站返回 404 "The site does not exist"：

| 提交 | 暂存目录 | 结果 |
|---|---|---|
| `ed8d857` | `.eo-deploy` | 整站 404 |
| `012ac8b` | `.eo-deploy` | 2026-11-16 21:20 起整站 404 约 7 分钟 |
| `3cb5e1c` | `eo-deploy` | ✅ 正常，部署期间首页 39 次检测全部 200 |

现在的默认行为：
- push 和 repository_dispatch 触发时，都**带函数部署**。
- 生产环境部署后，workflow 会连续 3 分钟检测首页。只要有一次不是 200，就自动改用只上传静态文件的方式重新部署。这样网站能恢复，但函数会暂时失效。
- 手动触发时可以选 `environment=preview`。预览地址要用控制台"预览"按钮生成的带 `eo_token` 的链接打开：第一次访问会设置 cookie 并 302 跳转，之后带上 cookie 访问各个路径即可。
- 手动触发时取消勾选 `with_functions`，就是紧急情况下只上传静态文件的部署。注意这样会让函数失效。

**每次部署后，第一件事是检查首页是否返回 200。**

## 其他需要等待的情况

以下情况确实需要等一等：

| 现象 | 实际原因 | 怎么办 |
|---|---|---|
| 默认域名 `*.edgeone.dev` / `*.edgeone.cool` 返回 **401 UNAUTHORIZED** | 默认域名只能用控制台生成的临时"预览"链接打开，不能公开访问 | 正常现象。要公开访问，必须绑定自定义域名 |
| 切换 DNS 后，HTTPS 证书是 `*.cdn.myqcloud.com` | 自定义域名的证书还没签发 | 等几分钟，证书会自动签发（TrustAsia DV） |

如果出现 404 "The site does not exist"，先看最近一次部署是不是上传了构建包。如果是，立即改回静态上传，不要干等。静态上传的部署是立即生效的。

## 首次绑定域名 / 切换 DNS 的步骤

1. 先确认部署成功，并在控制台用"预览"打开，检查页面正常。
2. 在控制台项目 → 域名管理 → 添加自定义域名，记下它给的 CNAME 目标，比如 `hugozhu.site.pages.dnsoe9.com`。
3. **切换 DNS 之前**，先用 `--resolve` 把请求直接发到 CNAME 目标的 IP，验证内容（见下面"验证"一节）。证书还没签发时，curl 要加 `-k`。
4. 在 DNSPod 把记录改成 CNAME 指向第 2 步的目标。根域名上有 Google 站点验证的 TXT 记录，DNSPod 可能提示冲突，按提示处理。
5. 等证书签发，再等站点映射生效，期间网站可能有一段时间打不开。尽量选访问量低的时段操作。
6. 用"验证"一节的命令全部检查一遍。

## 验证

```bash
t(){ curl -s -m 20 -o /tmp/eo -D /tmp/eoh -w '%{http_code} ' "$1"; }
for u in / /post/ /notes /notes/ /notes/sw.js /notes/skills/ai-notepad/SKILL.md \
         /.well-known/agent-skills.json "/api/functions/v1/dingtalk-auth?redirect=x"; do
  printf '%-45s ' "$u"; t "https://hugozhu.site$u"
  echo "cc=$(grep -i '^cache-control' /tmp/eoh | cut -d' ' -f2- | tr -d '\r') \
loc=$(grep -i '^location' /tmp/eoh | cut -d' ' -f2- | tr -d '\r' | cut -c1-60) \
title=$(grep -o '<title>[^<]*' /tmp/eo | cut -c8-)"
done
curl -sv https://hugozhu.site/ -o /dev/null 2>&1 | grep -E 'subject:|verify'
```

期望的结果：
- `/` 和 `/post/` 返回 200，是博客页面。
- `/notes` 返回 301，跳到 `/notes/`。
- `/notes/` 返回 200，标题是 "Hugo's Notebook"，缓存头是 `no-cache, no-store, must-revalidate`。
- `SKILL.md` 返回 `text/markdown`。
- `agent-skills.json` 返回 `application/json`。
- 证书是 `CN=hugozhu.site`。
- `/api/functions/v1/dingtalk-auth?redirect=x` 返回 302，跳到 `login.dingtalk.com`。
- `/notes/p/<已发布的slug>` 返回 200 `text/html`；不存在的 slug 返回 404。
- `/skills/ai-notepad/`、`/skills/ai-notepad/SKILL.md`、`/skills/ai-notepad/cli` 都返回 200。

DNS 切换前，可以用 `--resolve` 直接测 EdgeOne 节点：

```bash
dig +short hugozhu.site.pages.dnsoe9.com      # 拿到节点 IP
curl -sk --resolve hugozhu.site:443:<IP> -o /dev/null -w '%{http_code}\n' https://hugozhu.site/post/
```

注意：在 zsh 里，curl 的参数不能放在一个变量里，比如 `R="-sk --resolve ..."; curl $R ...`，zsh 不会把它拆成多个参数。要像上面那样写成函数或者直接写全。

## 回滚

us4 上的 Caddy（`~/Projects/hugozhu.site`）一直保留着完整配置：博客反代、`/notes`、`/api/functions/v1/*` 转发 Supabase。回滚只要改 DNS：

- 在 DNSPod 把 `hugozhu.site` 的 CNAME 删掉，改回 **A 记录 `146.235.235.251`**（us4）。`www` 跟着它走，不用动。

us4 的配置备份在本地的 `u4-backup/` 目录。它已被 `.gitignore` 忽略，因为里面有 DNSPod token。

## 踩过的坑

- **CLI 带目录参数部署时，只上传静态文件**。`edgeone pages deploy public` 不会打包 `edge-functions/`。只有不带目录参数时，CLI 才会先在当前目录执行构建，把静态文件和 `edge-functions/` 打包进 `.edgeone/` 再上传，并带上当前目录的 `edgeone.json`。
- 暂存目录以点开头会导致整站 404，详见上面"根因"一节。
- `edgeone.json` 的 `rewrites` 只能改写站内路径，**不能代理外部 URL**。要转发到外部（比如 Supabase），只能用 Edge Function。
- `edgeone.json` 现在放在产物根目录，所以 `/edgeone.json` 能被公开访问。里面只有缓存规则，无敏感信息。
- 免费版不保证 SLA，官方说适合个人和非商业用途。

## 待办

- [ ] **`www.hugozhu.site`**：在 EdgeOne 项目里绑定 www。目前 www 返回的证书不匹配，打不开。`edgeone.json` 里已经配了 www→apex 的 301 规则，绑好就会生效。
- [ ] **不存在的页面返回 200 + 首页**：应该返回 Hugo 的 `404.html` 和 404 状态码，对 SEO 更友好。
- [ ] **ai-notepad 自动触发**：在 ai-notepad 的 workflow 里加一步 `gh api repos/hugozhu/blog2/dispatches -f event_type=notepad-updated`，需要一个对 blog2 有 Contents: Read and write 权限的 PAT。
- [ ] 确认稳定后，停掉 us4 上的 Caddy 和 ai-notepad 容器。frp、shadowsocks、tailscale 不受影响。
- [ ] 删掉控制台里已经废弃的项目 `hugozhu-site`（它的加速区域是 global，含大陆节点，需要备案）。
