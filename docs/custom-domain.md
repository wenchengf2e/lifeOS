# 自定义域名接入指南

把腾讯云注册的 `lifecraft.top` 接入 Cloudflare，并绑定到已部署的 LifeOS Worker。

- 目标地址：`https://lifeos.lifecraft.top`（或根域名 `https://lifecraft.top`）
- 记录时间：2026-10-31
- 当前状态：Worker 已部署、D1 已迁移；自定义域名尚未接入；Access 应用需要在回来后再确认一次

> **在确认 Access 应用已经生效之前，不要往线上写真实数据。**
> Worker 目前依赖 Access 注入的身份头；Access 应用不存在时，这个头没有经过验证。

## 架构

```text
腾讯云（域名注册 + 实名认证）
  └─ 修改 DNS 服务器
       └─ Cloudflare（DNS + 证书 + Access）
            └─ Worker Custom Domain
                 └─ lifeos Worker
                      └─ D1
```

## 为什么不建议用腾讯云「URL 转发」

把 `lifecraft.top` 通过腾讯云的 URL 转发指向 `https://lifeos.wencheng-f2e.workers.dev` 看起来省事，但有几个问题：

1. 浏览器最终地址仍然是 `workers.dev`，而 `workers.dev` 在国内基本不可访问，转发解决不了访问问题。
2. 腾讯云的 URL 转发通常需要域名已备案，个人境外托管场景很难满足。
3. HTTPS、Cookie、Cloudflare Access 都会多一层跳转和域名切换，后续维护更麻烦。

正确做法是：**域名接入 Cloudflare，然后作为 Worker 的自定义域名绑定。**

## 前置条件

- 腾讯云账号已完成实名认证
- `lifecraft.top` 已购买，且域名实名认证已通过
- 域名要添加到**和 `lifeos` Worker 相同的 Cloudflare 账号**
- Cloudflare 免费版即可；免费版要求完整 NS 接入，不能只在腾讯云加一条 CNAME

## 步骤

### 1. 腾讯云购买域名并实名

1. 腾讯云 → 域名与网站 → 域名注册，购买 `lifecraft.top`
2. 进入域名控制台完成**实名认证**
3. 确认域名状态正常，不是 `serverHold` 或未实名状态

未实名的域名即使改了 NS 也不会正常解析。

### 2. Cloudflare 添加站点

1. 打开 Cloudflare Dashboard
2. 选择 **Add a domain / 添加站点**
3. 输入 `lifecraft.top`
4. 选择 **Free** plan
5. Cloudflare 会分配两个 NS，例如：

   ```text
   ada.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```

   实际名称以页面显示为准，两个都要记下来。

### 3. 腾讯云修改 DNS 服务器

1. 腾讯云控制台 → 域名与网站 → 我的域名 → `lifecraft.top`
2. 进入 **DNS 解析 / DNS 管理**
3. 找到 **修改 DNS 服务器**
4. 选择 **自定义 DNS**
5. 填入 Cloudflare 分配的两个 NS
6. 删除 DNSPod 默认 NS，保存

注意：

- 只保留 Cloudflare 的两个 NS，不要和 DNSPod 的 NS 混用
- 改完后不要在 DNSPod 继续添加解析记录，后续解析统一在 Cloudflare 管理
- 域名注册商仍然留在腾讯云，续费也在腾讯云，不需要转出

### 4. 等待 Cloudflare 显示 Active

回 Cloudflare 站点页面，等待状态从 **Pending Nameserver Update** 变成 **Active**。

- 通常几分钟到几小时
- 最长可能需要 24–48 小时
- Cloudflare 页面上的 **Check nameservers now** 可以手动触发检查

如果一直不生效：

- 确认腾讯云处保存的 NS 与 Cloudflare 显示的完全一致
- 确认域名已实名
- 用 `dig NS lifecraft.top` 或在线 DNS 工具检查权威 NS 是否已经切换

### 5. 绑定到 Worker

1. Cloudflare → Workers & Pages → `lifeos`
2. 进入 **Settings → Domains & Routes**
3. 点击 **Add → Custom domain**
4. 填：

   ```text
   lifeos.lifecraft.top
   ```

   也可以直接绑定根域名：

   ```text
   lifecraft.top
   ```

   Cloudflare 支持根域名（CNAME flattening）。

5. 保存，等待状态变成 **Active**

不要手动去 DNS 页面加 A 记录或 CNAME。Custom Domain 会自动创建代理记录并签发证书。

绑定失败时检查：

- 域名是否在同一个 Cloudflare 账号
- 域名状态是否已经 Active
- 这个 hostname 是否已经被其他 Worker / 站点占用

### 6. 确认 Access 覆盖新域名

有两种方式：

- **Worker 级 Access（推荐）**：选择 **All traffic** 后，`workers.dev`、预览 URL 和所有自定义域名都会自动被保护
- **Hostname 级 Access**：需要把 `lifeos.lifecraft.top` 也加进同一个 Access 应用，否则新域名可能是公开的

回来操作时先确认：

1. Zero Trust → Access → Applications 里有一个应用
2. 应用覆盖 `lifeos` Worker，或覆盖了新的 hostname
3. Policy 只允许 `wencheng.f2e@gmail.com`

> 上次检查时 Access 应用列表是空的。可能是操作在了另一个 Cloudflare 账号，或应用没有保存成功。绑定域名前先确认账号是部署 `lifeos` 的那个账号。

### 7. SSL / HTTPS

绑定成功后：

1. SSL/TLS → Overview → 选择 **Full (strict)**
2. Edge Certificates → 打开 **Always Use HTTPS**
3. 用无痕窗口打开 `https://lifeos.lifecraft.top`

预期行为：

1. 先跳转到 Cloudflare Access 登录页
2. 收到邮箱验证码并登录
3. 进入 LifeOS，能读取和写入数据

### 8. 验证后再关闭 workers.dev

确认自定义域名和 Access 都正常后，可以在 `wrangler.jsonc` 中关闭 workers.dev：

```jsonc
"workers_dev": false
```

然后重新部署：

```bash
npm run deploy
```

这样只保留自定义域名，减少一个可能绕过 Access 的入口。

> 关闭前务必确认自定义域名已经能正常登录和使用。

## 国内访问说明

- Cloudflare 免费版不包含中国大陆节点，流量通常走香港、新加坡、日本或美国，延迟约 100–300ms，晚高峰可能不稳定。
- 自定义域名通常比 `workers.dev` 可用性好很多，因为 `workers.dev` 在国内基本不可访问。
- 网站托管在境外，通常不需要 ICP 备案；但也不能使用腾讯云 CDN、URL 转发等需要备案的国内服务。
- Cloudflare Access 的登录页在 `<team>.cloudflareaccess.com`，国内网络可达性也可能不稳定；如果登录页打不开，需要代理网络。
- 如果需要国内稳定访问，需要 ICP 备案 + 国内服务器，或 Cloudflare 中国网络（企业版），都不是免费方案。

## 回来后检查清单

- [ ] 腾讯云域名已实名
- [ ] Cloudflare 站点状态为 Active
- [ ] Cloudflare 的 NS 已在腾讯云生效
- [ ] Worker Custom Domain 状态为 Active
- [ ] Zero Trust → Access → Applications 中有覆盖 `lifeos` 的应用
- [ ] Access policy 只允许 `wencheng.f2e@gmail.com`
- [ ] 无痕窗口访问新域名会跳转 Access 登录页
- [ ] 登录后能正常读写数据
- [ ] 「导出全部数据」可用
- [ ] 以上都通过后，再设置 `workers_dev: false` 并重新部署

## 常见问题

### NS 改了但 Cloudflare 一直 Pending

- 域名未实名或处于 serverHold
- NS 填错，或只改了一个
- 本地 DNS 缓存未刷新，等待 TTL
- Cloudflare 还没手动触发检查

### Custom Domain 添加失败

- 域名不在同一个 Cloudflare 账号
- 域名站点还没 Active
- hostname 已被其他服务占用
- 根域名和子域名重复绑定

### 登录后页面报 401

说明 Access 已经拦截了请求，但 Worker 没有拿到可信的身份信息。需要检查：

- Access 应用是否覆盖当前 hostname
- 是否配置了 Worker 级 All traffic
- 如果仍然失败，需要改成校验 `Cf-Access-Jwt-Assertion` 的 JWT 方案

### 国内打不开或很慢

- 先确认 `workers.dev` 是否被墙，自定义域名是否已经 Active
- 换网络或代理测试
- 免费 Cloudflare 没有中国大陆节点，无法保证国内速度

## 参考

- [Cloudflare Workers Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare 全量接入 / 修改 NS](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)
- [Workers 的 Cloudflare Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
- [Cloudflare Access 策略](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)
