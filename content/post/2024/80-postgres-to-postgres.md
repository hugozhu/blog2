---
title: 使用Apache Seatunnel跨境（低带宽丢包率高网络）同步postgres数据表
subtitle: sync postgres dataa cross-border with apache seatunnel
date: 2024-09-13
tags: ["postgres", "Seatunnel"]
---

将杭州的一张表每天定时增量同步一次到新加坡的同一张表，如何稳定可靠的解决问题呢？

首先这个场景不需要准时同步，所以并不考虑CDC方案，postgres内置的复制功能对网络要求比较高，容错性不够好。查阅资料后决定尝试下 Seatunnel: https://seatunnel.apache.org/ 过程比较简单，2个小时内完成了任务，中间遇到了字段格式的问题，花了点时间找解决方案， 但最终达到了预期的效果。

<!--more-->
# 解决方案

## 安装同步工具
```bash

#安装JDK
export JAVA_HOME=~/Projects/jdk-17.0.12.jdk/Contents/Home
export M2_HOME=~/Projects/apache-maven-3.9.8 
export PATH="${M2_HOME}/bin:${JAVA_HOME}/bin:${PATH}:"

#安装seatunnel
export version="2.3.7"
wget "https://archive.apache.org/dist/seatunnel/${version}/apache-seatunnel-${version}-bin.tar.gz"
tar -xzvf "apache-seatunnel-${version}-bin.tar.gz"

#安装插件
sh bin/install-plugin.sh

#安装pgsql jdbc driver
cd plugin 
wget https://jdbc.postgresql.org/download/postgresql-42.2.29.jre7.jar

```

## 同步任务配置
cms_contents.job
```
env {
  parallelism = 1
  job.mode = "BATCH"
}

source{
    Jdbc {
        url = "jdbc:postgresql://<pg_host>:5432/postgres?loggerLevel=OFF"
        driver = "org.postgresql.Driver"
        user = "<pg_user>"
        password = "<pg_password>"
        query = "select * from public.cms_contents where updated_at >= NOW() - INTERVAL '48 hours'"
    }
}

transform {
    # please go to https://seatunnel.apache.org/docs/transform-v2/sql

}

sink {
    Jdbc {
       # if you would use json or jsonb type insert please add jdbc url  
        url = "jdbc:postgresql://<pg_host>:5432/postgres?loggerLevel=OFF&stringtype=unspecified"
        driver = "org.postgresql.Driver"
        user = "<pg_user>"
        password = "<pg_password>"
        database = "postgres"
        generate_sink_sql = true
        primary_keys = ["id"]
        support_upsert_by_query_primary_key_exist = true
        table = "public.cms_contents"
     }
}
```

### 比较关键的两处配置：
1. **stringtype=unspecified**

>If stringtype is set to unspecified , parameters will be sent to the server as untyped values, and the server will attempt to infer an appropriate type.

不加这个配置，uuid，json字段都会报错
```
java.sql.BatchUpdateException: Batch entry 0 INSERT INTO ... was aborted: ERROR: column "main_images" is of type json but expression is of type character varying
  Hint: You will need to rewrite or cast the expression.
```
2. **support_upsert_by_query_primary_key_exist**

避免插入重复记录报错，但要注意结合**primary_keys**来正确使用。

## 本地执行同步任务
```
./bin/seatunnel.sh --config cms_contents.job -m local
```

## 用Airflow来每天调度一次
因为任务还比较轻，暂时不搞集群，定时同步可以用Airflow来实现
Dag如下：
1. 用python通过Jina模板生成Seatunnel的任务
2. 远程登录到部署了Seatunnel的worker机器上执行任务，并让Airflow收集执行的输出日志
3. 报警用Airflow上的钉钉来实现