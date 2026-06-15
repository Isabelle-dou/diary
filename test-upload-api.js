const http = require('http');
const fs = require('fs');
const path = require('path');

// 创建一个简单的测试图片（base64编码的小图片）
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAhElEQVRYR+2WwQnAIAxFf5L7y6Y+EGO8iBCbK0YQcRHAh9NENoJQkL8Bd4AZ4Bd4BF4AF4BF4BF4AF4BF4AF4BF4BF4BF4AF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4BF4B/QEAAAAASUVORK5CYII=';
const testImageBuffer = Buffer.from(testImageBase64, 'base64');

// 创建临时测试文件
const tempFilePath = path.join(__dirname, 'test-avatar.png');
fs.writeFileSync(tempFilePath, testImageBuffer);

// 准备FormData
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
    'Cookie': 'user-id=test-user-id-123'
  }
};

console.log('=== 测试头像上传 API ===');
console.log(`请求地址: http://localhost:${options.port}${options.path}`);
console.log(`请求方法: ${options.method}`);
console.log(`Content-Type: ${options.headers['Content-Type']}`);
console.log(`Content-Length: ${options.headers['Content-Length']}`);
console.log('---');

const req = http.request(options, (res) => {
  console.log(`响应状态码: ${res.statusCode}`);
  console.log('响应头:', res.headers);
  console.log('---');
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('响应体:', data);
    console.log('---');
    
    try {
      const json = JSON.parse(data);
      if (res.statusCode === 200 && json.success) {
        console.log('✓ 测试通过: 头像上传成功');
      } else {
        console.log('✗ 测试失败: ' + (json.error || '未知错误'));
      }
    } catch (e) {
      console.log('✗ 响应不是有效的JSON:', data);
    }
    
    // 清理临时文件
    fs.unlinkSync(tempFilePath);
  });
});

req.on('error', (e) => {
  console.error('请求错误:', e.message);
  fs.unlinkSync(tempFilePath);
});

req.write(formData);
req.end();
