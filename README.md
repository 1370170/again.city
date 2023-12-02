这是 [again.city](http://again.city) 的源代码和帮助文档。

Reuniting lost couples, one at a time.

### 概念

<img src="https://github.com/1370170/again.city/assets/140490996/eaaf0476-e560-4d74-aa39-eb13f2118af3" width="300">

### 解释

```yaml
问: 谁会看到我的表白？
答: 你的表白对象，且仅当TA也向你表白时。

问: 如果TA无意向我表白，TA会看到我的表白吗？
答: 不会。

问: 如何查看谁在向我表白？
答: 请向你感兴趣的人表白。

问: 其他人能看到我的表白吗？
答: 不能，你的表白以TA的信息加密了，TA可以解密。

问: 开发者可以看到我的表白吗？
答: 理论上通过人名户籍数据可以试图暴力解密数据库。开发者保留查询某个用户的消息的权利。

问: 如何防止身份盗窃？
答: 无法防止。我们对请求频率和每个设备的身份做了限制。
```

### 编译使用

您可以使用从该代码编译的托管在 [again.city](http://again.city) 的 web 应用。

若您希望自行编译 Flutter 代码至 iOS / macOS / web 应用，您可以安装 [Flutter](http://flutter.dev) 和 [VS Code](https://code.visualstudio.com/)。若您希望搭建自己的后端，可以使用 [该代码](backend-aws-lambda/index.mjs) 搭建 AWS Lambda 增删查改函数，并将其连接到一个 DynamoDB 数据库与 API Gateway 互联网访问入口。

若您希望自行编译微信小程序，您需要安装 [微信小程序开发工具](https://developers.weixin.qq.com/ebook?action=get_post_info&docid=000e8842960070ab0086d162c5b80a)。

发布社交类的 iOS 应用和微信小程序涉及审查屏蔽敏感言论，故无法在此提供编译好的安装文件。


### 技术细节

```yaml
前端:
    设计: Material Design
    实现: Flutter框架
    部署: AWS S3服务
后端:
    实现: AWS API Gateway, AWS Lambda, AWS DynamoDB服务

# wechat-mini-program
设计: TDesign
前端: 微信小程序框架
后端: 微信云开发服务
```
