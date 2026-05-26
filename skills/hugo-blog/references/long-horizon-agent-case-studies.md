# Long-Horizon Agent Task Case Studies

Case study patterns for blog posts about Agent architecture, long-horizon tasks, and multi-agent systems. Use these when the article thesis involves challenges that only manifest over time, across roles, or across systems.

## Why Scope Matters

When writing about Agent architecture challenges, the case study must demonstrate the **specific failure mode** the article discusses. A single-turn approval workflow cannot demonstrate:
- Long-horizon context loss (needs T+1, T+7, T+14 timeline)
- Semantic drift across decomposition layers (needs company→dept→individual chain)
- Multi-role concurrent conflicts (needs simultaneous edits from different actors)
- Cross-system data inconsistency (needs multiple data sources with sync delays)

**Rule**: If the article is about X, the case study must be complex enough for X to actually happen.

## Template: Quarterly OKR Planning & Tracking

**Scenario**: Agent assists company-wide quarterly OKR lifecycle

**Parameters**:
- **Cycle**: 2-4 weeks (planning) + 12 weeks (execution tracking)
- **Stages**: Strategy input → Dept OKR drafting → Alignment → Review → Tracking → Mid-term adjustment → Retrospective
- **Roles**: CEO, VP, Dept Lead, Individual Contributor
- **Systems**: Docs, Sheets, Meetings, Project Management, Dashboards

**Four Challenge Dimensions**:

### 1. Long-Horizon Context Retention
- **Question**: Can Agent at T+14 correctly reference T+1 decisions?
- **Failure mode**: CEO constraint (「focus on retention, not growth」) pushed out of context window by T+7; Agent suggests growth-oriented KRs
- **Key metric**: Constraint recall rate drops from 100% → 42% at T+14 → 18% at T+21

### 2. Alignment Chain Semantic Drift
- **Question**: Does OKR decomposition preserve strategic intent across layers?
- **Failure mode**: Each layer adds 3-5% drift; after 3 layers, 「retention」 becomes 「user acquisition growth」
- **Drift dimensions**: metric_substitution, scope_narrowing, target_inflation, constraint_dropping, timeline_shift

### 3. Multi-Role Concurrent Collaboration
- **Question**: How does Agent handle simultaneous edits to the same OKR tree?
- **Failure mode**: VP adds cost constraint; lead adds 「advertising」 KR; Agent merges without detecting semantic conflict; VP discovers a week later
- **Root cause**: Conflict detection uses text similarity, not semantic understanding

### 4. Cross-System Data Consistency
- **Question**: Can Agent make correct judgments when data sources disagree?
- **Failure mode**: OKR system shows 75% progress (stale); project system shows 42% (current); Agent reports 「on track」
- **Consequence**: Missed early warning window

## Other Suitable Long-Horizon Scenarios

| Scenario | Cycle | Roles | Systems | Key Challenge |
|----------|-------|-------|---------|--------------|
| 年度预算编制 | 4-8 周 | CFO/VP/主管/财务 | 财务系统/表格/审批 | 跨部门约束冲突 |
| 产品发布计划 | 6-12 周 | PM/研发/设计/市场 | Jira/Figma/文档 | 依赖链断裂 |
| 组织架构调整 | 2-6 周 | HR/VP/主管/员工 | HR 系统/文档/沟通 | 信息一致性 |
| 季度业务复盘 | 1-2 周 | CEO/VP/主管 | 数据看板/文档/会议 | 数据溯源与归因 |

## Pitfalls

- **Don't use short transactional cases for long-horizon topics** — approval, leave request, meeting booking are single-turn and cannot demonstrate time-based failures
- **Don't use single-role cases for multi-agent topics** — if the article is about collaboration, the case must have multiple actors with conflicting goals
- **Don't use single-system cases for cross-system topics** — data consistency challenges require at least 2 systems with independent update cycles
- **Always show the timeline** — long-horizon cases need explicit T+1, T+7, T+14 markers to make the time dimension visible
- **Always show the root cause** — not just 「it failed」 but 「why it failed」 (e.g., context window limit, text-similarity-only conflict detection)
