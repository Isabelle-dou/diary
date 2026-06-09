# Prisma 数据库问题排查指南

## 问题症状
```
Unknown field 'avatarHistory' for select statement on model 'User'
```

## 可能原因及解决方案

### 原因 1：Prisma Client 未重新生成
**症状**：Schema 已更新，但 Prisma Client 仍使用旧定义

**解决方案**：
```bash
# 清理并重新生成 Prisma Client
npx prisma generate
```

### 原因 2：数据库迁移未应用
**症状**：Prisma Client 正确，但数据库表未更新

**解决方案**：
```bash
# 强制推送数据库变更
npx prisma db push --force-reset
```

### 原因 3：Next.js 缓存问题
**症状**：修改后首次可用，之后报错

**解决方案**：
```bash
# 清理 Next.js 构建缓存
rm -rf .next
npm run dev
```

### 原因 4：缺少迁移文件
**症状**：Prisma 无法找到迁移记录

**解决方案**：
```bash
# 删除旧迁移并重新创建
rm -rf prisma/migrations
npx prisma migrate dev --name add_avatar_history
```

## 完整修复流程

### 步骤 1：使用修复脚本（推荐）

**Windows 用户**：
1. 打开文件资源管理器
2. 导航到项目目录 `D:\code\trae\diary_English`
3. 双击运行 `fix-prisma.bat`

**或手动执行**：
```cmd
cd D:\code\trae\diary_English
fix-prisma.bat
```

### 步骤 2：手动修复（如果脚本不工作）

按顺序执行以下命令：

```bash
# 2.1 清理缓存
rd /s /q .next
rd /s /q node_modules\.prisma

# 2.2 推送数据库
npx prisma db push --force-reset

# 2.3 生成 Prisma Client
npx prisma generate

# 2.4 启动开发服务器
npx next dev
```

### 步骤 3：验证修复

1. 访问 `http://localhost:3000`
2. 登录后点击右上角头像
3. 进入"头像设置"标签
4. 点击"上传头像"标签
5. 上传一张图片测试

## 如果仍然报错

### 检查 1：验证数据库文件
```
位置：D:\code\trae\diary_English\prisma\dev.db
```
确保文件存在且可访问。

### 检查 2：验证 Schema
```prisma
model User {
  // ... 其他字段
  avatarHistory   String[]  // 确保是 String[] 类型
  // ...
}
```

### 检查 3：查看 Prisma Studio
```bash
npx prisma studio
```
在浏览器中打开，检查 User 表是否有 `avatarHistory` 列。

## 紧急回退方案

如果以上方法都不起作用，可以：

### 选项 A：撤销 Schema 修改
将 `prisma/schema.prisma` 中的 `avatarHistory String[]` 改回 `avatarHistory String?`

### 选项 B：使用简化的头像历史
如果问题复杂，可以暂时移除头像历史功能，改为仅支持当前头像。

## 预防措施

1. **修改 Schema 后总是执行迁移**
   ```bash
   npx prisma migrate dev --name your_changes
   npx prisma generate
   ```

2. **团队协作时确保同步**
   ```bash
   git pull
   npx prisma migrate deploy
   npx prisma generate
   ```

3. **清理缓存**
   ```bash
   # 在重要更新后
   rm -rf .next
   rm -rf node_modules/.prisma
   ```

## 获取帮助

如果问题仍然存在，请提供：
1. 完整的错误信息
2. `npx prisma db push` 的输出
3. `npx prisma generate` 的输出
4. 数据库文件是否存在

---
生成时间：2026-06-07
