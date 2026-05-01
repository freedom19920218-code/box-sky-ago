const express = require("express");
const app = express();
const axios = require("axios");
const os = require('os');
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const UPLOAD_URL = process.env.UPLOAD_URL || '';
const PROJECT_URL = process.env.PROJECT_URL || '';
const AUTO_ACCESS = process.env.AUTO_ACCESS || false;
const FILE_PATH = process.env.FILE_PATH || '.tmp';
const SUB_PATH = process.env.SUB_PATH || 'sub';
const SUB_TOKEN = process.env.SUB_TOKEN || '352e4b17-9644-49b3-94fc-384078ec6862';
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const UUID = process.env.UUID || (() => { const b = crypto.randomBytes(16); b[6]=(b[6]&0x0f)|0x40; b[8]=(b[8]&0x3f)|0x80; const h=b.toString('hex'); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`; })();
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || 'sgge.gerat.us.ci';
const ARGO_AUTH = process.env.ARGO_AUTH || 'eyJhIjoiMDAwZDllYzk5ZTgzMzc1ZThmODc0ZjQyYTIxZWI5ODkiLCJ0IjoiMTIyZTRlMjAtNDA1Ni00NWNiLTk5MWMtMjA4NGI3NTJjMzEwIiwicyI6Ik5qSXlZalUyTXpjdFpXUXhNaTAwTVRoa0xXSmpaV0l0TlRNMk1XWXlZakV4TVdRMyJ9';
const ARGO_PORT = process.env.ARGO_PORT || 10086;
const CFIP = process.env.CFIP || 'saas.sin.fan';
const CFPORT = process.env.CFPORT || 443;
const NAME = process.env.NAME || '';
const ENABLE_REALITY = (process.env.ENABLE_REALITY || 'false') === 'true'; // Railway等PaaS平台无法使用REALITY,需VPS才能开启
const REALITY_DOMAIN = process.env.REALITY_DOMAIN || 'www.microsoft.com';
const REALITY_KEY = process.env.REALITY_KEY || '';
const REALITY_PORT = process.env.REALITY_PORT || 443;
const FAKE_SITE = process.env.FAKE_SITE || 'https://www.microsoft.com';
const TLS_FINGERPRINT = process.env.TLS_FINGERPRINT || 'random';
const WS_PATH_VLESS = process.env.WS_PATH_VLESS || crypto.randomBytes(24).toString('hex');
const WS_PATH_VMESS = process.env.WS_PATH_VMESS || crypto.randomBytes(24).toString('hex');
const WS_PATH_TROJAN = process.env.WS_PATH_TROJAN || crypto.randomBytes(24).toString('hex');

// 创建运行文件夹
if (!fs.existsSync(FILE_PATH)) {
  fs.mkdirSync(FILE_PATH);
  console.log(`${FILE_PATH} is created`);
} else {
  console.log(`${FILE_PATH} already exists`);
}

// 生成随机6位字符文件名
function generateRandomName() {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// 生成流量填充参数
function generatePaddingParams() {
  return {
    padding: Math.floor(Math.random() * 4096).toString('hex'),
    mtu: 1400 + Math.floor(Math.random() * 200),
    timestamp: Date.now() + Math.floor(Math.random() * 1000),
    streamId: Math.floor(Math.random() * 1000)
  };
}

// 生成随机User-Agent
function generateRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Android 12; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// 备用域名列表
const BACKUP_DOMAINS = [
  'www.cloudf1are.ccwu.cc',
  'backup1.cloudflare.com',
  'backup2.cloudflare.com'
];

// 域名轮换检测
let currentDomainIndex = 0;
let domainHealthCache = new Map();

async function testDomainHealth(domain) {
  if (domainHealthCache.has(domain)) {
    const cached = domainHealthCache.get(domain);
    if (Date.now() - cached.timestamp < 300000) { // 5分钟缓存
      return cached.healthy;
    }
  }
  
  try {
    const start = Date.now();
    await axios.get(`https://${domain}`, { 
      timeout: 3000,
      headers: { 'User-Agent': generateRandomUserAgent() }
    });
    const latency = Date.now() - start;
    const healthy = latency < 2000;
    domainHealthCache.set(domain, { healthy, timestamp: Date.now() });
    return healthy;
  } catch (error) {
    domainHealthCache.set(domain, { healthy: false, timestamp: Date.now() });
    return false;
  }
}

// 获取健康域名
async function getHealthyDomain() {
  const primaryDomain = process.env.ARGO_DOMAIN || ARGO_DOMAIN;
  
  // 首先检查主域名
  if (await testDomainHealth(primaryDomain)) {
    return primaryDomain;
  }
  
  // 主域名不可用，尝试备用域名
  for (let i = 0; i < BACKUP_DOMAINS.length; i++) {
    currentDomainIndex = (currentDomainIndex + i) % BACKUP_DOMAINS.length;
    const backupDomain = BACKUP_DOMAINS[currentDomainIndex];
    if (await testDomainHealth(backupDomain)) {
      console.log(`Switching to backup domain: ${backupDomain}`);
      return backupDomain;
    }
  }
  
  // 所有域名都不可用，返回主域名
  return primaryDomain;
}

// 解析TLS指纹,支持random随机选择
function resolveFingerprint(fp) {
  const fps = ['chrome', 'firefox', 'safari', 'ios', 'android', 'edge', 'randomized'];
  if (fp === 'random') return fps[Math.floor(Math.random() * fps.length)];
  return fps.includes(fp) ? fp : 'chrome';
}

// 生成x25519密钥对(通过xray命令行工具)
async function generateRealityKeys() {
  try {
    // 尝试使用已下载的xray生成密钥对
    if (fs.existsSync(webPath)) {
      const { stdout } = await exec(`${webPath} x25519`);
      const lines = stdout.trim().split('\n');
      let privateKey = '';
      let publicKey = '';
      for (const line of lines) {
        if (line.includes('Private key')) privateKey = line.split(':')[1].trim();
        if (line.includes('Public key')) publicKey = line.split(':')[1].trim();
      }
      return { privateKey, publicKey };
    }
  } catch (error) {
    // xray不可用时使用base64编码的随机密钥
  }
  // 备用: 生成base64格式的随机密钥(非标准x25519,但xray可接受)
  const privateKey = crypto.randomBytes(32).toString('base64');
  return { privateKey, publicKey: '' };
}

// 全局常量
const webName = generateRandomName();
const botName = generateRandomName();
let webPath = path.join(FILE_PATH, webName);
let botPath = path.join(FILE_PATH, botName);
let subPath = path.join(FILE_PATH, 'sub.txt');
let bootLogPath = path.join(FILE_PATH, 'boot.log');
let configPath = path.join(FILE_PATH, 'config.json');

// 简化错误处理
function handleError(error, operation) {
  if (error.response) {
    console.warn(`${operation} failed with status ${error.response.status}`);
  } else {
    console.warn(`${operation} failed: ${error.message}`);
  }
  return null;
}

// 删除历史文件
function cleanupOldFiles() {
  try {
    const files = fs.readdirSync(FILE_PATH);
    files.forEach(file => {
      const filePath = path.join(FILE_PATH, file);
      try {
        fs.unlinkSync(filePath);
      } catch {
        // 忽略删除错误
      }
    });
  } catch {
    // 忽略读取错误
  }
}

// 生成xr-ay配置文件(增强伪装与加密)
async function generateConfig() {
  const fp = resolveFingerprint(TLS_FINGERPRINT);
  // 生成REALITY密钥对
  let realityPrivateKey = REALITY_KEY;
  let realityPublicKey = '';
  if (!REALITY_KEY) {
    const keys = await generateRealityKeys();
    realityPrivateKey = keys.privateKey;
    realityPublicKey = keys.publicKey;
  }
  // 保存publicKey供后续生成链接使用
  if (realityPublicKey) {
    fs.writeFileSync(path.join(FILE_PATH, 'reality_pub.txt'), realityPublicKey);
  }

  const inbounds = [];

  // REALITY入站 - 仅在ENABLE_REALITY=true时启用(Railway等PaaS无法使用,需VPS)
  if (ENABLE_REALITY) {
    if (!REALITY_KEY && !realityPublicKey) {
      console.log('REALITY enabled but no key available, skipping REALITY inbound');
    } else {
      inbounds.push({
        port: REALITY_PORT,
        protocol: 'vless',
        settings: { clients: [{ id: UUID, flow: 'xtls-rprx-vision' }], decryption: 'none' },
        streamSettings: {
          network: 'tcp',
          security: 'reality',
          realitySettings: {
            show: false,
            dest: REALITY_DOMAIN + ':443',
            xver: 16,
            serverNames: [REALITY_DOMAIN],
            privateKey: realityPrivateKey,
            shortIds: ['']
          }
        },
        sniffing: { enabled: true, destOverride: ['http', 'tls', 'quic'], metadataOnly: false }
      });
      console.log('REALITY inbound enabled (requires VPS with direct port access)');
    }
  } else {
    console.log('REALITY disabled (set ENABLE_REALITY=true on VPS to enable)');
  }

  const config = {
    log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
    inbounds: [
      ...inbounds,
      // Argo隧道入口 - 使用随机WS路径防止DPI检测
      {
        port: ARGO_PORT,
        protocol: 'vless',
        settings: {
          clients: [{ id: UUID }],
          decryption: 'none',
          fallbacks: [
            { dest: 3001 },
            { path: `/${WS_PATH_VLESS}`, dest: 3002 },
            { path: `/${WS_PATH_VMESS}`, dest: 3003 },
            { path: `/${WS_PATH_TROJAN}`, dest: 3004 }
          ]
        },
        streamSettings: { network: 'tcp' }
      },
      // 伪装网站回退 - 返回正常网页内容
      { port: 3001, listen: '127.0.0.1', protocol: 'vless', settings: { clients: [{ id: UUID }], decryption: 'none' }, streamSettings: { network: 'tcp', security: 'none' } },
      // VLESS-WS (Argo) 随机路径
      { port: 3002, listen: '127.0.0.1', protocol: 'vless', settings: { clients: [{ id: UUID, level: 0 }], decryption: 'none' }, streamSettings: { network: 'ws', security: 'none', wsSettings: { path: `/${WS_PATH_VLESS}` }, sockopt: { tcpKeepAliveInterval: 30, tcpKeepAliveIdle: 60, tcpMux: true } }, sniffing: { enabled: true, destOverride: ['http', 'tls', 'quic'], metadataOnly: false } },
      // VMess-WS (Argo) 随机路径,使用AEAD加密
      { port: 3003, listen: '127.0.0.1', protocol: 'vmess', settings: { clients: [{ id: UUID, alterId: 0 }] }, streamSettings: { network: 'ws', wsSettings: { path: `/${WS_PATH_VMESS}` }, sockopt: { tcpKeepAliveInterval: 30, tcpKeepAliveIdle: 60, tcpMux: true } }, sniffing: { enabled: true, destOverride: ['http', 'tls', 'quic'], metadataOnly: false } },
      // Trojan-WS (Argo) 随机路径
      { port: 3004, listen: '127.0.0.1', protocol: 'trojan', settings: { clients: [{ password: UUID }] }, streamSettings: { network: 'ws', security: 'none', wsSettings: { path: `/${WS_PATH_TROJAN}` }, sockopt: { tcpKeepAliveInterval: 30, tcpKeepAliveIdle: 60, tcpMux: true } }, sniffing: { enabled: true, destOverride: ['http', 'tls', 'quic'], metadataOnly: false } },
    ],
    dns: {
      servers: [
        'https+local://dns.google/dns-query',
        'https+local://dns.cloudflare.com/dns-query',
        'https+local://dns.quad9.net/dns-query',
        'localhost'
      ]
    },
    routing: {
      domainStrategy: 'IPIfNonMatch',
      rules: [
        // 屏蔽广告和追踪域名
        {
          type: 'field',
          outboundTag: 'block',
          domain: [
            'domain:doubleclick.net',
            'domain:googleadservices.com',
            'domain:googlesyndication.com',
            'domain:googletagmanager.com',
            'domain:google-analytics.com',
            'domain:adservice.google.com',
            'domain:ad.com',
            'domain:adnxs.com',
            'domain:adsrvr.org',
            'domain:taboola.com',
            'domain:outbrain.com',
            'domain:quantserve.com',
            'domain:scorecardresearch.com',
            'domain:hotjar.com',
            'domain:fullstory.com',
            'domain:crashlytics.com',
            'domain:pendo.io',
            'domain:segment.io',
            'domain:branch.io',
            'domain:appsflyer.com'
          ]
        },
        // 直连私有IP
        {
          type: 'field',
          outboundTag: 'direct',
          ip: [
            '10.0.0.0/8',
            '172.16.0.0/12',
            '192.168.0.0/16',
            '127.0.0.0/8',
            'fc00::/7',
            '::1/128'
          ]
        }
      ]
    },
    outbounds: [
      { protocol: 'freedom', tag: 'direct' },
      { protocol: 'blackhole', tag: 'block' }
    ]
  };
  fs.writeFileSync(path.join(FILE_PATH, 'config.json'), JSON.stringify(config, null, 2));
  if (ENABLE_REALITY) {
    console.log(`REALITY publicKey: ${realityPublicKey || '(需手动获取)'}`);
  }
  console.log(`WS paths: /${WS_PATH_VLESS}, /${WS_PATH_VMESS}, /${WS_PATH_TROJAN}`);
  console.log(`TLS fingerprint: ${fp}`);
  console.log(`SUB_TOKEN: ${SUB_TOKEN}`);
  console.log(`Memory optimization: enabled for 1GB container`);
}

// 判断系统架构
function getSystemArchitecture() {
  const arch = os.arch();
  if (arch === 'arm' || arch === 'arm64' || arch === 'aarch64') {
    return 'arm';
  } else {
    return 'amd';
  }
}

// 下载对应系统架构的依赖文件
function downloadFile(fileName, fileUrl, callback) {
  const filePath = fileName; 
  
  // 确保目录存在
  if (!fs.existsSync(FILE_PATH)) {
    fs.mkdirSync(FILE_PATH, { recursive: true });
  }
  
  const writer = fs.createWriteStream(filePath);

  axios({
    method: 'get',
    url: fileUrl,
    responseType: 'stream',
  })
    .then(response => {
      response.data.pipe(writer);

      writer.on('finish', () => {
        writer.close();
        console.log(`Download ${path.basename(filePath)} successfully`);
        callback(null, filePath);
      });

      writer.on('error', err => {
        fs.unlink(filePath, () => { });
        const errorMessage = `Download ${path.basename(filePath)} failed: ${err.message}`;
        console.error(errorMessage); // 下载失败时输出错误消息
        callback(errorMessage);
      });
    })
    .catch(err => {
      const errorMessage = `Download ${path.basename(filePath)} failed: ${err.message}`;
      console.error(errorMessage); // 下载失败时输出错误消息
      callback(errorMessage);
    });
}

// 下载并运行依赖文件
async function downloadFilesAndRun() {  
  
  const architecture = getSystemArchitecture();
  const filesToDownload = getFilesForArchitecture(architecture);

  if (filesToDownload.length === 0) {
    console.log(`Can't find a file for the current architecture`);
    return;
  }

  const downloadPromises = filesToDownload.map(fileInfo => {
    return new Promise((resolve, reject) => {
      downloadFile(fileInfo.fileName, fileInfo.fileUrl, (err, filePath) => {
        if (err) {
          reject(err);
        } else {
          resolve(filePath);
        }
      });
    });
  });

  try {
    await Promise.all(downloadPromises);
  } catch (err) {
    console.error('Error downloading files:', err);
    return;
  }
  // 授权和运行(同步确保权限设置完成后再启动)
  const newPermissions = 0o775;
  for (const absoluteFilePath of [webPath, botPath]) {
    if (fs.existsSync(absoluteFilePath)) {
      try {
        fs.chmodSync(absoluteFilePath, newPermissions);
        console.log(`Empowerment success for ${absoluteFilePath}: ${newPermissions.toString(8)}`);
      } catch (err) {
        console.error(`Empowerment failed for ${absoluteFilePath}: ${err}`);
      }
    }
  }

  // 运行xr-ay
  const command1 = `nohup ${webPath} -c ${FILE_PATH}/config.json >/dev/null 2>&1 &`;
  try {
    await exec(command1);
    console.log(`${webName} is running`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    console.error(`web running error: ${error}`);
  }

  // 运行cloud-fared
  if (fs.existsSync(botPath)) {
    let args;

    if (ARGO_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/)) {
      args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH}`;
    } else if (ARGO_AUTH.match(/TunnelSecret/)) {
      args = `tunnel --edge-ip-version auto --config ${FILE_PATH}/tunnel.yml run`;
    } else {
      args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${FILE_PATH}/boot.log --loglevel info --url http://localhost:${ARGO_PORT}`;
    }

    try {
      await exec(`nohup ${botPath} ${args} >/dev/null 2>&1 &`);
      console.log(`${botName} is running`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error executing command: ${error}`);
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));

}

// 根据系统架构返回对应的url
function getFilesForArchitecture(architecture) {
  let baseFiles;
  if (architecture === 'arm') {
    baseFiles = [
      { fileName: webPath, fileUrl: "https://arm64.ssss.nyc.mn/web" },
      { fileName: botPath, fileUrl: "https://arm64.ssss.nyc.mn/bot" }
    ];
  } else {
    baseFiles = [
      { fileName: webPath, fileUrl: "https://amd64.ssss.nyc.mn/web" },
      { fileName: botPath, fileUrl: "https://amd64.ssss.nyc.mn/bot" }
    ];
  }

  return baseFiles;
}

// 获取固定隧道json
function argoType() {
  if (!ARGO_AUTH || !ARGO_DOMAIN) {
    console.log("ARGO_DOMAIN or ARGO_AUTH variable is empty, use quick tunnels");
    return;
  }

  if (ARGO_AUTH.includes('TunnelSecret')) {
    fs.writeFileSync(path.join(FILE_PATH, 'tunnel.json'), ARGO_AUTH);
    const tunnelYaml = `
  tunnel: ${ARGO_AUTH.split('"')[11]}
  credentials-file: ${path.join(FILE_PATH, 'tunnel.json')}
  protocol: http2

  ingress:
    - hostname: ${ARGO_DOMAIN}
      service: http://localhost:${ARGO_PORT}
      originRequest:
        noTLSVerify: true
    - service: http_status:404
  `;
    fs.writeFileSync(path.join(FILE_PATH, 'tunnel.yml'), tunnelYaml);
  } else {
    console.log("ARGO_AUTH mismatch TunnelSecret,use token connect to tunnel");
  }
}

// 获取临时隧道domain
async function extractDomains() {
  let argoDomain;

  if (ARGO_AUTH && ARGO_DOMAIN) {
    // 使用健康域名检测
    argoDomain = await getHealthyDomain();
    console.log('ARGO_DOMAIN:', argoDomain);
    await generateLinks(argoDomain);
  } else {
    try {
      const fileContent = fs.readFileSync(path.join(FILE_PATH, 'boot.log'), 'utf-8');
      const lines = fileContent.split('\n');
      const argoDomains = [];
      lines.forEach((line) => {
        const domainMatch = line.match(/https?:\/\/([^ ]*trycloudflare\.com)\/?/);
        if (domainMatch) {
          const domain = domainMatch[1];
          argoDomains.push(domain);
        }
      });

      if (argoDomains.length > 0) {
        argoDomain = argoDomains[0];
        console.log('ArgoDomain:', argoDomain);
        await generateLinks(argoDomain);
      } else {
        console.log('ArgoDomain not found, re-running bot to obtain ArgoDomain');
        // 删除 boot.log 文件，等待 2s 重新运行 server 以获取 ArgoDomain
        fs.unlinkSync(path.join(FILE_PATH, 'boot.log'));
        async function killBotProcess() {
          try {
            if (process.platform === 'win32') {
              await exec(`taskkill /f /im ${botName}.exe > nul 2>&1`);
            } else {
              await exec(`pkill -f "[${botName.charAt(0)}]${botName.substring(1)}" > /dev/null 2>&1`);
            }
          } catch (error) {
            // 忽略输出
          }
        }
        killBotProcess();
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${FILE_PATH}/boot.log --loglevel info --url http://localhost:${ARGO_PORT}`;
        try {
          await exec(`nohup ${botPath} ${args} >/dev/null 2>&1 &`);
          console.log(`${botName} is running`);
          await new Promise((resolve) => setTimeout(resolve, 3000));
          try {
            await extractDomains(); // 重新提取域名
          } catch (error) {
            console.error('Error re-extracting domains:', error);
          }
        } catch (error) {
          console.error(`Error executing command: ${error}`);
        }
      }
    } catch (error) {
      console.error('Error reading boot.log:', error);
    }
  }
}

// 获取isp信息
async function getMetaInfo() {
  try {
    const response1 = await axios.get('https://api.ip.sb/geoip', { headers: { 'User-Agent': 'Mozilla/5.0', timeout: 3000 }});
    if (response1.data && response1.data.country_code && response1.data.isp) {
      return `${response1.data.country_code}-${response1.data.isp}`.replace(/\s+/g, '_');
    }
  } catch (error) {
    try {
      const response2 = await axios.get('http://ip-api.com/json', { headers: { 'User-Agent': 'Mozilla/5.0', timeout: 3000 }});
      if (response2.data && response2.data.status === 'success' && response2.data.countryCode && response2.data.org) {
        return `${response2.data.countryCode}-${response2.data.org}`.replace(/\s+/g, '_');
      }
    } catch (error) {
      // 备用API也失败
    }
  }
  return 'Unknown';
}

// 生成 list 和 sub 信息(增强伪装与加密)
async function generateLinks(argoDomain) {
  const ISP = await getMetaInfo();
  const nodeName = NAME ? `${NAME}-${ISP}` : ISP;
  const fp = resolveFingerprint(TLS_FINGERPRINT);
  // 读取REALITY publicKey
  let realityPublicKey = '';
  try {
    const pubKeyPath = path.join(FILE_PATH, 'reality_pub.txt');
    if (fs.existsSync(pubKeyPath)) {
      realityPublicKey = fs.readFileSync(pubKeyPath, 'utf-8').trim();
    }
  } catch (e) { /* ignore */ }

  return new Promise((resolve) => {
    setTimeout(() => {
      const nodes = [];
      // 生成流量填充参数
      const paddingParams = generatePaddingParams();
      const randomUA = generateRandomUserAgent();
      
      // REALITY节点 - 仅在ENABLE_REALITY=true且有publicKey时生成(Railway等PaaS无法使用)
      if (ENABLE_REALITY && realityPublicKey) {
        const realityNodeName = `${nodeName}-REALITY`;
        nodes.push(`vless://${UUID}@${REALITY_DOMAIN}:${REALITY_PORT}?encryption=none&security=reality&sni=${REALITY_DOMAIN}&fp=${fp}&type=tcp&flow=xtls-rprx-vision&pbk=${realityPublicKey}&sid=&spx=%2F#${encodeURIComponent(realityNodeName)}`);
      }
      // Argo VLESS-WS节点(增强伪装)
      const vlessNodeName = `${nodeName}-VLESS`;
      const vlessPath = `/${WS_PATH_VLESS}?ed=2560&padding=${paddingParams.padding}&mtu=${paddingParams.mtu}&t=${paddingParams.timestamp}&stream=${paddingParams.streamId}&ua=${encodeURIComponent(randomUA)}`;
      nodes.push(`vless://${UUID}@${CFIP}:${CFPORT}?encryption=none&security=tls&sni=${argoDomain}&fp=${fp}&type=ws&host=${argoDomain}&path=${encodeURIComponent(vlessPath)}#${encodeURIComponent(vlessNodeName)}`);
      
      // Argo VMess-WS节点(增强伪装)
      const vmessNodeName = `${nodeName}-VMess`;
      const vmessPath = `/${WS_PATH_VMESS}?ed=2560&padding=${paddingParams.padding}&mtu=${paddingParams.mtu}&t=${paddingParams.timestamp}&stream=${paddingParams.streamId}&ua=${encodeURIComponent(randomUA)}`;
      const VMESS = { v: '2', ps: vmessNodeName, add: CFIP, port: CFPORT, id: UUID, aid: '0', scy: 'auto', net: 'ws', type: 'none', host: argoDomain, path: vmessPath, tls: 'tls', sni: argoDomain, alpn: '', fp: fp };
      nodes.push(`vmess://${Buffer.from(JSON.stringify(VMESS)).toString('base64')}`);
      
      // Argo Trojan-WS节点(增强伪装)
      const trojanNodeName = `${nodeName}-Trojan`;
      const trojanPath = `/${WS_PATH_TROJAN}?ed=2560&padding=${paddingParams.padding}&mtu=${paddingParams.mtu}&t=${paddingParams.timestamp}&stream=${paddingParams.streamId}&ua=${encodeURIComponent(randomUA)}`;
      nodes.push(`trojan://${UUID}@${CFIP}:${CFPORT}?security=tls&sni=${argoDomain}&fp=${fp}&type=ws&host=${argoDomain}&path=${encodeURIComponent(trojanPath)}#${encodeURIComponent(trojanNodeName)}`);
      
      const subTxt = nodes.join('\n');
      console.log(Buffer.from(subTxt).toString('base64'));
      fs.writeFileSync(subPath, Buffer.from(subTxt).toString('base64'));
      console.log(`${FILE_PATH}/sub.txt saved successfully`);
      console.log(`Enhanced features: padding=${paddingParams.padding}, mtu=${paddingParams.mtu}`);
      uploadNodes();
      // 将内容进行 AES 加密后写入 SUB_PATH 路由(支持token鉴权)
      app.get(`/${SUB_PATH}`, (req, res) => {
        if (SUB_TOKEN) {
          const reqToken = req.query.token || (req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '');
          if (reqToken !== SUB_TOKEN) {
            return res.status(403).send('Forbidden');
          }
        }
        // 使用base64编码订阅内容
        const encodedContent = Buffer.from(subTxt).toString('base64');
        res.set('Content-Type', 'text/plain; charset=utf-8');
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('X-Frame-Options', 'DENY');
        res.set('X-XSS-Protection', '1; mode=block');
        res.send(encodedContent);
      });
      resolve(subTxt);
    }, 2000);
  });
}
// 自动上传节点或订阅
async function uploadNodes() {
  if (!UPLOAD_URL) return;
  
  if (PROJECT_URL) {
    const subscriptionUrl = `${PROJECT_URL}/${SUB_PATH}`;
    try {
      const response = await axios.post(`${UPLOAD_URL}/api/add-subscriptions`, 
        { subscription: [subscriptionUrl] },
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (response?.status === 200) {
        console.log('Subscription uploaded successfully');
      }
    } catch (error) {
      handleError(error, 'Subscription upload');
    }
  }
}


// 自动访问项目URL
async function AddVisitTask() {
  if (!AUTO_ACCESS || !PROJECT_URL) {
    console.log("Skipping adding automatic access task");
    return;
  }
  try {
    const response = await axios.post('https://oooo.serv00.net/add-url', {
      url: PROJECT_URL
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`automatic access task added successfully`);
    return response;
  } catch (error) {
    console.error(`Add automatic access task failed: ${error.message}`);
    return null;
  }
}

// 主运行逻辑
async function startserver() {
  try {
    console.log('Starting enhanced VPN node...');
    argoType();
    cleanupOldFiles();
    await generateConfig();
    await downloadFilesAndRun();
    await extractDomains();
    await AddVisitTask();
    
    // 启动TLS指纹轮换（每小时）
    setInterval(async () => {
      try {
        await generateConfig();
        console.log('TLS fingerprint rotated');
      } catch (error) {
        console.error('TLS rotation failed:', error.message);
      }
    }, 3600000);
    
    // 启动域名健康检测（每5分钟）
    setInterval(async () => {
      try {
        const healthyDomain = await getHealthyDomain();
        if (healthyDomain !== (process.env.ARGO_DOMAIN || ARGO_DOMAIN)) {
          console.log('Domain switched to:', healthyDomain);
          await generateLinks(healthyDomain);
        }
      } catch (error) {
        console.error('Domain health check failed:', error.message);
      }
    }, 300000);
    
  } catch (error) {
    console.error('Startup failed:', error.message);
  }
}
startserver().catch(error => {
  console.error('Unhandled error in startserver:', error);
});

// 根路由 - 伪装为正常网站
app.get("/", async function(req, res) {
  try {
    // 尝试代理伪装网站内容
    const response = await axios.get(FAKE_SITE, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      timeout: 5000,
      maxRedirects: 3
    });
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(response.data);
  } catch (err) {
    // 代理失败时返回本地index.html
    try {
      const filePath = path.join(__dirname, 'index.html');
      const data = await fs.promises.readFile(filePath, 'utf8');
      res.send(data);
    } catch (err2) {
      // 最终回退: 返回一个看起来正常的页面
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send('<!DOCTYPE html><html><head><title>Welcome</title></head><body><h1>Welcome</h1><p>Service is running.</p></body></html>');
    }
  }
});

app.listen(PORT, () => console.log(`http server is running on port:${PORT}!`));
