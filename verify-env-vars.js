/**
 * 环境变量验证脚本
 * 运行方式: node verify-env-vars.js
 * 
 * 此脚本用于验证头像上传功能所需的环境变量是否正确配置
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('环境变量验证脚本');
console.log('========================================\n');

const checks = [
  {
    name: '检查 Blob 认证配置',
    check: () => {
      // Vercel Blob 支持两种认证方式：
      // 1. 新版：BLOB_STORE_ID（自动配置）
      // 2. 旧版：BLOB_READ_WRITE_TOKEN（手动配置）
      
      const storeId = process.env.BLOB_STORE_ID;
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      
      if (storeId) {
        return { 
          status: 'PASS', 
          message: `✅ 新版认证：BLOB_STORE_ID 已配置（长度: ${storeId.length} 字符）`,
          value: storeId.substring(0, 10) + '...' + storeId.substring(storeId.length - 10)
        };
      } else if (token) {
        const isValidFormat = token.length > 30 && token.includes('.');
        if (isValidFormat) {
          return { 
            status: 'PASS', 
            message: `✅ 旧版认证：BLOB_READ_WRITE_TOKEN 已配置（长度: ${token.length} 字符）`,
            value: token.substring(0, 10) + '...' + token.substring(token.length - 10)
          };
        }
        return { status: 'WARN', message: 'BLOB_READ_WRITE_TOKEN 已配置，但格式可能不正确' };
      }
      return { status: 'FAIL', message: '❌ 未配置 Blob 认证（需要 BLOB_STORE_ID 或 BLOB_READ_WRITE_TOKEN）' };
    }
  },
  {
    name: '检查 VERCEL 环境变量',
    check: () => {
      const vercel = process.env.VERCEL;
      if (vercel) {
        return { status: 'PASS', message: `VERCEL 环境变量已设置: ${vercel}` };
      }
      return { status: 'INFO', message: 'VERCEL 环境变量未设置（非Vercel环境）' };
    }
  },
  {
    name: '检查 NODE_ENV 环境变量',
    check: () => {
      const nodeEnv = process.env.NODE_ENV;
      if (nodeEnv) {
        return { status: 'PASS', message: `NODE_ENV: ${nodeEnv}` };
      }
      return { status: 'WARN', message: 'NODE_ENV 未设置，默认开发环境' };
    }
  },
  {
    name: '检查 VERCEL_ENV 环境变量',
    check: () => {
      const vercelEnv = process.env.VERCEL_ENV;
      if (vercelEnv) {
        return { status: 'PASS', message: `VERCEL_ENV: ${vercelEnv}` };
      }
      return { status: 'INFO', message: 'VERCEL_ENV 未设置' };
    }
  },
  {
    name: '模拟代码环境检测逻辑',
    check: () => {
      // 支持两种认证方式
      const useBlob = !!process.env.BLOB_STORE_ID || !!process.env.BLOB_READ_WRITE_TOKEN;
      const inVercelProduction = !!process.env.VERCEL && process.env.NODE_ENV === 'production';
      
      let message = '';
      let status = 'PASS';
      
      if (inVercelProduction) {
        if (useBlob) {
          const authType = process.env.BLOB_STORE_ID ? 'BLOB_STORE_ID' : 'BLOB_READ_WRITE_TOKEN';
          message = `✅ Vercel生产环境 + Blob已配置（${authType}）→ 将使用Vercel Blob存储`;
        } else {
          message = '❌ Vercel生产环境 + Blob未配置 → 将返回错误';
          status = 'FAIL';
        }
      } else {
        if (useBlob) {
          const authType = process.env.BLOB_STORE_ID ? 'BLOB_STORE_ID' : 'BLOB_READ_WRITE_TOKEN';
          message = `🔄 非生产环境 + Blob已配置（${authType}）→ 将使用Vercel Blob存储`;
        } else {
          message = '📁 非生产环境 + Blob未配置 → 将使用本地文件存储';
        }
      }
      
      return { status, message };
    }
  },
  {
    name: '检查 .env.local 文件',
    check: () => {
      const envLocalPath = path.join(__dirname, '.env.local');
      if (fs.existsSync(envLocalPath)) {
        const content = fs.readFileSync(envLocalPath, 'utf8');
        const lines = content.split('\n');
        
        // 检查是否包含未注释的 Blob 认证配置
        const hasUncommentedStoreId = lines.some(line => 
          line.trim().startsWith('BLOB_STORE_ID=') && !line.trim().startsWith('#')
        );
        const hasUncommentedToken = lines.some(line => 
          line.trim().startsWith('BLOB_READ_WRITE_TOKEN=') && !line.trim().startsWith('#')
        );
        
        if (hasUncommentedStoreId) {
          return { status: 'PASS', message: '.env.local 已包含未注释的 BLOB_STORE_ID 配置' };
        } else if (hasUncommentedToken) {
          return { status: 'PASS', message: '.env.local 已包含未注释的 BLOB_READ_WRITE_TOKEN 配置' };
        } else if (content.includes('BLOB_STORE_ID')) {
          return { status: 'WARN', message: '.env.local 中的 BLOB_STORE_ID 被注释掉了' };
        } else if (content.includes('BLOB_READ_WRITE_TOKEN')) {
          return { status: 'WARN', message: '.env.local 中的 BLOB_READ_WRITE_TOKEN 被注释掉了' };
        }
        return { status: 'INFO', message: '.env.local 存在但未配置 Blob 认证（开发环境可使用本地存储）' };
      }
      return { status: 'INFO', message: '.env.local 文件不存在（开发环境可使用本地存储）' };
    }
  },
  {
    name: '检查 API 路由代码逻辑',
    check: () => {
      const apiPath = path.join(__dirname, 'app', 'api', 'user', 'avatar', 'upload', 'route.ts');
      if (fs.existsSync(apiPath)) {
        const content = fs.readFileSync(apiPath, 'utf8');
        
        // 检查关键逻辑
        const checks = [
          { name: 'isBlobConfigured 函数', found: content.includes('function isBlobConfigured()') },
          { name: 'isVercelProduction 函数', found: content.includes('function isVercelProduction()') },
          { name: 'Vercel生产环境强制检查', found: content.includes('if (inVercelProduction && !useBlob)') },
          { name: 'Blob上传逻辑', found: content.includes('await put(') && content.includes('@vercel/blob') },
          { name: '错误处理', found: content.includes('头像存储服务未配置') }
        ];
        
        const allFound = checks.every(c => c.found);
        
        if (allFound) {
          return { status: 'PASS', message: 'API路由代码逻辑完整' };
        } else {
          const missing = checks.filter(c => !c.found).map(c => c.name);
          return { status: 'FAIL', message: `API路由代码缺失: ${missing.join(', ')}` };
        }
      }
      return { status: 'FAIL', message: 'API路由文件不存在' };
    }
  }
];

let passed = 0;
let failed = 0;
let warned = 0;
let info = 0;

checks.forEach(check => {
  const result = check.check();
  let icon, color;
  switch (result.status) {
    case 'PASS':
      icon = '✓';
      color = '\x1b[32m';
      passed++;
      break;
    case 'FAIL':
      icon = '✗';
      color = '\x1b[31m';
      failed++;
      break;
    case 'WARN':
      icon = '!';
      color = '\x1b[33m';
      warned++;
      break;
    default:
      icon = 'i';
      color = '\x1b[36m';
      info++;
  }
  
  console.log(`${color}${icon} ${check.name}\x1b[0m`);
  console.log(`   ${result.message}`);
  if (result.value) {
    console.log(`   值（部分）: ${result.value}`);
  }
  console.log();
});

console.log('========================================');
console.log(`测试结果: ${passed} 通过, ${failed} 失败, ${warned} 警告, ${info} 提示`);
console.log('========================================\n');

if (failed > 0) {
  console.log('\x1b[31m需要修复的问题:\x1b[0m');
  console.log('1. 确保 BLOB_READ_WRITE_TOKEN 环境变量已正确配置');
  console.log('2. 检查 API 路由代码是否完整');
  console.log('3. 确保在 Vercel 控制台正确设置环境变量');
  console.log();
  process.exit(1);
} else {
  console.log('\x1b[32m所有测试通过！\x1b[0m');
  console.log();
  console.log('部署到 Vercel 时的检查清单:');
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│ 1. 在 Vercel 控制台创建 Blob 存储                      │');
  console.log('│ 2. 获取 BLOB_READ_WRITE_TOKEN                          │');
  console.log('│ 3. 在项目设置 > Environment Variables 中添加变量       │');
  console.log('│ 4. 确保 Production 环境已勾选                          │');
  console.log('│ 5. 重新部署项目                                        │');
  console.log('│ 6. 在部署日志中搜索 "BLOB_READ_WRITE_TOKEN" 确认加载   │');
  console.log('└─────────────────────────────────────────────────────────┘');
  console.log();
  process.exit(0);
}