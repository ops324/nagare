import type { FlowItem } from '@/lib/types';

export function FlowCard({ item, index = 0 }: { item: FlowItem; index?: number }) {
  return (
    <article
      className="card-filled flowcard rise"
      data-tone={item.tone}
      style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
    >
      {/* 系統名は枠付きタグではなく、見出しの上に立つ眉。
          item.emoji は描画しない — 絵文字は品格を削り、漢字一字に置き換えると
          見出しの語として読まれて眉の系統名と衝突する（「暦 六曜：先勝」）。
          兆しの別は見出し直上の色罫（.flowcard::before）が担う。 */}
      <span className="flowcard-sys">{item.system}</span>
      <h3 className="flowcard-title">{item.title}</h3>
      <p className="flowcard-desc">{item.description}</p>
    </article>
  );
}
