/**
 * WheelPicker — vertical infinite drum picker (mobile only).
 * Shows 3 cards at a time; center card is selected with amber ring.
 * Wraps infinitely using a 5× repeated list + silent recentering.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface WheelItem {
  id: string;
  title: string;
  desc: string;
  image: string;
}

interface Props {
  items: WheelItem[];
  onSelect: (id: string) => void;
}

const ITEM_H = 148;   // px — height of each drum slot
const REPEAT  = 5;    // repeat array 5× so user can't scroll to the edge

export function WheelPicker({ items, onSelect }: Props) {
  const count      = items.length;
  const repeated   = Array.from({ length: REPEAT }, () => items).flat();
  const midRep     = Math.floor(REPEAT / 2); // 2

  const [activeIdx, setActiveIdx] = useState(0);
  const drumRef   = useRef<HTMLDivElement>(null);
  const doJump    = useRef(false);
  const jumpTimer = useRef<ReturnType<typeof setTimeout>>();

  // Scroll to middle repetition on mount (no animation)
  useEffect(() => {
    const el = drumRef.current;
    if (!el) return;
    el.scrollTop = midRep * count * ITEM_H;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = useCallback(() => {
    const el = drumRef.current;
    if (!el || doJump.current) return;

    const raw  = Math.round(el.scrollTop / ITEM_H);
    const real = ((raw % count) + count) % count;
    setActiveIdx(real);

    // After scrolling settles, silently recenter to middle repetition
    clearTimeout(jumpTimer.current);
    jumpTimer.current = setTimeout(() => {
      doJump.current = true;
      el.scrollTop = (midRep * count + real) * ITEM_H;
      setTimeout(() => { doJump.current = false; }, 40);
    }, 180);
  }, [count, midRep]);

  const scrollTo = (idx: number) => {
    drumRef.current?.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
  };

  return (
    <div className="wheel-outer">
      {/* Top + bottom fade for drum depth illusion */}
      <div className="wheel-fade wheel-fade-top" />
      <div className="wheel-fade wheel-fade-bot" />

      {/* Amber selection ring sits over the center slot */}
      <div className="wheel-ring" />

      <div ref={drumRef} className="wheel-drum" onScroll={handleScroll}>
        {repeated.map((item, i) => {
          const rawCenter = midRep * count + activeIdx;
          const dist = i - rawCenter;
          const cls = dist === 0  ? 'wheel-item wheel-active'
                    : Math.abs(dist) === 1 ? 'wheel-item wheel-near'
                    : 'wheel-item wheel-far';

          return (
            <div
              key={i}
              className={cls}
              style={{ backgroundImage: `url(${item.image})` }}
              onClick={() => dist === 0 ? onSelect(item.id) : scrollTo(i)}
            >
              <div className="wheel-item-label">{item.title}</div>
            </div>
          );
        })}
      </div>

      {/* Description + CTA live outside the drum so text is always readable */}
      <p className="wheel-desc">{items[activeIdx].desc}</p>

      <button
        className="wheel-select-btn"
        onClick={() => onSelect(items[activeIdx].id)}
      >
        ▶&nbsp;SELECT
      </button>
    </div>
  );
}
