const http = require('http');
const fs = require('fs');
const path = require('path');

const testEmail = 'debug@example.com';
const testPassword = 'password123';
const testUserId = 'debug-user-id-12345';

// 创建一个简单的测试图片（base64编码的小图片）
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAhElEQVRYR+2WwQnAIAxFf5L7y6Y+EGO8iBCbK0YQcRHAh9NENoJQkL8Bd4AZ4Bd4BF4AF4BF4BF4AF4BF4AF4BF4BF4BF4AF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4B/QEAAAAASUVORK5CYII=';
const testImageBuffer = Buffer.from(testImageBase64, 'base64');

// 创建临时测试文件
const tempFilePath = path.join(__dirname, 'debug-avatar.png');
fs.writeFileSync(tempFilePath, testImageBuffer);

async function testDirectUpload() {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const fileContent = fs.readFileSync(tempFilePath);

    const formData = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from('Content-Disposition: form-data; name="file"; filename="debug-avatar.png"\r\n'),
      Buffer.from('Content-Type: image/png\r\n\r\n'),
      fileContent,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/user/avatar/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': formData.length,
        'Cookie': `user-id=${testUserId}`
      }
    };

    console.log(`\n=== 直接测试头像上传 API ===`);
    console.log(`用户ID: ${testUserId}`);
    console.log(`请求地址: http://localhost:${options.port}${options.path}`);

    const req = http.request(options, (res) => {
      console.log(`响应状态码: ${res.statusCode}`);
      console.log('响应头:', res.headers);
      
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log('响应体:', body);
        try {
          const json = JSON.parse(body);
          if (res.statusCode === 200 && json.success) {
            console.log('✓ 头像上传成功！');
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

async function testWithRealUser() {
  console.log('=== 使用真实用户测试 ===');
  
  // 先注册用户
  return new Promise((resolve, reject) => {
    const registerData = JSON.stringify({ email: testEmail, password: testPassword });
    
    const registerOptions = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': registerData.length
      }
    };

    const registerReq = http.request(registerOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`注册响应: ${res.statusCode}`);
        try {
          const json = JSON.parse(body);
          if (res.statusCode === 201 || res.statusCode === 409) {
            // 用户已存在或创建成功
            const userId = json.user?.id || testUserId;
            console.log(`用户ID: ${userId}`);
            
            // 现在测试上传
            const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
            const fileContent = fs.readFileSync(tempFilePath);

            const formData = Buffer.concat([
              Buffer.from(`--${boundary}\r\n`),
              Buffer.from('Content-Disposition: form-data; name="file"; filename="debug-avatar.png"\r\n'),
              Buffer.from('Content-Type: image/png\r\n\r\n'),
              fileContent,
              Buffer.from(`\r\n--${boundary}--\r\n`)
            ]);

            const uploadOptions = {
              hostname: 'localhost',
              port: 3001,
              path: '/api/user/avatar/upload',
              method: 'POST',
              headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': formData.length,
                'Cookie': `user-id=${userId}`
              }
            };

            const uploadReq = http.request(uploadOptions, (uploadRes) => {
              let uploadBody = '';
              uploadRes.on('data', (chunk) => uploadBody += chunk);
              uploadRes.on('end', () => {
                console.log(`上传响应状态码: ${uploadRes.statusCode}`);
                console.log('上传响应体:', uploadBody);
                try {
                  const uploadJson = JSON.parse(uploadBody);
                  if (uploadRes.statusCode === 200 && uploadJson.success) {
                    console.log('✓ 头像上传成功！');
                    resolve(uploadJson);
                  } else {
                    console.log('✗ 上传失败:', uploadJson.error || '未知错误');
                    reject(new Error(uploadJson.error || '上传失败'));
                  }
                } catch (e) {
                  console.log('✗ 响应不是有效的JSON:', uploadBody);
                  reject(new Error('响应解析失败: ' + uploadBody));
                }
              });
            });

            uploadReq.on('error', (e) => {
              console.error('上传请求错误:', e.message);
              reject(e);
            });

            uploadReq.write(formData);
            uploadReq.end();
            
          } else {
            reject(new Error(json.error || '注册失败'));
          }
        } catch (e) {
          reject(new Error('解析响应失败'));
        }
      });
    });

    registerReq.on('error', reject);
    registerReq.write(registerData);
    registerReq.end();
  });
}

// 执行测试
async function runTests() {
  console.log('=== 头像上传功能调试测试 ===\n');
  
  try {
    await testDirectUpload();
    console.log('\n---\n');
    await testWithRealUser();
    console.log('\n✓ 所有测试完成！');
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
