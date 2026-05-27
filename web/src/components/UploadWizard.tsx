import { useState } from "react";
import Panel from "./Panel";
import Field, { TextareaField } from "./Field";
import { apiPost } from "@/utils/api";

export default function UploadWizard() {
  const [draft, setDraft] = useState({
    offer_id: `SKU-${Date.now()}`,
    name: "",
    description: "",
    category_id: "",
    price: "1000",
    images: "",
  });

  const [optLoading, setOptLoading] = useState(false);
  const [optErr, setOptErr] = useState<string | null>(null);
  const [optimized, setOptimized] = useState<any>(null);

  const [transLoading, setTransLoading] = useState(false);
  const [transErr, setTransErr] = useState<string | null>(null);
  const [translated, setTranslated] = useState<any>(null);

  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [uploadOk, setUploadOk] = useState<string | null>(null);

  async function handleOptimize() {
    setOptLoading(true);
    setOptErr(null);
    setOptimized(null);
    setTranslated(null);
    try {
      const r = await apiPost<any>("/api/selection/optimize", {
        name: draft.name,
        description: draft.description,
        category: draft.category_id,
        language: "ru",
      });
      if (r.ok === false) throw new Error(r.raw || r.error);
      setOptimized(r.data);
    } catch (e: any) {
      setOptErr(e?.message || String(e));
    } finally {
      setOptLoading(false);
    }
  }

  async function handleTranslate() {
    if (!optimized) return;
    setTransLoading(true);
    setTransErr(null);
    try {
      const texts = [optimized.optimized_name, optimized.optimized_description, optimized.keywords];
      const r = await apiPost<any>("/tools/translate", {
        texts,
        from: "ru",
        to: "zh",
      });
      if (r.ok === false) throw new Error(r.raw || r.error);
      const items = r.data?.items || [];
      setTranslated({
        name: items[0]?.translated || "",
        description: items[1]?.translated || "",
        keywords: items[2]?.translated || "",
      });
    } catch (e: any) {
      setTransErr(e?.message || String(e));
    } finally {
      setTransLoading(false);
    }
  }

  async function handleUpload() {
    setUploadLoading(true);
    setUploadErr(null);
    setUploadOk(null);
    try {
      const nameToUse = optimized?.optimized_name || draft.name;
      const descToUse = optimized?.optimized_description || draft.description;

      const payload = {
        items: [
          {
            attributes: [
              { id: 4191, complex_id: 0, values: [{ dictionary_value_id: 0, value: descToUse }] },
            ],
            category_id: Number(draft.category_id),
            description_category_id: Number(draft.category_id),
            currency_code: "RUB",
            depth: 100,
            height: 100,
            width: 100,
            dimension_unit: "mm",
            weight: 100,
            weight_unit: "g",
            images: draft.images.split(",").map((s) => s.trim()).filter(Boolean),
            name: nameToUse,
            offer_id: draft.offer_id,
            price: draft.price,
            vat: "0.1",
          },
        ],
      };

      const r = await apiPost<any>("/ozon/products/import", payload);
      if (r.ok === false) throw new Error(r.raw || r.error);
      setUploadOk(`上传请求已提交，Task ID: ${r.data?.result?.task_id || "未知"}`);
    } catch (e: any) {
      setUploadErr(e?.message || String(e));
    } finally {
      setUploadLoading(false);
    }
  }

  return (
    <Panel
      title="AI一键上品"
      subtitle="自动检测优化空间，AI补充商品标题、俄语描述及SEO关键词，并提供上传前预览与中文翻译比对。"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 左侧：原商品输入 */}
        <div className="space-y-4">
          <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 border-b pb-2 border-slate-100 dark:border-white/10">
            1. 原始商品信息
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="商品货号 (Offer ID)" value={draft.offer_id} onChange={(v) => setDraft({ ...draft, offer_id: v })} />
            <Field label="类目 ID" value={draft.category_id} onChange={(v) => setDraft({ ...draft, category_id: v })} />
            <Field label="价格 (RUB)" value={draft.price} onChange={(v) => setDraft({ ...draft, price: v })} />
          </div>
          <Field label="原始标题 (中文/简写)" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="例如：防水手机壳" />
          <TextareaField
            label="原始卖点描述"
            value={draft.description}
            onChange={(v) => setDraft({ ...draft, description: v })}
            rows={4}
            placeholder="例如：防摔，透明，支持无线充电"
          />
          <TextareaField
            label="图片链接 (逗号分隔)"
            value={draft.images}
            onChange={(v) => setDraft({ ...draft, images: v })}
            rows={2}
          />
          <button
            type="button"
            onClick={() => void handleOptimize()}
            disabled={optLoading || !draft.name}
            className="w-full flex justify-center items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-60"
          >
            {optLoading ? "AI 分析优化中..." : "✨ AI 一键检测与优化"}
          </button>
          {optErr && <div className="text-[12px] text-rose-600 mt-2 bg-rose-50 p-2 rounded">{optErr}</div>}
        </div>

        {/* 右侧：AI 优化预览与比对 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-white/10">
            <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">
              2. 优化预览与确认
            </div>
            {optimized && (
              <button
                type="button"
                onClick={() => void handleTranslate()}
                disabled={transLoading}
                className="text-[12px] text-azure-600 hover:text-azure-700"
              >
                {transLoading ? "翻译中..." : "中俄对照翻译"}
              </button>
            )}
          </div>

          {!optimized ? (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[13px] text-slate-400 dark:border-white/10 dark:bg-white/5">
              请先在左侧输入信息并点击“AI一键检测与优化”
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
                <div className="text-[12px] font-medium text-slate-500 mb-1">优化后标题 (俄语)</div>
                <div className="text-[13px] text-slate-900 dark:text-slate-100">{optimized.optimized_name}</div>
                {translated && <div className="mt-1 text-[12px] text-azure-600">中文：{translated.name}</div>}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
                <div className="text-[12px] font-medium text-slate-500 mb-1">优化后描述 (支持HTML富文本)</div>
                <div className="text-[13px] text-slate-900 dark:text-slate-100 max-h-40 overflow-auto whitespace-pre-wrap">
                  {optimized.optimized_description}
                </div>
                {translated && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5 text-[12px] text-azure-600 max-h-32 overflow-auto whitespace-pre-wrap">
                    中文：{translated.description}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
                <div className="text-[12px] font-medium text-slate-500 mb-1">SEO 关键词</div>
                <div className="text-[13px] text-slate-900 dark:text-slate-100">{optimized.keywords}</div>
                {translated && <div className="mt-1 text-[12px] text-azure-600">中文：{translated.keywords}</div>}
              </div>

              <button
                type="button"
                onClick={() => void handleUpload()}
                disabled={uploadLoading}
                className="w-full flex justify-center items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-60"
              >
                {uploadLoading ? "正在提交至 Ozon..." : "确认无误，一键上传 Ozon"}
              </button>

              {uploadErr && <div className="text-[12px] text-rose-600 mt-2 bg-rose-50 p-3 rounded-lg border border-rose-200">{uploadErr}</div>}
              {uploadOk && <div className="text-[12px] text-emerald-700 mt-2 bg-emerald-50 p-3 rounded-lg border border-emerald-200">{uploadOk}</div>}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
