---
title: 用coredns做为主DNS解析内网的短域名
subtitle: Use Coredns to Resolve Short DNS Name
date: 2025-01-24
tags: ["coredns", "dns"]
ingested: 2026-05-04
sha256: 7af16c26ceb00535818d4b86501f355f4a8ddbf3d928b0398a7629c3baf10bae
---
在内网环境中，我们常常需要使用简单易记的短域名，而不是一些严格符合域名规范的全域名。通过CoreDNS，我们可以实现对短域名的自动解析，使内网运营更加高效和便捷。这篇文章将记录如何配置CoreDNS来支持这一功能。

<!--more-->

## 什么是CoreDNS？

CoreDNS是一个高可配置的软件DNS解析器，他支持多样化的插件，通过配置文件可以实现对各种DNS请求的自定义处理。运行软件较轻量，实现快速安装和配置，非常适合小型内网和小型服务器环境。

## 实现方法

coredns的 [rewrite插件](https://coredns.io/plugins/rewrite/)能对dns查询的输入和输出做改写，为实现短域名能自动加上域名后缀，我们可以对查询的域名用正则表达式来判断：
如果查询域名中包含至少两个字符“.”，则判断为合法的域名，不改写且不执行其他rewrite规则；如果只有1个字符“.”，则判断为短域名，这时候加上hugozhu.site后缀。

具体的配置如下：

```bash
. {
    log . {combined} {
        class denial error
    }

    rewrite stop {
        name regex ^(.*)\.(.*)\.$ {1}.{2}
    }
    rewrite name regex ^(.*)\.$ {1}.hugozhu.site

    # 根据域名转发不同的上游服务器
    forward .  8.8.8.8 8.8.4.4 {
        policy sequential
        except hugozhu.site
    }

    forward . 127.0.0.1:10053 {
        policy sequential
    }
}
```

其实这类似DHCP下发的search domain功能，因为某些路由器不支持DHCP 120功能，所以出此下策。