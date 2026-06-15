const http = require('http');
const fs = require('fs');
const path = require('path');

const testEmail = 'test@example.com';
const testPassword = 'password123';

// 创建一个简单的测试图片（base64编码的小图片）
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAhElEQVRYR+2WwQnAIAxFf5L7y6Y+EGO8iBCbK0YQcRHAh9NENoJQkL8Bd4AZ4Bd4BF4AF4BF4BF4AF4BF4AF4BF4BF4BF4AF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4B/QEAAAAASUVORK5CYII=';
const testImageBuffer = Buffer.from(testImageBase64, 'base64');

// 创建临时测试文件
const tempFilePath = path.join(__dirname, 'test-avatar.png');
fs.writeFileSync(tempFilePath, testImageBuffer);

let userId = null;

async function registerUser() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email: testEmail, password: testPassword });
    
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`注册响应: ${res.statusCode}`);
        try {
          const json = JSON.parse(body);
          if (res.statusCode === 201) {
            userId = json.user.id;
            console.log(`✓ 用户注册成功，ID: ${userId}`);
            resolve();
          } else if (res.statusCode === 409) {
            // 用户已存在，尝试登录
            console.log('用户已存在，尝试登录...');
            loginUser().then(resolve).catch(reject);
          } else {
            reject(new Error(json.error || '注册失败'));
          }
        } catch (e) {
          reject(new Error('解析响应失败'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function loginUser() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email: testEmail, password: testPassword });
    
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: '/api/simple-login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`登录响应: ${res.statusCode}`);
        try {
          const json = JSON.parse(body);
          if (res.statusCode === 200) {
            userId = json.user.id;
            console.log(`✓ 用户登录成功，ID: ${userId}`);
            resolve();
          } else {
            reject(new Error(json.message || '登录失败'));
          }
        } catch (e) {
          reject(new Error('解析响应失败'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function uploadAvatar() {
  return new Promise((resolve, reject) => {
    if (!userId) {
      reject(new Error('用户未登录'));
      return;
    }

    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const fileContent = fs.readFileSync(tempFilePath);

    const formData = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from('Content-Disposition: form-data; name="file"; filename="test-avatar.png"\r\n'),
      Buffer.from('Content-Type: image/png\r\n\r\n'),
      fileContent,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const options = {
      hostname: 'localhost',
      port: 3002,
      path: '/api/user/avatar/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': formData.length,
        'Cookie': `user-id=${userId}`
      }
    };

    console.log(`\n=== 测试头像上传 API ===`);
    console.log(`用户ID: ${userId}`);
    console.log(`请求地址: http://localhost:${options.port}${options.path}`);

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`响应状态码: ${res.statusCode}`);
        try {
          const json = JSON.parse(body);
          if (res.statusCode === 200 && json.success) {
            console.log('✓ 头像上传成功！');
            console.log('头像URL:', json.avatarUrl);
            resolve(json);
          } else {
            console.log('✗ 上传失败:', json.error || '未知错误');
            reject(new Error(json.error || '上传失败'));
          }
        } catch (e) {
          console.log('✗ 响应不是有效的JSON:', body);
          reject(new Error('响应解析失败: ' + body));
        }
      });
    });

    req.on('error', (e) => {
      console.error('请求错误:', e.message);
      reject(e);
    });

    req.write(formData);
    req.end();
  });
}

// 执行完整测试流程
async function runTests() {
  console.log('=== 开始完整头像上传测试 ===\n');
  
  try {
    await registerUser();
    await uploadAvatar();
    console.log('\n✓ 所有测试通过！');
  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
  } finally {
    // 清理临时文件
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

runTests();
