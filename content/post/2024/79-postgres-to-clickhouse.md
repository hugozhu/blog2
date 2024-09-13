---
title: 使用clickhouse来关联查询postgres数据库
subtitle: Use clickhouse to query postgres database
date: 2024-09-13
tags: ["postgres", "clickhouse"]
---

在现代数据分析领域，不同的数据库系统各有优点。PostgreSQL（Postgres）因其强大的事务处理和灵活的查询功能而备受欢迎，而ClickHouse则以其超高速的OLAP查询性能著称。虽然Postgres擅长处理关系型数据并提供强大的ACID支持，但在大规模分析查询场景中，ClickHouse显然更具优势。如果我们能在分析过程中将两者结合起来，就能同时利用Postgres的数据管理和ClickHouse的查询性能。

本文将介绍如何通过ClickHouse来关联查询Postgres数据库的数据，实现两种数据库的无缝对接。

<!--more-->

# 问题和解决方案

# 配置ClickHouse中的Postgres数据库表

假设我们在Postgres中有一个名为users的表，包含以下字段
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT,
  created_at TIMESTAMP
);
```
ClickHouse通过外部表引擎来查询Postgres数据。首先，需要在ClickHouse中创建一个与Postgres表相关联的表。以下是示例SQL语句：

```sql
CREATE TABLE postgres_users
ENGINE = PostgreSQL('host:port', 'database_name', 'schema_name.users', 'username', 'password');

```

接下来，我们可以将Postgres表与ClickHouse中的其他数据进行关联查询。假设我们在ClickHouse中有一个名为clickhouse_events的表，记录用户的行为数据：

```sql
CREATE TABLE clickhouse_events (
    user_id UInt32,
    event_name String,
    event_time DateTime
) ENGINE = MergeTree()
ORDER BY event_time;
```
我们希望通过用户ID将ClickHouse中的事件表与Postgres中的用户表进行关联查询，获取每个用户的行为事件和他们的个人信息。可以通过以下SQL语句来实现：

```sql
SELECT
    events.event_time,
    events.event_name,
    users.name,
    users.email
FROM clickhouse_events AS events
JOIN postgres_users AS users
ON events.user_id = users.id
WHERE events.event_time > now() - INTERVAL 7 DAY;
```

在这个查询中，我们将ClickHouse中的clickhouse_events表与Postgres中的postgres_users表通过user_id和id进行关联，从而获取每个事件对应的用户信息。由于ClickHouse的查询引擎优化得当，即使Postgres中的表数据量较大，查询也能在保持较高性能的情况下完成。


在clickhouse集群中：
```
DROP TABLE IF EXISTS <db>.s_<instance>_pg_fcm_messages_dist on cluster '<cluster>' sync;

CREATE TABLE IF NOT EXISTS <db>.s_<instance>pg_fcm_messages_dist on cluster '<cluster>'
(
    id Int64,
    created_at DateTime,
    updated_at DateTime,
    biz_id String,
    title String,
    schedule_time DateTime,
    badge Int64,
    status Int64,
    meta_data String,   -- JSON 数据可以作为 String 类型处理
    report_data String, -- JSON 数据可以作为 String 类型处理
    body String,
    target_url String,
    image_url String,
    sent Int16,
    sent_response String,
    topic String
) ENGINE = PostgreSQL('host:port', 'database_name', 'schema_name.users', 'username', 'password');

select * from <db>.s_<instance>pg_fcm_messages_dist
;
```

# 性能优化
尽管ClickHouse查询Postgres数据非常方便，但由于它涉及外部数据源，可能会受到网络延迟和Postgres查询效率的影响。为了进一步优化性能，可以考虑以下几种方法：

数据预加载：对于常用的Postgres数据，可以定期将Postgres表中的数据复制到ClickHouse中进行分析。这可以通过ClickHouse的Materialized View（物化视图）实现。

增加Postgres索引：确保Postgres表中的查询字段（如id字段）上有索引，以提高查询效率。

使用ClickHouse的分布式计算：在大规模查询场景中，ClickHouse的分布式架构可以显著提高查询速度。因此，如果你有多台ClickHouse服务器，可以考虑将查询分布到不同节点上进行处理。

# 总结
通过ClickHouse的PostgreSQL引擎，我们可以轻松地将Postgres数据库中的数据与ClickHouse中的表进行关联查询，实现跨数据库的数据分析。这样的结合方式充分利用了Postgres的事务处理优势和ClickHouse的高效查询性能，为复杂的业务场景提供了灵活且强大的数据分析能力。

在实际应用中，根据具体场景优化查询逻辑和数据同步策略，将有助于进一步提高查询效率和用户体验。如果你正在寻找一种方法来将OLTP和OLAP系统结合使用，不妨试试这种方案！