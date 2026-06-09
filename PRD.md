
# 英文日记学习平台 - PRD 文档

## 1. 产品概述

### 1.1 产品名称
**DiaryEnglish** - 通过写英文日记学英语

### 1.2 产品定位
一款帮助用户通过每日英文写作学习英语的 AI 辅助平台。用户通过写日记的方式练习英语，AI 实时检查语法错误、词汇使用和搭配问题，并根据用户英语水平提供个性化的优化建议，让学习融入日常。

### 1.3 产品愿景
让每一篇日记都成为一次英语进步的机会，让英语学习变得自然、有趣、高效。

### 1.4 核心价值
- **个性化学习**：根据用户英语水平提供适配的建议
- **即时反馈**：AI 实时检查并提供修改建议
- **自然习得**：通过真实写作场景学习实用英语
- **持续激励**：记录学习轨迹，见证进步

### 1.5 技术栈选择

| 分类 | 技术 | 版本 | 选型理由 |
| :--- | :--- | :--- | :--- |
| 前端框架 | Next.js | 14 (App Router) | React 生态最优选择，支持服务端渲染，性能优异 |
| 编程语言 | TypeScript | 5.x | 类型安全，提升开发效率和代码质量 |
| CSS 框架 | Tailwind CSS | 3.x | 原子化 CSS，快速构建 UI，易于维护 |
| ORM | Prisma | 5.x | 类型安全的数据库访问，支持 PostgreSQL |
| 数据库 | PostgreSQL | 16.x | 稳定可靠的关系型数据库，支持 JSON 字段存储 AI 分析结果 |
| 认证 | NextAuth.js | 4.x | 灵活的认证方案，支持多种登录方式 |
| AI 服务 | OpenAI API | GPT-4o | 强大的自然语言处理能力，支持语法检查和词汇建议 |

---

## 2. 目标用户

| 用户角色 | 描述 | 核心需求 |
| :--- | :--- | :--- |
| **英语初学者** | 在校学生、职场新人，英语基础较弱 | 学习基础语法、常用词汇 |
| **进阶学习者** | 有一定英语基础，希望提升写作能力 | 学习高级表达、地道搭配 |
| **备考人群** | 备考四六级、雅思、托福的学生 | 提升写作准确性和丰富性 |
| **职场人士** | 需要用英语写邮件、报告的职场人 | 提升商务英语写作能力 |
| **英语爱好者** | 热爱英语学习，追求持续进步 | 保持英语学习习惯 |

### 用户画像示例
- **小明**：大二学生，英语四级备考中，每天写 100-200 词日记，希望提升语法准确性
- **李华**：外企职员，日常需要写英文邮件，希望学习更地道的商务表达
- **王芳**：雅思备考中，目标写作 7 分，需要丰富词汇和句型

---

## 3. MVP 功能清单

### 3.1 功能架构图

```
DiaryEnglish
├── 用户模块
│   ├── 用户注册/登录
│   └── 用户英语水平设置
├── 日记模块
│   ├── 日记列表
│   ├── 写日记
│   └── 删除日记
└── AI 辅助模块
    ├── 语法检查
    ├── 词汇替换建议
    └── 搭配建议
```

### 3.2 功能详细说明

#### 功能 1：用户注册/登录

**功能描述**：用户可以通过邮箱注册账号并登录

**需求描述**：
- 支持邮箱注册，验证邮箱有效性
- 支持邮箱密码登录
- 支持记住登录状态（可选）
- 使用 NextAuth.js 实现认证

**用户流程**：
1. 用户进入首页，点击"登录"按钮
2. 输入邮箱和密码，点击"登录"
3. 若未注册，点击"注册"链接
4. 输入邮箱和密码完成注册
5. 登录后跳转到日记列表页面

**页面原型**：
- 登录页面：邮箱输入框、密码输入框、登录按钮、注册链接
- 注册页面：邮箱输入框、密码输入框、确认密码输入框、注册按钮

---

#### 功能 2：用户英语水平设置

**功能描述**：用户可以设置自己的英语水平，让 AI 提供适配的建议

**需求描述**：
- 提供 3 个等级选项：初级、中级、高级
- 用户可以随时修改水平设置
- 水平设置影响 AI 建议的难度

**等级说明**：
| 等级 | 描述 | 建议特点 |
| :--- | :--- | :--- |
| 初级 | 词汇量 1000-3000 | 基础词汇，简单句型 |
| 中级 | 词汇量 3000-6000 | 常用词汇，复合句型 |
| 高级 | 词汇量 &gt; 6000 | 高级词汇，地道表达 |

---

#### 功能 3：写日记

**功能描述**：用户创建新的英文日记

**需求描述**：
- 提供日期选择（默认为当天）
- 提供标题输入框
- 提供正文输入区域（纯文本 textarea，支持换行）
- 字数统计显示
- 保存按钮（自动触发 AI 检查）

**用户流程**：
1. 用户点击"写日记"按钮
2. 进入写日记页面
3. 输入日期（可选）、标题、正文
4. 点击"保存"按钮
5. 系统保存日记并显示 AI 检查结果

**页面原型**：
- 日期选择器
- 标题输入框（placeholder："今天的标题..."）
- 正文纯文本域（placeholder："Start writing your diary in English..."）
- 字数统计（实时显示）
- 保存按钮

---

#### 功能 4：AI 语法检查

**功能描述**：AI 自动检测日记中的语法错误并提供修正建议

**需求描述**：
- 自动检测常见语法错误（时态、主谓一致、冠词等）
- 在原文中标注错误位置
- 提供修正建议和解释
- 支持一键应用修正
- AI 分析结果需结构化返回

**错误类型**：
| 错误类型 | 示例 | 修正建议 |
| :--- | :--- | :--- |
| 时态错误 | I go to park yesterday | I went to the park yesterday |
| 主谓不一致 | He play basketball | He plays basketball |
| 冠词错误 | I eat apple | I eat an apple |
| 介词错误 | I am good at math | I am good at math ✓ |

**AI 返回数据格式**：
```json
{
  "grammarErrors": [
    {
      "id": "1",
      "type": "tense",
      "originalText": "I go to park yesterday",
      "startIndex": 0,
      "endIndex": 21,
      "suggestion": "I went to the park yesterday",
      "explanation": "时态错误，描述过去的事情应该使用一般过去时"
    }
  ]
}
```

---

#### 功能 5：AI 词汇替换建议

**功能描述**：AI 根据用户水平提供词汇替换建议

**需求描述**：
- 识别可优化的词汇
- 提供多个替换选项（按难度分级）
- 显示词汇释义和例句
- 支持一键替换
- AI 分析结果需结构化返回

**建议展示**：
- 原文词汇高亮显示
- 悬浮显示替换选项列表
- 每个选项标注难度等级

**AI 返回数据格式**：
```json
{
  "vocabularySuggestions": [
    {
      "id": "1",
      "originalWord": "good",
      "startIndex": 5,
      "endIndex": 9,
      "suggestions": [
        {
          "word": "excellent",
          "level": "intermediate",
          "definition": "优秀的，卓越的",
          "example": "She did an excellent job on the project."
        },
        {
          "word": "outstanding",
          "level": "advanced",
          "definition": "杰出的，出色的",
          "example": "His performance was truly outstanding."
        }
      ]
    }
  ]
}
```

---

#### 功能 6：AI 搭配建议

**功能描述**：AI 检测不地道的搭配并提供优化建议

**需求描述**：
- 识别不自然的词组搭配
- 提供地道搭配建议
- 解释搭配用法
- 支持一键应用
- AI 分析结果需结构化返回

**搭配类型**：
- 动词+名词搭配
- 形容词+名词搭配
- 副词+形容词搭配

**AI 返回数据格式**：
```json
{
  "collocationSuggestions": [
    {
      "id": "1",
      "originalText": "very happy",
      "startIndex": 10,
      "endIndex": 20,
      "suggestion": "extremely happy",
      "explanation": "使用 extremely 比 very 更能表达程度的强烈",
      "example": "I am extremely happy to hear the good news."
    }
  ]
}
```

---

#### 功能 7：日记列表

**功能描述**：展示用户所有日记列表

**需求描述**：
- 按日期倒序排列
- 显示日记标题、日期、字数
- 支持点击查看详情
- 显示是否已完成 AI 检查

**页面原型**：
- 日记卡片列表
- 卡片包含：日期、标题、预览内容、字数
- 分页或滚动加载

---

#### 功能 8：日记详情

**功能描述**：查看单篇日记的完整内容和 AI 建议

**需求描述**：
- 显示日记完整内容
- 显示 AI 检查结果（语法错误、词汇建议、搭配建议）
- 提供删除按钮

---

#### 功能 9：删除日记

**功能描述**：删除指定日记

**需求描述**：
- 弹出确认删除对话框
- 删除后从列表中移除
- 同时删除关联的 AI 分析结果

---

---

## 4. AI 分析结果统一数据格式

为了方便前端展示，AI 分析结果采用统一的 JSON 格式返回：

```json
{
  "diaryId": "123456",
  "grammarErrors": [
    {
      "id": "1",
      "type": "tense",
      "typeName": "时态错误",
      "originalText": "I go to park yesterday",
      "startIndex": 0,
      "endIndex": 21,
      "suggestion": "I went to the park yesterday",
      "explanation": "描述过去的事情应该使用一般过去时"
    },
    {
      "id": "2",
      "type": "article",
      "typeName": "冠词错误",
      "originalText": "park",
      "startIndex": 8,
      "endIndex": 12,
      "suggestion": "the park",
      "explanation": "表示特定地点需要加定冠词 the"
    }
  ],
  "vocabularySuggestions": [
    {
      "id": "1",
      "originalWord": "good",
      "startIndex": 35,
      "endIndex": 39,
      "suggestions": [
        {
          "word": "excellent",
          "level": "intermediate",
          "levelName": "中级",
          "definition": "优秀的，卓越的",
          "example": "She did an excellent job on the project."
        },
        {
          "word": "outstanding",
          "level": "advanced",
          "levelName": "高级",
          "definition": "杰出的，出色的",
          "example": "His performance was truly outstanding."
        }
      ]
    }
  ],
  "collocationSuggestions": [
    {
      "id": "1",
      "originalText": "very happy",
      "startIndex": 50,
      "endIndex": 60,
      "suggestion": "extremely happy",
      "explanation": "使用 extremely 比 very 更能表达程度的强烈",
      "example": "I am extremely happy to hear the good news."
    }
  ],
  "overallScore": 85,
  "strengths": [
    "句子结构清晰",
    "时态整体使用正确"
  ],
  "improvements": [
    "注意冠词的使用",
    "可以尝试使用更多高级词汇"
  ]
}
```

### 字段说明

| 字段 | 类型 | 描述 |
| :--- | :--- | :--- |
| diaryId | string | 日记 ID |
| grammarErrors | array | 语法错误列表 |
| grammarErrors[].id | string | 错误唯一标识 |
| grammarErrors[].type | string | 错误类型代码 |
| grammarErrors[].typeName | string | 错误类型名称（用于显示） |
| grammarErrors[].originalText | string | 原文错误片段 |
| grammarErrors[].startIndex | number | 错误片段起始索引 |
| grammarErrors[].endIndex | number | 错误片段结束索引 |
| grammarErrors[].suggestion | string | 修正建议 |
| grammarErrors[].explanation | string | 错误解释 |
| vocabularySuggestions | array | 词汇建议列表 |
| vocabularySuggestions[].id | string | 建议唯一标识 |
| vocabularySuggestions[].originalWord | string | 原文词汇 |
| vocabularySuggestions[].startIndex | number | 词汇起始索引 |
| vocabularySuggestions[].endIndex | number | 词汇结束索引 |
| vocabularySuggestions[].suggestions | array | 替换建议列表 |
| vocabularySuggestions[].suggestions[].word | string | 替换词汇 |
| vocabularySuggestions[].suggestions[].level | string | 难度等级代码 |
| vocabularySuggestions[].suggestions[].levelName | string | 难度等级名称（用于显示） |
| vocabularySuggestions[].suggestions[].definition | string | 词汇释义 |
| vocabularySuggestions[].suggestions[].example | string | 例句 |
| collocationSuggestions | array | 搭配建议列表 |
| collocationSuggestions[].id | string | 建议唯一标识 |
| collocationSuggestions[].originalText | string | 原文搭配片段 |
| collocationSuggestions[].startIndex | number | 片段起始索引 |
| collocationSuggestions[].endIndex | number | 片段结束索引 |
| collocationSuggestions[].suggestion | string | 建议搭配 |
| collocationSuggestions[].explanation | string | 解释 |
| collocationSuggestions[].example | string | 例句 |
| overallScore | number | 整体评分（0-100） |
| strengths | array | 优点列表 |
| improvements | array | 改进建议列表 |

---

## 5. AI Prompt 设计

### 5.1 整体分析 Prompt

```
你是一位专业的英语老师，擅长帮助学生提高英语写作能力。请分析以下英文日记内容，提供语法检查、词汇替换建议和搭配优化建议。

用户英语水平：{userLevel}（初级/中级/高级）

请按照以下格式输出 JSON：
{
  "grammarErrors": [...],
  "vocabularySuggestions": [...],
  "collocationSuggestions": [...],
  "overallScore": 数字(0-100),
  "strengths": ["优点1", "优点2"],
  "improvements": ["改进点1", "改进点2"]
}

输出格式要求：
1. grammarErrors 中的每个错误需要包含：id, type, typeName, originalText, startIndex, endIndex, suggestion, explanation
2. vocabularySuggestions 中的每个建议需要包含：id, originalWord, startIndex, endIndex, suggestions（包含 word, level, levelName, definition, example）
3. collocationSuggestions 中的每个建议需要包含：id, originalText, startIndex, endIndex, suggestion, explanation, example
4. startIndex 和 endIndex 是在原始文本中的字符索引位置
5. vocabularySuggestions 的 level 只能是：beginner（初级）、intermediate（中级）、advanced（高级）
6. vocabularySuggestions 的 levelName 只能是：初级、中级、高级
7. grammarErrors 的 typeName 只能是：时态错误、主谓不一致、冠词错误、介词错误、拼写错误、名词单复数、动词形式错误、其他
8. 词汇建议应根据用户水平提供合适难度的替换词
9. 输出必须是有效的 JSON 格式，不要包含其他内容

日记内容：
{diaryContent}
```

### 5.2 语法检查子 Prompt

```
请检查以下英文文本中的语法错误，包括但不限于：时态错误、主谓不一致、冠词错误、介词错误、拼写错误、名词单复数错误、动词形式错误。

对于每个错误，请提供：
- 错误类型
- 原文错误片段
- 修正建议
- 错误解释

用户英语水平：{userLevel}

文本内容：
{text}
```

### 5.3 词汇替换建议子 Prompt

```
请分析以下英文文本，识别可以优化的词汇，并提供替换建议。

要求：
1. 只建议替换确实可以提升表达的词汇，不要过度建议
2. 根据用户水平提供不同难度的替换选项
3. 每个替换词需要提供：词汇、难度等级（初级/中级/高级）、释义、例句

用户英语水平：{userLevel}

文本内容：
{text}
```

### 5.4 搭配建议子 Prompt

```
请分析以下英文文本中的词组搭配，识别不地道或可以优化的搭配，并提供更地道的搭配建议。

要求：
1. 只建议修改不自然或不符合英语习惯的搭配
2. 每个建议需要提供：原搭配、建议搭配、解释、例句

用户英语水平：{userLevel}

文本内容：
{text}
```

---

## 6. 数据库 Schema 设计

### 6.1 用户表 (User)

| 字段名 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY | 用户唯一标识 |
| email | String | UNIQUE, NOT NULL | 用户邮箱 |
| hashedPassword | String | NOT NULL | 加密后的密码 |
| displayName | String | | 用户昵称 |
| englishLevel | String | NOT NULL, DEFAULT 'beginner' | 英语水平：beginner/intermediate/advanced |
| createdAt | DateTime | NOT NULL, DEFAULT NOW() | 创建时间 |
| updatedAt | DateTime | NOT NULL, DEFAULT NOW() | 更新时间 |

### 6.2 日记表 (Diary)

| 字段名 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY | 日记唯一标识 |
| userId | UUID | FOREIGN KEY REFERENCES User(id) | 用户 ID |
| title | String | NOT NULL | 日记标题 |
| content | Text | NOT NULL | 日记正文 |
| date | Date | NOT NULL | 日记日期 |
| wordCount | Integer | NOT NULL | 字数统计 |
| aiAnalyzed | Boolean | NOT NULL, DEFAULT false | 是否已完成 AI 分析 |
| createdAt | DateTime | NOT NULL, DEFAULT NOW() | 创建时间 |
| updatedAt | DateTime | NOT NULL, DEFAULT NOW() | 更新时间 |

### 6.3 AI 分析结果表 (AiAnalysis)

| 字段名 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| id | UUID | PRIMARY KEY | 分析结果唯一标识 |
| diaryId | UUID | FOREIGN KEY REFERENCES Diary(id), UNIQUE | 日记 ID |
| grammarErrors | Json | NOT NULL | 语法错误列表（JSON 格式） |
| vocabularySuggestions | Json | NOT NULL | 词汇建议列表（JSON 格式） |
| collocationSuggestions | Json | NOT NULL | 搭配建议列表（JSON 格式） |
| overallScore | Integer | NOT NULL | 整体评分（0-100） |
| strengths | Json | NOT NULL | 优点列表（JSON 数组） |
| improvements | Json | NOT NULL | 改进建议列表（JSON 数组） |
| createdAt | DateTime | NOT NULL, DEFAULT NOW() | 创建时间 |
| updatedAt | DateTime | NOT NULL, DEFAULT NOW() | 更新时间 |

### 6.4 Prisma Schema 代码

```prisma
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  hashedPassword  String
  displayName     String?
  englishLevel    String    @default("beginner")
  diaries         Diary[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model Diary {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  title       String
  content     String
  date        DateTime
  wordCount   Int
  aiAnalyzed  Boolean     @default(false)
  aiAnalysis  AiAnalysis?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model AiAnalysis {
  id                      String    @id @default(cuid())
  diaryId                 String    @unique
  diary                   Diary     @relation(fields: [diaryId], references: [id], onDelete: Cascade)
  grammarErrors           Json
  vocabularySuggestions   Json
  collocationSuggestions  Json
  overallScore            Int
  strengths               Json
  improvements            Json
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
}
```

---

## 7. 非功能需求

### 7.1 性能需求

| 指标 | 要求 |
| :--- | :--- |
| 页面加载时间 | &lt; 2 秒 |
| AI 检查响应时间 | &lt; 5 秒 |
| 支持并发用户数 | 至少 1000 人同时在线 |

### 7.2 可用性需求

| 指标 | 要求 |
| :--- | :--- |
| 用户完成注册流程 | &lt; 1 分钟 |
| 用户完成第一篇日记 | &lt; 3 分钟 |
| 页面无错误率 | &gt; 99.9% |

### 7.3 安全性需求

| 项目 | 要求 |
| :--- | :--- |
| 用户数据加密 | AES-256 加密存储 |
| 密码存储 | BCrypt 哈希存储 |
| 数据传输 | HTTPS 协议 |
| 日志审计 | 记录关键操作日志 |
| API 接口 | JWT 认证 |

### 7.4 兼容性需求

| 平台 | 要求 |
| :--- | :--- |
| 浏览器 | Chrome 90+, Safari 14+, Firefox 88+ |
| 移动端 | 支持响应式布局 |
| 屏幕尺寸 | 支持 320px - 1920px 宽度 |

---

## 8. 后续迭代 Backlog

### 优先级 P0（高优先级）

| 功能 | 描述 | 迭代目标 |
| :--- | :--- | :--- |
| 词汇本 | 用户可以收藏生词，查看释义和例句 | 帮助用户积累词汇 |
| 学习目标设定 | 用户设定每日/每周写作目标 | 提升用户粘性 |
| 每日提醒 | 推送写作提醒通知 | 培养写作习惯 |
| 学习报告 | 生成周/月学习报告 | 可视化学习成果 |

### 优先级 P1（中优先级）

| 功能 | 描述 | 迭代目标 |
| :--- | :--- | :--- |
| 编辑日记 | 修改已有的日记内容 | 完善日记管理功能 |
| 语法知识库 | 整理常见语法知识点 | 提供系统化学习资源 |
| 写作模板 | 提供日记写作模板 | 帮助初学者入门 |
| 数据导出 | 支持导出日记为 PDF/Word | 满足用户存档需求 |
| 深色模式 | 提供深色主题切换 | 提升夜间使用体验 |
| 学习天数统计 | 展示连续学习天数和总天数 | 激励用户坚持 |

### 优先级 P2（低优先级）

| 功能 | 描述 | 迭代目标 |
| :--- | :--- | :--- |
| 用户社区 | 查看其他用户的公开日记 | 增加互动性 |
| 日记分享 | 分享日记到社交平台 | 增加产品传播 |
| 学习小组 | 创建/加入学习小组 | 增强用户归属感 |
| 导师点评 | 付费获得专业导师点评 | 提供增值服务 |

---

## 9. 数据指标

### 核心指标（KPI）

| 指标 | 定义 | 目标值（3个月） |
| :--- | :--- | :--- |
| DAU | 每日活跃用户数 | 1000+ |
| 留存率 | 7日留存率 | &gt; 40% |
| 日记完成率 | 注册用户完成至少一篇日记 | &gt; 60% |
| 日均日记数 | 平均每个活跃用户每日写日记数 | &gt; 1.2 |

### 辅助指标

| 指标 | 定义 |
| :--- | :--- |
| AI 建议采纳率 | 用户采纳 AI 建议的比例 |
| 用户平均写作时长 | 用户每次写日记的平均时长 |
| 错误修正率 | 用户修正 AI 检测到的错误比例 |

---

## 10. 项目计划

### 时间规划

| 阶段 | 时间 | 目标 |
| :--- | :--- | :--- |
| MVP 开发 | 第 1-4 周 | 完成核心功能开发 |
| 内测 | 第 5 周 | 内部测试，修复 Bug |
| 公测 | 第 6 周 | 开放公测，收集反馈 |
| 正式上线 | 第 7 周 | 正式发布 |
| 迭代 1 | 第 8-10 周 | 上线词汇本、学习目标、每日提醒 |

### 资源需求

| 角色 | 人数 | 职责 |
| :--- | :--- | :--- |
| 产品经理 | 1 | 需求分析、PRD 撰写、项目管理 |
| UI/UX 设计师 | 1 | 界面设计、交互设计 |
| 前端开发 | 2 | 页面开发、交互实现 |
| 后端开发 | 2 | API 开发、数据库设计 |
| AI 算法工程师 | 1 | AI Prompt 设计、API 集成 |
| 测试工程师 | 1 | 功能测试、性能测试 |

---

## 11. 风险评估

| 风险 | 描述 | 影响程度 | 应对措施 |
| :--- | :--- | :--- | :--- |
| AI 准确性不足 | AI 检查结果不准确 | 高 | 持续优化 Prompt，收集用户反馈迭代 |
| 用户留存困难 | 用户难以坚持每日写作 | 高 | 设计激励机制，每日提醒 |
| 技术复杂度 | AI 模型调用成本高 | 中 | 合理控制 API 调用次数，缓存分析结果 |
| 数据安全 | 用户日记内容泄露 | 高 | 严格加密存储，遵守隐私法规 |

---

**文档版本**: v2.0  
**创建日期**: 2026-06-04  
**最后更新**: 2026-06-04  
**作者**: Product Manager
