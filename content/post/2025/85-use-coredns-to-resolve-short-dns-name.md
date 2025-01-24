---
title: 用coredns做为主DNS解析内网的短域名
subtitle: Use Coredns to Resolve Short DNS Name
date: 2025-01-24
tags: ["coredns", "dns"]
---

在内网环境中，我们常常需要使用简单易记的短域名，而不是一些严格符合域名规范的全域名。通过CoreDNS，我们可以实现对短域名的自动解析，使内网运营更加高效和便捷。这篇文章将记录如何配置CoreDNS来支持这一功能。

<!--more-->

## 什么是CoreDNS？

CoreDNS是一个高可配置的软件DNS解析器，他支持多样化的插件，通过配置文件可以实现对各种DNS请求的自定义处理。运行软件较轻量，实现快速安装和配置，非常适合小型内网和小型服务器环境。

## 使用rewrite插件实现
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

## 原理
如果查询域名中包含至少两个字符.（ 合法）则不改写且不执行其他rewrite规则；如果只有1个字符. （不合法的域名），则加上hugozhu.site后缀。

其实这类似DHCP下发的search domain功能，因为某些路由器不支持DHCP 120功能，所以出此下策。