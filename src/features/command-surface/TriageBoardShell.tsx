import React, { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, Eye, ShieldAlert } from "lucide-react";
import { CommandSurfaceConfig, CommandSurfaceRow } from "./types";
import "@/styles/command-surface.css";

type LaneKey = "watchlist" | "review" | "escalate";

const LANE_META: Record<LaneKey, { title: string; icon: React.ReactNode; hint: string }> = {
  watchlist: {
    title: "Watchlist",
    icon: <Eye size={15} />,
    hint: "Keep nearby for operator awareness",
  },
  review: {
    title: "Review",
    icon: <ShieldAlert size={15} />,
    hint: "Needs active operator review",
  },
  escalate: {
    title: "Escalate",
    icon: <AlertTriangle size={15} />,
    hint: "Flag for follow-up outside this local proof shell",
  },
};

type Props = {
  items: CommandSurfaceRow[];
  config: CommandSurfaceConfig;
};

type SortableCardProps = {
  item: CommandSurfaceRow;
};

type TriageLaneProps = {
  lane: LaneKey;
  items: CommandSurfaceRow[];
};

function SortableCard({ item }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <button ref={setNodeRef} style={style} type="button" className="ecc-triage-card" {...attributes} {...listeners}>
      <span className="ecc-triage-card__title">{item.primary}</span>
      <span className="ecc-triage-card__meta">#{item.id} • {item.metricB} • {item.segment}</span>
    </button>
  );
}

function TriageLane({ lane, items }: TriageLaneProps) {
  const { isOver, setNodeRef } = useDroppable({ id: lane });

  return (
    <div ref={setNodeRef} className="ecc-triage-lane" data-drag-over={isOver || undefined}>
      <div className="ecc-triage-lane__header">
        <span className="ecc-triage-lane__label">
          {LANE_META[lane].icon}
          {LANE_META[lane].title}
        </span>
        <span className="ecc-triage-lane__hint">{LANE_META[lane].hint}</span>
      </div>
      <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
        <div className="ecc-triage-lane__body">
          {items.map((item) => (
            <SortableCard key={item.id} item={item} />
          ))}
          {items.length === 0 ? <div className="ecc-triage-lane__empty">Drop selected rows here.</div> : null}
        </div>
      </SortableContext>
    </div>
  );
}

export default function TriageBoardShell({ items, config }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [lanes, setLanes] = useState<Record<LaneKey, CommandSurfaceRow[]>>({
    watchlist: items,
    review: [],
    escalate: [],
  });

  React.useEffect(() => {
    setLanes((current) => {
      const currentItems = new Map(items.map((item) => [item.id, item]));
      const retain = (lane: LaneKey) => current[lane]
        .filter((item) => currentItems.has(item.id))
        .map((item) => currentItems.get(item.id)!);
      const review = retain("review");
      const escalate = retain("escalate");
      const assigned = new Set([...review, ...escalate].map((item) => item.id));
      const watchlist = retain("watchlist");
      const watchlistIds = new Set(watchlist.map((item) => item.id));

      for (const item of items) {
        if (!assigned.has(item.id) && !watchlistIds.has(item.id)) {
          watchlist.push(item);
        }
      }

      return { watchlist, review, escalate };
    });
  }, [items]);

  const allIds = useMemo(() => Object.values(lanes).flatMap((lane) => lane.map((item) => item.id)), [lanes]);

  function findLane(itemId: string): LaneKey | undefined {
    return (Object.keys(lanes) as LaneKey[]).find((lane) => lanes[lane].some((item) => item.id === itemId));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const sourceLane = findLane(activeId);
    const targetLane = (Object.keys(LANE_META) as LaneKey[]).includes(overId as LaneKey)
      ? (overId as LaneKey)
      : findLane(overId);

    if (!sourceLane || !targetLane) return;
    if (sourceLane === targetLane) {
      const laneItems = lanes[sourceLane];
      const oldIndex = laneItems.findIndex((item) => item.id === activeId);
      const newIndex = laneItems.findIndex((item) => item.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;
      setLanes((current) => ({
        ...current,
        [sourceLane]: arrayMove(current[sourceLane], oldIndex, newIndex),
      }));
      return;
    }

    const moved = lanes[sourceLane].find((item) => item.id === activeId);
    if (!moved) return;

    setLanes((current) => ({
      ...current,
      [sourceLane]: current[sourceLane].filter((item) => item.id !== activeId),
      [targetLane]: [...current[targetLane], moved],
    }));
  }

  if (!items.length) {
    return (
      <aside className="ecc-triage-shell ecc-object">
        <p className="ecc-command-surface__eyebrow">T5 Drilldown Rail</p>
        <div className="ecc-command-empty-panel">{config.triageEmptyLabel}</div>
      </aside>
    );
  }

  return (
    <aside className="ecc-triage-shell ecc-object">
      <div className="ecc-triage-shell__header">
        <div>
          <p className="ecc-command-surface__eyebrow">T5 Optional Drilldown Rail</p>
          <h2 className="ecc-triage-shell__title">{config.triageTitle}</h2>
        </div>
        <span className="ecc-triage-shell__count">{allIds.length} cards in motion</span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="ecc-triage-shell__lanes">
          {(Object.keys(LANE_META) as LaneKey[]).map((lane) => (
            <TriageLane key={lane} lane={lane} items={lanes[lane]} />
          ))}
        </div>
      </DndContext>
    </aside>
  );
}
