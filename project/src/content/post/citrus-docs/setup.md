---
title: Citrus 安装与启动
description: 如何安装依赖并运行开发服务器。
publishDate: "2025-11-28"
updatedDate: "2025-11-28"
tags: [Citrus, Setup]
draft: false
seriesId: citrus-docs
orderInSeries: 2
---

## 安装

在项目子目录执行：

```powershell
Set-Location d:\personal_blog\project
npm install
npm run dev
```

如果你在根目录使用转发脚本：

```powershell
npm run dev
```

## 提示
- Windows 需确保 Node.js 与 npm 正常工作。
- 如遇构建错误，检查内容 frontmatter 是否符合 schema。