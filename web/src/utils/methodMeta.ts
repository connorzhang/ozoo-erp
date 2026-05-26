export type MethodMeta = {
  group: string;
  title: string;
  note?: string;
};

const patterns: Array<{ re: RegExp; meta: MethodMeta }> = [
  { re: /\/v1\/seller\/info$/, meta: { group: "店铺", title: "店铺主体信息" } },
  { re: /\/v1\/roles$/, meta: { group: "权限", title: "密钥角色与可用接口", note: "可用于 expires_at 与权限检测" } },

  { re: /\/v1\/description-category\/tree$/, meta: { group: "类目", title: "类目树" } },
  { re: /\/v1\/description-category\/attribute$/, meta: { group: "类目", title: "类目属性模板" } },
  { re: /\/v1\/description-category\/attribute\/values$/, meta: { group: "类目", title: "属性值列表" } },
  { re: /\/v1\/description-category\/attribute\/values\/search$/, meta: { group: "类目", title: "属性值搜索" } },

  { re: /\/v3\/product\/list$/, meta: { group: "商品", title: "商品列表" } },
  { re: /\/v3\/product\/info\/list$/, meta: { group: "商品", title: "商品详情批量查询" } },
  { re: /\/v3\/product\/import$/, meta: { group: "商品", title: "上品导入/更新", note: "返回 task_id" } },
  { re: /\/v1\/product\/import\/info$/, meta: { group: "商品", title: "上品导入任务状态" } },
  { re: /\/v1\/product\/pictures\/import$/, meta: { group: "商品", title: "图片导入" } },
  { re: /\/v2\/product\/pictures\/info$/, meta: { group: "商品", title: "图片导入状态" } },
  { re: /\/v1\/product\/import\/prices$/, meta: { group: "价格库存", title: "价格批量导入" } },
  { re: /\/v2\/products\/stocks$/, meta: { group: "价格库存", title: "库存批量更新" } },

  { re: /\/v3\/posting\/fbs\/list$/, meta: { group: "订单", title: "FBS 发货单列表" } },
  { re: /\/v4\/posting\/fbs\/unfulfilled\/list$/, meta: { group: "订单", title: "FBS 待处理发货单" } },
  { re: /\/v4\/posting\/fbs\/ship$/, meta: { group: "订单", title: "FBS 发货（组包/出库）" } },

  { re: /\/v2\/returns\/rfbs\/list$/, meta: { group: "售后", title: "rFBS 退货列表" } },
  { re: /\/v2\/returns\/rfbs\/get$/, meta: { group: "售后", title: "rFBS 退货详情" } },

  { re: /\/v3\/finance\/transaction\/list$/, meta: { group: "财务", title: "资金流水" } },
  { re: /\/v3\/finance\/transaction\/totals$/, meta: { group: "财务", title: "资金流水汇总" } },
  { re: /\/v1\/finance\/balance$/, meta: { group: "财务", title: "余额" } },

  { re: /\/v1\/search-queries\/top$/, meta: { group: "选品", title: "搜索词 Top", note: "可能需要 Premium Pro" } },
  { re: /\/v1\/search-queries\/text$/, meta: { group: "选品", title: "搜索词联想", note: "可能需要 Premium Pro" } },
  { re: /\/v1\/analytics\/product-queries$/, meta: { group: "选品", title: "商品查询表现（SKU 维度）" } },
];

export function getMethodMeta(method: string): MethodMeta | null {
  for (const p of patterns) {
    if (p.re.test(method)) return p.meta;
  }
  return autoMeta(method);
}

function autoMeta(method: string): MethodMeta {
  const group = guessGroup(method);
  const title = guessTitle(method, group);
  const note = guessNote(method);
  return { group, title, note };
}

function guessGroup(method: string): string {
  const s = method.trim();
  const rules: Array<{ re: RegExp; group: string }> = [
    { re: /^\/v\d+\/roles$/, group: "权限" },
    { re: /^\/v\d+\/seller\//, group: "店铺" },
    { re: /^\/v\d+\/notification\//, group: "通知" },
    { re: /^\/v\d+\/description-category\//, group: "类目" },
    { re: /^\/v\d+\/product\//, group: "商品" },
    { re: /^\/v\d+\/products\//, group: "商品" },
    { re: /^\/v\d+\/posting\//, group: "订单" },
    { re: /^\/v\d+\/fbs\//, group: "订单" },
    { re: /^\/v\d+\/returns?\//, group: "售后" },
    { re: /^\/v\d+\/return\//, group: "售后" },
    { re: /^\/v\d+\/finance\//, group: "财务" },
    { re: /^\/v\d+\/analytics\//, group: "分析" },
    { re: /^\/v\d+\/search-queries\//, group: "选品" },
    { re: /^\/v\d+\/report\//, group: "报表" },
    { re: /^\/v\d+\/warehouse\//, group: "仓库" },
    { re: /^\/v\d+\/delivery-method\//, group: "配送" },
    { re: /^\/v\d+\/carriage\//, group: "配送" },
    { re: /^\/v\d+\/question\//, group: "问答" },
    { re: /^\/v\d+\/review\//, group: "评价" },
    { re: /^\/v\d+\/pricing-strategy\//, group: "定价策略" },
  ];
  for (const r of rules) {
    if (r.re.test(s)) return r.group;
  }
  return "其它";
}

function guessTitle(method: string, group: string): string {
  const parts = method.split("/").filter(Boolean);
  if (parts.length < 2) return method || "—";
  const verb = parts[parts.length - 1];
  const prev = parts.length >= 3 ? parts[parts.length - 2] : "";

  const action = mapAction(verb, prev);
  const subject = group === "其它" ? mapSubject(parts[1]) : group;
  if (!action) return `${subject} 接口`;
  return `${subject}${action}`;
}

function mapSubject(seg: string): string {
  const m: Record<string, string> = {
    product: "商品",
    products: "商品",
    posting: "订单",
    returns: "售后",
    return: "售后",
    warehouse: "仓库",
    "delivery-method": "配送",
    finance: "财务",
    analytics: "分析",
    "search-queries": "选品",
    "description-category": "类目",
    notification: "通知",
    review: "评价",
    question: "问答",
  };
  return m[seg] || "接口";
}

function mapAction(last: string, prev: string): string {
  if (!last) return "";
  if (last === "list") {
    const target = mapWord(prev);
    return target ? ` ${target}列表` : " 列表";
  }
  if (last === "get") return " 详情";
  if (last === "info") return " 信息";
  if (last === "create") return " 创建";
  if (last === "update") return " 更新";
  if (last === "set") return " 设置";
  if (last === "add") return " 添加";
  if (last === "remove") return " 移除";
  if (last === "delete") return " 删除";
  if (last === "archive") return " 归档";
  if (last === "unarchive") return " 恢复";
  if (last === "import") return " 导入";
  if (last === "search") return " 搜索";
  if (last === "totals") return " 汇总";
  if (last === "top") return " Top";
  if (last === "text") return " 联想";
  if (last === "ship") return " 发货";
  return ` ${mapWord(last) || last}`;
}

function mapWord(w: string): string {
  const m: Record<string, string> = {
    info: "详情",
    attributes: "属性",
    attribute: "属性",
    values: "值",
    picture: "图片",
    pictures: "图片",
    stocks: "库存",
    prices: "价格",
    transaction: "流水",
    postings: "发货单",
    posting: "发货单",
    rfbs: "rFBS",
    fbs: "FBS",
    fbo: "FBO",
    fbp: "FBP",
  };
  return m[w] || "";
}

function guessNote(method: string): string | undefined {
  if (/^\/v\d+\/search-queries\//.test(method)) return "可能需要 Premium Pro";
  return undefined;
}

