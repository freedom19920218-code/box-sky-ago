<div align="center">
  <h2>
    <img src="https://cdn.nodeimage.com/i/NXz3ah3zTwikq3AdQOU0dYw3uyaBiGVj.webp" width="40" height="40" style="vertical-align: middle;"/> 
    增强版Argo隧道代理
  </h2>
  基于Node.js的高性能Argo隧道代理工具，专为PaaS平台设计，集成最新网络优化技术和智能流量管理。
  <br><br>
  <strong>🛡️ 网络优化 · 🔒 高安全 · ⚡ 高性能 · 🔄 智能轮换</strong>

---

## 🚨 重要声明

* 本项目仅供个人学习和研究使用
* 禁止用于任何商业行为或非法用途
* 使用前请遵守当地法律法规
* 违反使用条款者将自行承担法律责任

## 📋 项目特性

### 🛡️ **高级网络优化技术**
- **流量填充伪装** - 随机padding参数，模拟真实网页流量
- **时间戳混淆** - 防止时序分析检测
- **User-Agent轮换** - 6种真实浏览器UA随机切换
- **Stream ID随机化** - HTTP/2流标识随机化
- **MTU动态调整** - 1400-1600字节随机MTU

### 🔄 **智能轮换系统**
- **多域名轮换** - 主域名故障自动切换备用域名
- **健康检测** - 5分钟缓存，智能检测域名可用性
- **TLS指纹轮换** - 每小时自动更换TLS指纹
- **无缝切换** - 不影响现有连接的平滑过渡

### ⚡ **性能优化**
- **TCP Mux多路复用** - 提升连接效率
- **Keep-Alive优化** - 30/60秒心跳间隔
- **内存优化** - 专为Railway 1GB容器优化
- **智能路由** - 广告屏蔽 + 私有IP直连

### 🔒 **安全增强**
- **订阅令牌鉴权** - 防止未授权访问
- **根路径伪装** - 代理网站完全隐藏
- **多层DoH DNS** - Cloudflare/Google/Quad9
- **HTTP安全头** - XSS/CSRF防护

## 🌐 支持协议

| 协议 | 版本 | 加密 | 传输 | 状态 |
|------|------|------|------|------|
| VLESS | 0 | none | WebSocket | ✅ |
| VMess | 2 | auto | WebSocket | ✅ |
| Trojan | - | TLS | WebSocket | ✅ |
| REALITY | Vision | Reality | TCP | ⚠️ (需VPS) |

## � 环境变量配置

### 🔑 **核心配置**
| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `SUB_TOKEN` | ⚠️ 推荐 | `47b52961-...` | 订阅访问令牌 |
| `UUID` | ❌ | 自动生成 | 用户唯一标识 |
| `PORT` | ❌ | `3000` | HTTP服务端口 |

### 🌐 **隧道配置**
| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `ARGO_DOMAIN` | ❌ | - | 固定隧道域名 |
| `ARGO_AUTH` | ❌ | - | Cloudflare隧道Token |
| `ARGO_PORT` | ❌ | `18080` | 隧道监听端口 |
| `CFIP` | ❌ | `saas.sin.fan` | 优选IP/域名 |
| `CFPORT` | ❌ | `443` | 节点端口 |

### 🛡️ **安全配置**
| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `TLS_FINGERPRINT` | ❌ | `random` | TLS指纹随机化 |
| `NAME` | ❌ | - | 节点名称前缀 |
| `ENABLE_REALITY` | ❌ | `false` | REALITY协议(VPS专用) |

### 📡 **订阅配置**
| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `SUB_PATH` | ❌ | `sub` | 订阅路径 |
| `UPLOAD_URL` | ❌ | - | 订阅上传地址 |
| `PROJECT_URL` | ❌ | - | 项目URL |

## 🚀 快速部署

### Railway部署 (推荐)

1. **Fork本项目到你的GitHub**
2. **在Railway创建新项目**
3. **连接GitHub仓库**
4. **配置环境变量**
5. **部署完成**

### 🖥️ 服务器部署 (VPS/云服务器)

服务器部署支持REALITY协议，获得更强抗封锁能力。

#### 部署要求
- **系统**: Ubuntu 18.04+ / CentOS 7+ / Debian 9+
- **配置**: 1核CPU + 512MB内存 (推荐1GB+)
- **软件**: Node.js 14.0+ + npm

#### 部署方法

**方法1: PM2部署 (推荐)**
```bash
# 1. 下载代码
git clone [你的仓库地址]
cd [项目目录]

# 2. 安装依赖
npm install

# 3. 配置环境变量
nano .env
```

**方法2: Docker部署**
```bash
# 构建并运行
docker build -t argo-proxy .
docker run -d --name argo-proxy --restart always -p 443:443 -e ENABLE_REALITY=true argo-proxy
```

**方法3: systemd服务**
```bash
# 创建服务文件
sudo nano /etc/systemd/system/argo-proxy.service

[Unit]
Description=Argo Proxy Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/argo-proxy
Environment=ENABLE_REALITY=true
ExecStart=/usr/bin/node index.js
Restart=always

[Install]
WantedBy=multi-user.target

sudo systemctl enable argo-proxy
sudo systemctl start argo-proxy
```

### 🔥 REALITY功能启用 (仅服务器)

REALITY是目前最强的TLS伪装协议，仅在VPS等有公网IP的环境可用。

#### 启用REALITY的步骤

**1. 环境变量配置**
```bash
# 启用REALITY协议
ENABLE_REALITY=true

# REALITY配置
REALITY_DOMAIN=www.microsoft.com
REALITY_PORT=443
REALITY_KEY=  # 留空自动生成

# 节点配置 (使用服务器IP)
CFIP=your-server-ip
CFPORT=443
NAME=RealityNode
```

**2. 防火墙配置**
```bash
# Ubuntu/Debian
sudo ufw allow 443/tcp
sudo ufw reload

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

**3. SSL证书配置 (可选)**
```bash
# 使用Let's Encrypt (推荐)
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
```

#### REALITY配置详解

| 变量名 | 说明 | 推荐值 |
|--------|------|--------|
| `ENABLE_REALITY` | 启用REALITY协议 | `true` |
| `REALITY_DOMAIN` | 伪装域名 | `www.microsoft.com` |
| `REALITY_PORT` | 监听端口 | `443` |
| `REALITY_KEY` | x25519私钥 | 留空自动生成 |

#### 伪装域名选择
推荐使用以下域名作为REALITY伪装：
- `www.microsoft.com` - 微软官网
- `www.google.com` - 谷歌官网  
- `www.apple.com` - 苹果官网
- `www.cloudflare.com` - Cloudflare官网

#### REALITY节点优势
- ✅ **最强伪装** - 完全模拟HTTPS流量
- ✅ **抗主动探测** - 无法被扫描识别
- ✅ **低延迟** - 直接TCP连接
- ✅ **高稳定** - 不依赖CDN

### 环境变量设置示例

#### Railway/PaaS平台配置
```bash
# 核心配置
SUB_TOKEN=your-secure-token-here
UUID=your-uuid-or-auto-generated

# 隧道配置 (固定隧道)
ARGO_DOMAIN=your-domain.com
ARGO_AUTH=your-cloudflare-token
ARGO_PORT=18080

# 节点配置
CFIP=saas.sin.fan
CFPORT=443
NAME=MyNode

# 安全配置
TLS_FINGERPRINT=random
ENABLE_REALITY=false  # PaaS平台必须为false
```

#### 服务器/VPS配置
```bash
# 核心配置
SUB_TOKEN=your-secure-token-here
UUID=your-uuid-or-auto-generated

# REALITY配置 (服务器专用)
ENABLE_REALITY=true
REALITY_DOMAIN=www.microsoft.com
REALITY_PORT=443

# 节点配置 (使用服务器IP)
CFIP=your-server-ip
CFPORT=443
NAME=RealityNode

# 安全配置
TLS_FINGERPRINT=random
```

## 🌐 订阅地址

### Railway/PaaS平台
```bash
https://your-project.railway.app/sub?token=YOUR_SUB_TOKEN
```

### 服务器/VPS部署
```bash
https://your-server-ip:3000/sub?token=YOUR_SUB_TOKEN
# 或使用域名
https://your-domain.com/sub?token=YOUR_SUB_TOKEN
```

### REALITY节点 (服务器专用)
启用REALITY后，订阅中会包含额外的REALITY节点：
```
vless://uuid@your-server-ip:443?encryption=none&security=reality&sni=www.microsoft.com&fp=chrome&type=tcp&flow=xtls-rprx-vision&pbk=public-key&sid=&spx=%2F#REALITY-Node
```

### 支持的客户端
- ✅ Shadowrocket 2.2.77+
- ✅ Clash 1.18.0+
- ✅ v2rayN 1.5.0+
- ✅ Quantumult X
- ✅ Surge

## � 高级功能

### 域名轮换配置
```javascript
// 备用域名列表 (代码中已预配置)
const BACKUP_DOMAINS = [
  'www.cloudf1are.ccwu.cc',
  'backup1.cloudflare.com',
  'backup2.cloudflare.com'
];
```

### TLS指纹选项
- `chrome` - Chrome浏览器指纹
- `firefox` - Firefox浏览器指纹  
- `safari` - Safari浏览器指纹
- `ios` - iOS设备指纹
- `android` - Android设备指纹
- `edge` - Edge浏览器指纹
- `randomized` - 随机化指纹
- `random` - 自动随机选择

### 流量参数说明
- `padding` - 流量填充 (0-4096字节)
- `mtu` - 最大传输单元 (1400-1600)
- `timestamp` - 时间戳混淆
- `stream` - HTTP/2流ID
- `ua` - User-Agent标识

## 📈 性能监控

### 日志输出示例
```
Starting enhanced VPN node...
Enhanced features: padding=a1b2c3, mtu=1524
TLS fingerprint rotated
Domain switched to: backup-domain.com
Subscription uploaded successfully
```

### 健康检查
- **域名检测**: 每5分钟自动检测
- **TLS轮换**: 每小时自动更换
- **缓存机制**: 减少网络开销

## 🛠️ 故障排除

### 常见问题

**Q: 节点连接失败**
```
A: 检查环境变量配置
   - 确认ARGO_DOMAIN和ARGO_AUTH正确
   - 检查CFIP和CFPORT设置
   - 查看Railway部署日志
```

**Q: 订阅无法访问**
```
A: 检查SUB_TOKEN设置
   - 确认订阅链接包含正确token
   - 检查SUB_PATH路径是否正确
```

**Q: 域名轮换不工作**
```
A: 检查备用域名配置
   - 确认BACKUP_DOMAINS中域名可用
   - 查看域名健康检测日志
```

## � 技术架构

### 核心组件
- **Express服务器** - HTTP服务和订阅提供
- **Xray核心** - 多协议代理引擎
- **Cloudflared** - 隧道客户端
- **智能路由** - 流量分发和过滤

### 安全机制
- **多层加密** - TLS + 协议加密
- **流量伪装** - DPI规避技术
- **动态配置** - 实时参数更新
- **访问控制** - Token鉴权机制

## 🔄 版本更新

### v2.0 增强版特性
- ✅ 新增流量填充技术
- ✅ 智能域名轮换
- ✅ TLS指纹动态轮换
- ✅ User-Agent随机化
- ✅ 代码性能优化
- ✅ 错误处理简化

### 升级指南
1. 备份当前环境变量
2. 更新代码到最新版本
3. 重新部署项目
4. 验证功能正常

## 📞 技术支持

### 获取帮助
-  **问题反馈**: GitHub Issues
- 📖 **使用文档**: 本README

### 贡献指南
欢迎提交Pull Request和Issue！
- 🌟 Star本项目
- 🍴 Fork并修改
- 📤 提交你的改进

---

<div align="center">
  <strong>⭐ 如果这个项目对你有帮助，请给个Star支持一下！</strong>
  <br><br>
  <em>本项目持续维护更新，专注提供最稳定、最安全的代理解决方案</em>
</div>
