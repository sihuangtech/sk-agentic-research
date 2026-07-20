# 获取 Semantic Scholar API Key 指南

## 为什么需要 API Key？

Semantic Scholar 对**匿名请求**有严格的速率限制（约 1 请求/秒，且在短时间内多次请求后会返回 `429 Too Many Requests` 错误）。

配置 API Key 后：

- 速率限制提升至 **1 请求/秒**（合作伙伴等级可更高）
- 不再频繁触发 429 限流
- 搜索结果更稳定可靠

> **注意**：即使不配置 API Key，Papermill 仍能正常运行 —— arXiv 作为备用检索源不受影响。但如果你希望获得更全面的文献覆盖，建议配置。

## 获取步骤

### 1. 访问 Semantic Scholar API 页面

打开浏览器，访问：

**<https://www.semanticscholar.org/product/api#api-key>**

### 2. 注册 / 登录账号

如果你还没有 Semantic Scholar 账号：

- 点击页面上的 **Sign In** 按钮
- 可以使用 Google、Apple 或邮箱注册

### 3. 申请 API Key

1. 登录后，访问 API Key 申请页面：**<https://www.semanticscholar.org/product/api#api-key-form>**
2. 填写申请表单，包含以下信息：
   - **Name**：你的姓名
   - **Email**：联系邮箱
   - **Organization**：你的机构/学校（填写真实信息即可）
   - **Use Case**：简要描述用途，例如 `Automated literature search for research hypothesis generation`
3. 提交后，Semantic Scholar 团队通常会在 **1-3 个工作日** 内通过邮件发送 API Key

> **提示**：Semantic Scholar 的 API Key 申请是免费的，面向学术研究用途。

### 4. 配置到 Papermill

收到 API Key 后，编辑项目根目录的 `.env` 文件：

```bash
# 取消注释并填写你的 API Key
SEMANTIC_SCHOLAR_API_KEY=你的API_Key
```

例如：

```bash
SEMANTIC_SCHOLAR_API_KEY=a1b2c3d4e5f6g7h8i9j0
```

### 5. 验证配置

重新启动 Papermill 后，检查日志中是否还有 `429 Client Error` 的警告信息。如果不再出现，说明 API Key 配置成功。

你也可以运行环境检查命令：

```bash
python -m backend.cli doctor
```

## 常见问题

### Q: 不配置 API Key 会怎样？

Papermill 会继续正常运行。Semantic Scholar 搜索可能偶尔失败（429 限流），但系统会自动降级到仅使用 arXiv 的结果。你会在日志中看到类似的警告：

```text
WARNING backend.research.literature - 检索来源 semantic_scholar 失败: 429 Client Error
```

这不会影响整体工作流的执行。

### Q: API Key 申请被拒绝了怎么办？

可以在 `config.yaml` 中将 `semantic_scholar` 从检索提供方列表中移除：

```yaml
search:
  providers:
    - arxiv
    # - semantic_scholar   # 注释掉即可
```

### Q: 还有其他提升限额的方式吗？

Semantic Scholar 提供 **Data Partners** 计划，限额更高。详情参见：
<https://www.semanticscholar.org/product/api#api-key-form>

## 参考链接

- Semantic Scholar API 文档：<https://api.semanticscholar.org/api-docs/>
- API Key 申请：<https://www.semanticscholar.org/product/api#api-key>
- 速率限制说明：<https://api.semanticscholar.org/api-docs/#tag/Rate-Limits>
