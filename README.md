# babel-plugin-vimo

> 插件用于 Vimo **组件库** 及 **主题样式** 按需加载。

[![NPM version](https://img.shields.io/npm/v/babel-plugin-vimo.svg?style=flat)](https://npmjs.org/package/babel-plugin-vimo)
[![Build Status](https://img.shields.io/travis/ant-design/babel-plugin-vimo.svg?style=flat)](https://travis-ci.org/ant-design/babel-plugin-vimo)

---

## Where to add babel-plugin-vimo

* [babelrc](https://babeljs.io/docs/usage/babelrc/)
* [babel-loader](https://github.com/babel/babel-loader)

## Example

Babel 配置；

```json
{
  "plugins": [
    [
      "vimo",
      {
        "libraryName": "vimo",
        "libraryDirectory": "components",
        "style": "scss",
        "themes": [
          {
            "themeName": "vimo-theme-ios",
            "themeDirectory": "components",
            "symbol": "ios"
          },
          {
            "themeName": "vimo-theme-md",
            "themeDirectory": "components",
            "symbol": "md"
          }
        ]
      }
    ]
  ]
}
```

业务代码：

```js
import { Button } from "vimo";
```

转化为：

```js
"use strict";

require("vimo/components/button/button.scss");
require("vimo-theme-md/components/button.md.scss");
require("vimo-theme-ios/components/button.ios.scss");

require("vimo/components/button");
```

因此在加载组件的时候能按需家在对应的**组件骨架**和**样式主题**:

```
组件骨架:
    vimo/components/button/index.js
    vimo/components/button/button.scss
样式主题:
    vimo-theme-md/components/button.md.scss
    vimo-theme-ios/components/button.ios.scss
```

## Usage

```bash
npm install babel-plugin-vimo --save-dev
```

Via `.babelrc` or babel-loader.

```js
{
  "plugins": [["vimo", options]]
}
```

### options

| Options Name                 |        desc        |             type | default |
| :--------------------------- | :----------------: | ---------------: | ------: |
| libraryName                  |     组件库名称     |         `string` |  `vimo` |
| libraryDirectory             |      组件路径      |         `string` |   `lib` |
| style                        |        样式        | `string|boolean` | `false` |
| fileName                     |     子路径文件     |         `string` |    null |
| customName                   |   自定义引用路径   |       `function` |    null |
| themes                       |        主题        |   `object|array` |    null |
| themes.themeName             |      主题名称      |         `string` |    null |
| themes.themeDirectory        |      主题路径      |         `string` |    null |
| themes.symbol                |      主题符号      |         `string` |    null |
| themes.themeExt              |    主题样式后缀    |         `string` |   `css` |

**路径示例:**

`${libraryName}/${libraryDirectory}/${transformedMethodName}/${fileName}`

### style

* `["vimo", { "libraryName": "vimo" }]`: import js modularly
* `["vimo", { "libraryName": "vimo", "style": true }]`: import js and css file
* `["vimo", { "libraryName": "vimo", "style": "scss" }]`: import js and scss file


### Reference

- [babel-plugin-import](https://github.com/ant-design/babel-plugin-import/)
