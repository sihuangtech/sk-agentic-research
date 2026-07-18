# 科研与实验协议

## 证据协议

每条证据必须包含稳定 id、来源、标题、URL、摘要和检索时间。Agent 只能引用当前快照中存在的 id。GitHub 和模型仓库可用于了解实现，不自动等同于支持科学结论的论文证据。

## 假设协议

一个假设必须明确：

- 问题和可检验陈述；
- 证伪条件；
- 自变量、因变量和基线；
- 预期结果与创新点；
- 支持它的证据 id；
- 新颖性、可行性、可证伪性和证据支持四维评分。

综合分达到门槛仍不够；可行性、可证伪性或证据支持任一低于 5 分都会被拒绝。

## 实验清单

`manifest.json` 在执行前冻结：

```json
{
  "objective": "候选方法是否稳定优于基线",
  "metric": {
    "name": "accuracy",
    "json_path": "metrics.accuracy",
    "direction": "maximize",
    "minimum_delta": 0.02
  },
  "baseline": {"name": "baseline", "entrypoint": "baseline.py"},
  "candidate": {"name": "candidate", "entrypoint": "candidate.py"},
  "train_seeds": [11, 23, 37],
  "validation_seeds": [101, 211, 307],
  "max_iterations": 2,
  "required_modules": []
}
```

候选迭代不得修改基线、指标、门槛或留出种子。
`required_modules` 在执行前检查；系统不会自动安装缺失依赖。

## 执行协议

每次 trial 使用独立目录，并记录：

- `results.json`；
- `stdout.log`、`stderr.log`；
- 退出码与耗时；
- 方案、阶段和种子；
- 超时、策略阻止、取消或结果解析错误。

Python 脚本通过环境变量接收参数。Notebook 通过官方 Papermill 参数单元接收 `seed` 和 `results_path`。

## 决策协议

最终门禁只查看 validation trials：

- `invalid`：成功率不足、基线/候选缺失或指标不是有限数；
- `inconclusive`：候选变异系数高于预设门槛；
- `accepted`：稳定性合格且方向归一化后的改进量达到 `minimum_delta`；
- `rejected`：实验有效，但改进量未达预设门槛。

其中最小改进量是工程/科学意义门槛，不等同于统计显著性。需要发表级结论时，应扩展验证器加入样本量估计、置信区间、显著性检验和多重比较修正。

## 写作协议

写作输入只有假设快照、证据快照和验证报告。模型返回结构化章节，系统自己生成 Markdown 与 LaTeX。引用 id 会再次过滤；非 `accepted` 结果会被程序强制在标题、摘要和结论中标记，不能仅依赖提示词自觉。
