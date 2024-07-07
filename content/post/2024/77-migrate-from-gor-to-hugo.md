---
title: Blog迁移到hugo模版引擎
subtitle: Using Hugo for my blog, migrated from gor
date: 2024-07-07
tags: ["blog", "hugo", "github"]
---

因为Blog的模版太老， 不支持手机； 花一点时间快速升级下，选用了hugo这个静态网站模板引擎。

<!--more-->

老的blog在： https://github.com/hugozhu/blog
新的blog在： https://github.com/hugozhu/blog2

实际过程比较顺利，除了目录的支持花了点时间，其他都能兼容原Blog的做法，鲁棒性不错。

```python
import logging

print("Hello")
```