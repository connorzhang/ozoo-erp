const KEY_LABELS: Record<string, string> = {
  id: "ID",
  product_id: "商品ID",
  offer_id: "商家编码",
  sku: "SKU",
  name: "名称",
  title: "标题",
  barcode: "条码",
  price: "价格",
  currency: "币种",
  status: "状态",
  state_name: "状态",
  moderate_status: "审核状态",
  archived: "已归档",
  has_fbo_stocks: "FBO有库存",
  has_fbs_stocks: "FBS有库存",
  is_discounted: "折扣商品",
  quants: "规格/数量",
  stock: "库存",
  status_name: "状态",
  currency_code: "币种",
  created_at: "创建时间",
  updated_at: "更新时间",
  date_from: "开始日期",
  date_to: "结束日期",
  limit: "数量",
  offset: "偏移",
  total: "总数",
  last_id: "游标",

  posting_number: "发货单号",
  order_id: "订单ID",
  order_number: "订单号",
  delivery_method: "配送方式",
  tracking_number: "运单号",
  tpl_integration_type: "物流集成",
  in_process_at: "处理时间",
  shipment_date: "发货日期",
  delivering_date: "配送时间",
  substatus: "子状态",
  cancellation: "取消信息",
  customer: "买家",
  products: "商品明细",
  analytics_data: "分析数据",
  financial_data: "财务数据",
  barcodes: "条码信息",
  product_summary: "商品",
  total_amount: "订单金额",
};

const VALUE_LABELS: Record<string, Record<string, string>> = {
  status: {
    awaiting_packaging: "待打包",
    awaiting_deliver: "待发货",
    delivering: "配送中",
    delivered: "已送达",
    cancelled: "已取消",
    price_sent: "在售",
    not_created: "未创建",
    processing: "处理中",
    failed: "失败",
  },
  tpl_integration_type: {
    aggregator: "聚合物流",
  },
  substatus: {
    posting_on_way_to_city: "运输中",
    posting_canceled: "已取消",
  },
  moderate_status: {
    approved: "已通过",
    rejected: "已拒绝",
    waiting: "待审核",
    on_moderation: "审核中",
  },
};

export function labelForKey(key: string): string {
  const k = String(key || "");
  const leaf = k.includes(".") ? k.split(".").filter(Boolean).slice(-1)[0] : k;
  if (!leaf) return k;
  if (KEY_LABELS[leaf]) return KEY_LABELS[leaf];
  return k;
}

export function formatValue(key: string, v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") {
    const leaf = key.includes(".") ? key.split(".").filter(Boolean).slice(-1)[0] : key;
    const m = VALUE_LABELS[leaf];
    if (m && m[v]) return m[v];
    return v;
  }
  if (typeof v === "boolean") return v ? "是" : "否";
  if (typeof v === "number") return String(v);
  return "";
}
