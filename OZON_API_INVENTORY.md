# OZON Seller API Inventory

基于以下两类来源整理：

1. 官方 Seller API 文档入口：`https://docs.ozon.ru/api/seller/zh/?__rr=1#section/Seller-API`
2. 当前账号实测接口 `POST /v1/roles` 返回的已授权方法列表

说明：

- 本清单优先反映“当前这组 `Admin` 密钥实际可调用的接口”。
- 它不一定等于 OZON 全量公开接口宇宙，但对当前项目开发更有参考价值。
- 目前实测到当前密钥到期时间：`2026-11-12T12:26:18.655962Z`

## 已实测成功的只读接口

- `POST /v1/roles`
- `POST /v1/seller/info`
- `POST /v1/description-category/tree`
- `POST /v3/product/list`
- `POST /v1/notification/list`

## 店铺主体信息

来自 `POST /v1/seller/info`：

- 店铺主体名：`PEAIOT`
- 公司名：`Shanghai Yibo Technology Co., Ltd`
- 税号：`91310120MA1HXL343L`
- 币种：`CNY`
- 国家：`CHN`

注意：

- 当前实测接口中，未直接拿到“店铺前台域名 / 店铺主页 URL”字段。
- 当前 Seller API 更偏业务接口，而不是店铺装修/店铺前台链接接口。

## 接口总量

- 当前 `Admin` 角色可访问唯一接口数：`446`

## 模块分组统计

按路径前两段自动聚合后的结果：

| 模块前缀 | 数量 |
|---|---:|
| `/v1/fbp` | 46 |
| `/v1/product` | 39 |
| `/v1/warehouse` | 34 |
| `/v1/posting` | 24 |
| `/v1/carriage` | 23 |
| `/v2/posting` | 23 |
| `/v1/seller-actions` | 20 |
| `/v1/finance` | 13 |
| `/v1/supply-order` | 13 |
| `/v1/actions` | 12 |
| `/v1/report` | 12 |
| `/v1/pricing-strategy` | 12 |
| `/v1/return` | 10 |
| `/v1/question` | 8 |
| `/v1/analytics` | 8 |
| `/v1/review` | 7 |
| `/v1/notification` | 7 |
| `/v2/returns` | 7 |
| `/v1/polygon` | 6 |
| `/v3/posting` | 6 |
| `/v1/returns` | 6 |
| `/v1/description-category` | 5 |
| `/v1/cargoes` | 5 |
| `/v2/review` | 5 |

## 核心能力清单

### 1. 店铺与权限

代表接口：

- `/v1/roles`
- `/v1/seller/info`
- `/v1/seller/ozon-logistics/info`

可做：

- API 健康检查
- 密钥到期提醒
- 店铺主体信息同步
- 物流能力识别

### 2. 商品中心

代表接口：

- `/v3/product/import`
- `/v1/product/import/prices`
- `/v2/products/stocks`
- `/v3/product/list`
- `/v3/product/info/list`
- `/v4/product/info/attributes`
- `/v1/product/attributes/update`
- `/v1/product/pictures/import`
- `/v2/product/pictures/info`
- `/v1/product/archive`
- `/v1/product/unarchive`

可做：

- 商品创建与更新
- 图片上传与状态跟踪
- 属性补全和类目模板映射
- 批量调价
- 批量同步库存
- 商品归档/恢复
- 商品状态与可见性管理

### 3. 类目与属性

代表接口：

- `/v1/description-category/tree`
- `/v1/description-category/attribute`
- `/v1/description-category/attribute/values`
- `/v1/description-category/attribute/values/search`
- `/v1/description-category/tips`

可做：

- 构建类目树
- 获取类目属性模板
- 获取属性候选值
- 做自动类目推荐和属性填写助手

### 4. 订单与履约

代表接口：

- `/v3/posting/fbs/list`
- `/v4/posting/fbs/unfulfilled/list`
- `/v4/posting/fbs/ship`
- `/v2/fbs/posting/tracking-number/set`
- `/v2/fbs/posting/delivering`
- `/v2/fbs/posting/delivered`
- `/v1/posting/fbp/list`
- `/v2/posting/fbo/list`
- `/v3/posting/fbo/list`

可做：

- FBS/FBO/FBP 订单拉取
- 待打包单管理
- 发货、拆包、打单
- 运单号回传
- 履约状态流转
- 异常单与取消原因处理

### 5. 仓库与配送方式

代表接口：

- `/v2/warehouse/list`
- `/v1/warehouse/ozon/list`
- `/v1/warehouse/fbs/create`
- `/v1/warehouse/fbs/update`
- `/v1/warehouse/fbo/list`
- `/v1/warehouse/fbo/seller/list`
- `/v2/delivery-method/list`

可做：

- 仓库列表同步
- FBS/rFBS 仓配置
- 仓库启停与归档
- 配送方式配置
- 仓库与 ERP 仓位映射

### 6. 退货与售后

代表接口：

- `/v2/returns/rfbs/list`
- `/v2/returns/rfbs/get`
- `/v2/returns/rfbs/reject`
- `/v2/returns/rfbs/receive-return`
- `/v2/returns/rfbs/return-money`
- `/v1/returns/company/fbs/info`

可做：

- 售后单列表
- 退货处理
- 退款/拒绝/补偿
- 退货状态同步
- 售后工单面板

### 7. 财务与报表

代表接口：

- `/v3/finance/transaction/list`
- `/v3/finance/transaction/totals`
- `/v1/finance/balance`
- `/v1/finance/cash-flow-statement/list`
- `/v1/finance/accrual/postings`
- `/v1/report/list`
- `/v1/report/info`
- `/v1/report/products/create`
- `/v1/report/postings/create`
- `/v1/report/warehouse/stock`

可做：

- 交易流水
- 余额与现金流
- 应计/应收/补偿/扣款明细
- 订单利润分析
- 报表任务创建与下载
- 财务对账

### 8. 分析与运营数据

代表接口：

- `/v1/analytics/data`
- `/v1/analytics/stocks`
- `/v1/analytics/product-queries`
- `/v1/analytics/product-queries/details`
- `/v1/analytics/turnover/stocks`
- `/v2/analytics/stock_on_warehouses`
- `/v1/search-queries/top`
- `/v1/search-queries/text`

可做：

- 销售与库存分析
- 搜索词分析
- 商品搜索表现分析
- 周转率分析
- 补货建议
- 选品信号采集

### 9. 价格策略与促销

代表接口：

- `/v1/pricing-strategy/create`
- `/v1/pricing-strategy/list`
- `/v1/pricing-strategy/info`
- `/v1/pricing-strategy/update`
- `/v1/pricing-strategy/competitors/list`
- `/v1/actions`
- `/v1/actions/products`
- `/v1/actions/candidates`
- `/v1/actions/discounts-task/list`
- `/v1/seller-actions/list`

可做：

- 自动调价策略
- 竞品价格跟踪
- 活动列表和候选商品
- 折扣、代金券、分层优惠管理
- 活动商品自动加减

### 10. 买家互动

代表接口：

- `/v1/question/list`
- `/v1/question/info`
- `/v1/question/answer/create`
- `/v1/review/list`
- `/v1/review/info`
- `/v1/review/comment/create`
- `/v3/chat/list`
- `/v3/chat/history`
- `/v1/chat/send/message`

可做：

- 买家提问处理
- 评论回复
- 客服聊天整合
- 差评/问题预警

### 11. 通知与回调

代表接口：

- `/v1/notification/list`
- `/v1/notification/set`
- `/v1/notification/update`
- `/v1/notification/enable`
- `/v1/notification/check`
- `/v1/notification/delete`

可做：

- 配置平台通知 URL
- 做事件回调管理
- 检查通知配置是否生效

注意：

- 当前 `notification/list` 实测返回 `{ "urls": [] }`
- 说明当前账号还没有配置通知回调地址

## 面向 ERP 的功能映射

### 最小可行版本

- 店铺接入与密钥管理
- 商品上传
- 价格库存同步
- 订单下载与发货
- 财务流水同步
- 退货列表

### 中期增强

- 多仓管理
- 自动补货建议
- 评论/提问客服工作台
- 活动与促销管理
- 类目属性模板化发布

### 高阶智能化

- 智能选品
- 智能定价
- 自动类目匹配
- AI 生成俄语标题/卖点/属性草稿
- 异常预警和运营分析看板

## 当前结论

- 对 OZON 做 ERP 是完全可行的
- 当前密钥能访问的接口范围已经很广，足够支撑：
  - 商品
  - 库存
  - 价格
  - 订单
  - 仓库
  - 财务
  - 售后
  - 评价问答
  - 运营分析
  - 搜索词
  - 活动促销
  - 通知回调
- 当前还没有直接确认到“店铺前台域名/店铺主页 URL”专用接口
- 但从 ERP 角度，这不影响核心业务系统建设
