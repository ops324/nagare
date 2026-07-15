import type { FlowItem } from '@/lib/types';

export function FlowCard({ item, index = 0 }: { item: FlowItem; index?: number }) {
  return (
    <article
      className="card-filled flowcard rise"
      data-tone={item.tone}
      style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
    >
      <div className="flowcard-emoji" aria-hidden>
        {item.emoji ?? '·'}
      </div>
      <div className="flowcard-body">
        <h3 className="flowcard-title">
          {item.title}
          <span className="flowcard-sys">{item.system}</span>
        </h3>
        <p className="flowcard-desc">{item.description}</p>
      </div>
    </article>
  );
}
