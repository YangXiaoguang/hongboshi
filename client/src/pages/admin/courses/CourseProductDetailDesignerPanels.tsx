import {
  ArrowDown,
  ArrowUp,
  Copy,
  FileImage,
  Layers3,
  PanelRight,
  Save,
  Trash2,
} from "lucide-react";
import type { CourseProductRichTextBlockType } from "@shared/domain";
import {
  detailContentTemplateDefinitions,
  h5BlockTypeOptions,
  imageAspectRatioOptions,
  imageCaptionModeOptions,
  imageFitOptions,
  merchandisingAssetUsageOptions,
  styleRadiusOptions,
  styleSpacingOptions,
  styleToneOptions,
  type DetailBlockStyleState,
  type DetailContentTemplateId,
  type DetailDesignerSelection,
  type DetailDesignerSavedTemplate,
  type H5BlockFormState,
  type MediaAssetFormState,
} from "./courseProductDetailDesigner";

export function CourseProductDetailStructurePanel({
  selection,
  imageAssets,
  richTextBlocks,
  onSelectionChange,
  onAddBlock,
  onMoveBlock,
  onDuplicateBlock,
  onRequestRemoveBlock,
}: {
  selection: DetailDesignerSelection;
  imageAssets: MediaAssetFormState[];
  richTextBlocks: H5BlockFormState[];
  onSelectionChange: (selection: DetailDesignerSelection) => void;
  onAddBlock: (type: CourseProductRichTextBlockType) => void;
  onMoveBlock: (blockId: string, direction: "up" | "down") => void;
  onDuplicateBlock: (blockId: string) => void;
  onRequestRemoveBlock: (block: H5BlockFormState) => void;
}) {
  return (
    <div className="h-fit rounded-lg border border-[#E1D7C8] bg-[#FBF7EF] p-3">
      <div className="flex items-center gap-2 px-1 text-sm font-semibold text-[#243B35]">
        <Layers3 className="h-4 w-4 text-[#6F8F83]" />
        页面结构
      </div>
      <div className="mt-3 space-y-2">
        <button
          onClick={() => onSelectionChange({ kind: "overview" })}
          className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
            selection.kind === "overview"
              ? "border-[#6F8F83] bg-[#EEF6ED] text-[#243B35]"
              : "border-[#E1D7C8] bg-white text-[#6F7771] hover:border-[#9FB3A9]"
          }`}
        >
          <span className="block font-semibold">商品基础说明</span>
          <span className="mt-1 block leading-5">
            摘要、适合人群、卖点、标题
          </span>
        </button>

        {imageAssets.map(asset => (
          <button
            key={asset.id}
            onClick={() => onSelectionChange({ kind: "asset", id: asset.id })}
            className={`grid w-full grid-cols-[44px_minmax(0,1fr)] gap-2 rounded-lg border p-2 text-left text-xs transition ${
              selection.kind === "asset" && selection.id === asset.id
                ? "border-[#6F8F83] bg-[#EEF6ED] text-[#243B35]"
                : "border-[#E1D7C8] bg-white text-[#6F7771] hover:border-[#9FB3A9]"
            }`}
          >
            <span className="overflow-hidden rounded-md bg-[#F8F3EA]">
              {asset.imageUrl ? (
                <img
                  src={asset.imageUrl}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <span className="flex aspect-square items-center justify-center">
                  <FileImage className="h-4 w-4" />
                </span>
              )}
            </span>
            <span className="min-w-0">
              <span className="line-clamp-1 block font-semibold text-[#243B35]">
                {asset.title}
              </span>
              <span className="mt-1 block">
                {merchandisingAssetUsageOptions.find(
                  item => item.value === asset.usage
                )?.label ?? "详情图"}
              </span>
            </span>
          </button>
        ))}

        <div className="border-t border-[#E1D7C8] pt-3">
          <p className="px-1 text-xs font-semibold text-[#8A8176]">详情段落</p>
          <div className="mt-2 space-y-2">
            {richTextBlocks.map((block, index) => (
              <div
                key={block.id}
                className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                  selection.kind === "block" && selection.id === block.id
                    ? "border-[#6F8F83] bg-[#EEF6ED] text-[#243B35]"
                    : "border-[#E1D7C8] bg-white text-[#6F7771] hover:border-[#9FB3A9]"
                }`}
              >
                <button
                  onClick={() =>
                    onSelectionChange({ kind: "block", id: block.id })
                  }
                  className="w-full text-left"
                >
                  <span className="block font-semibold text-[#243B35]">
                    {index + 1}.{" "}
                    {h5BlockTypeOptions.find(item => item.value === block.type)
                      ?.label ?? "内容块"}
                  </span>
                  <span className="mt-1 line-clamp-1 block">
                    {block.title || block.question || block.body || "待填写"}
                  </span>
                </button>
                <div className="mt-2 flex items-center gap-1">
                  <button
                    onClick={() => onMoveBlock(block.id, "up")}
                    disabled={index === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E1D7C8] text-[#6F7771] transition hover:border-[#9FB3A9] hover:text-[#243B35] disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="上移内容块"
                    title="上移"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onMoveBlock(block.id, "down")}
                    disabled={index === richTextBlocks.length - 1}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E1D7C8] text-[#6F7771] transition hover:border-[#9FB3A9] hover:text-[#243B35] disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="下移内容块"
                    title="下移"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDuplicateBlock(block.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E1D7C8] text-[#6F7771] transition hover:border-[#9FB3A9] hover:text-[#243B35]"
                    aria-label="复制内容块"
                    title="复制"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onRequestRemoveBlock(block)}
                    className="ml-auto flex h-7 w-7 items-center justify-center rounded-md border border-[#E1D7C8] text-[#A65F48] transition hover:bg-[#FFF4EF]"
                    aria-label="删除内容块"
                    title="删除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[#E1D7C8] pt-3">
          <p className="px-1 text-xs font-semibold text-[#8A8176]">添加模块</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              ["paragraph", "正文"],
              ["image", "图片"],
              ["bullet_list", "要点"],
              ["faq", "FAQ"],
            ].map(([type, label]) => (
              <button
                key={type}
                onClick={() =>
                  onAddBlock(type as CourseProductRichTextBlockType)
                }
                className="rounded-lg border border-[#E1D7C8] bg-white px-2 py-2 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CourseProductDetailStylePanel({
  selection,
  selectedTitle,
  selectedStyle,
  selectedIsImage,
  activeTemplateId,
  savedTemplates,
  templateDraftName,
  onStyleChange,
  onTemplateApply,
  onTemplateDraftNameChange,
  onTemplateSave,
  onSavedTemplateApply,
  onSavedTemplateDelete,
}: {
  selection: DetailDesignerSelection;
  selectedTitle: string;
  selectedStyle: DetailBlockStyleState;
  selectedIsImage: boolean;
  activeTemplateId?: DetailContentTemplateId;
  savedTemplates: DetailDesignerSavedTemplate[];
  templateDraftName: string;
  onStyleChange: (patch: Partial<DetailBlockStyleState>) => void;
  onTemplateApply: (templateId: DetailContentTemplateId) => void;
  onTemplateDraftNameChange: (value: string) => void;
  onTemplateSave: () => void;
  onSavedTemplateApply: (templateId: string) => void;
  onSavedTemplateDelete: (templateId: string) => void;
}) {
  return (
    <div className="rounded-lg border border-[#E1D7C8] bg-[#FBF7EF] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
            <PanelRight className="h-4 w-4 text-[#6F8F83]" />
            样式
          </div>
          <p className="mt-1 line-clamp-1 text-xs text-[#6F7771]">
            {selectedTitle}
          </p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6F8F83]">
          {selection.kind === "overview"
            ? "整体"
            : selectedIsImage
              ? "图片"
              : "段落"}
        </span>
      </div>

      {selection.kind === "overview" ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs leading-5 text-[#6F7771]">
            先选择一套详情结构，系统会补齐空白文案、重排 H5
            区块，并统一当前图片和段落样式。
          </p>
          <div className="space-y-2">
            {detailContentTemplateDefinitions.map(template => (
              <button
                key={template.id}
                onClick={() => onTemplateApply(template.id)}
                className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                  activeTemplateId === template.id
                    ? "border-[#6F8F83] bg-[#EEF6ED]"
                    : "border-[#E1D7C8] bg-white hover:border-[#9FB3A9]"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#243B35]">
                    {template.label}
                  </span>
                  <span className="rounded-full bg-[#F8F3EA] px-2 py-0.5 text-[10px] font-semibold text-[#6F8F83]">
                    {template.badge}
                  </span>
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#6F7771]">
                  {template.description}
                </span>
              </button>
            ))}
          </div>
          <div className="border-t border-[#E1D7C8] pt-3">
            <p className="text-xs font-semibold text-[#41524B]">运营模板草案</p>
            <p className="mt-1 text-xs leading-5 text-[#6F7771]">
              保存当前 H5
              区块结构、文案和样式到本地草案库；套用后仍需保存图文内容。
            </p>
            <div className="mt-2 flex gap-2">
              <input
                value={templateDraftName}
                onChange={event =>
                  onTemplateDraftNameChange(event.target.value)
                }
                placeholder="例如：情绪课程图文模板"
                className="h-9 min-w-0 flex-1 rounded-lg border border-[#D8CEC0] bg-white px-3 text-xs outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
              />
              <button
                onClick={onTemplateSave}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#243B35] px-3 text-xs font-semibold text-white transition hover:bg-[#315047]"
              >
                <Save className="h-3.5 w-3.5" />
                保存
              </button>
            </div>
            {savedTemplates.length === 0 ? (
              <div className="mt-2 rounded-lg border border-dashed border-[#D8CEC0] bg-white px-3 py-3 text-xs leading-5 text-[#6F7771]">
                暂无草案模板。整理好一个详情结构后可先保存，后续商品可直接套用。
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {savedTemplates.map(template => (
                  <div
                    key={template.id}
                    className="rounded-lg border border-[#E1D7C8] bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => onSavedTemplateApply(template.id)}
                        className="min-w-0 text-left"
                      >
                        <span className="line-clamp-1 block text-xs font-semibold text-[#243B35]">
                          {template.name}
                        </span>
                        <span className="mt-1 block text-[11px] text-[#8A8176]">
                          {template.richTextBlocks.length} 个区块
                        </span>
                      </button>
                      <button
                        onClick={() => onSavedTemplateDelete(template.id)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#A65F48] transition hover:bg-[#FFF4EF]"
                        aria-label="删除模板草案"
                        title="删除草案"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          <label className="text-xs font-semibold text-[#41524B]">
            风格
            <select
              value={selectedStyle.tone}
              onChange={event =>
                onStyleChange({
                  tone: event.target.value as DetailBlockStyleState["tone"],
                })
              }
              className="mt-1 h-9 w-full rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs outline-none focus:border-[#6F8F83]"
            >
              {styleToneOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-[#41524B]">
              留白
              <select
                value={selectedStyle.spacing}
                onChange={event =>
                  onStyleChange({
                    spacing: event.target
                      .value as DetailBlockStyleState["spacing"],
                  })
                }
                className="mt-1 h-9 w-full rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs outline-none focus:border-[#6F8F83]"
              >
                {styleSpacingOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-[#41524B]">
              圆角
              <select
                value={selectedStyle.radius}
                onChange={event =>
                  onStyleChange({
                    radius: event.target
                      .value as DetailBlockStyleState["radius"],
                  })
                }
                className="mt-1 h-9 w-full rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs outline-none focus:border-[#6F8F83]"
              >
                {styleRadiusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedIsImage && (
            <>
              <label className="text-xs font-semibold text-[#41524B]">
                图片比例
                <select
                  value={selectedStyle.imageAspectRatio}
                  onChange={event =>
                    onStyleChange({
                      imageAspectRatio: event.target
                        .value as DetailBlockStyleState["imageAspectRatio"],
                    })
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs outline-none focus:border-[#6F8F83]"
                >
                  {imageAspectRatioOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-[#41524B]">
                  显示
                  <select
                    value={selectedStyle.imageFit}
                    onChange={event =>
                      onStyleChange({
                        imageFit: event.target
                          .value as DetailBlockStyleState["imageFit"],
                      })
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs outline-none focus:border-[#6F8F83]"
                  >
                    {imageFitOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-[#41524B]">
                  说明
                  <select
                    value={selectedStyle.captionMode}
                    onChange={event =>
                      onStyleChange({
                        captionMode: event.target
                          .value as DetailBlockStyleState["captionMode"],
                      })
                    }
                    className="mt-1 h-9 w-full rounded-lg border border-[#D8CEC0] bg-white px-2 text-xs outline-none focus:border-[#6F8F83]"
                  >
                    {imageCaptionModeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
