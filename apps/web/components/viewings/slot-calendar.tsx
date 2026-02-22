"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Button } from "@propad/ui";

export type ViewingCalendarSlot = {
  id: string;
  startAt: string;
  endAt?: string;
  status: string;
  viewerName?: string;
};

export function SlotCalendar({
  slots,
  selectedSlotId,
  onSelectSlot,
  onDragCreateDates,
  onDragCreateTimeBlock,
  onDragCreateTimeBlocks,
  onResizeOpenSlot,
  snapMinutes = 30,
}: {
  slots: ViewingCalendarSlot[];
  selectedSlotId?: string | null;
  onSelectSlot?: (slotId: string) => void;
  onDragCreateDates?: (dates: string[]) => void;
  onDragCreateTimeBlock?: (range: { startAt: string; endAt: string }) => void;
  onDragCreateTimeBlocks?: (
    ranges: Array<{ startAt: string; endAt: string }>,
  ) => void;
  onResizeOpenSlot?: (payload: {
    slotId: string;
    startAt: string;
    endAt: string;
  }) => void;
  snapMinutes?: 15 | 30 | 60;
}) {
  const [mode, setMode] = useState<"month" | "week">("week");
  const [anchor, setAnchor] = useState(new Date());

  const [dragStartKey, setDragStartKey] = useState<string | null>(null);
  const [dragHoverKey, setDragHoverKey] = useState<string | null>(null);

  const [dragStartCell, setDragStartCell] = useState<{
    dayKey: string;
    row: number;
  } | null>(null);
  const [dragHoverCell, setDragHoverCell] = useState<{
    dayKey: string;
    row: number;
  } | null>(null);
  const [resizeState, setResizeState] = useState<{
    slotId: string;
    edge: "start" | "end";
    dayKey: string;
  } | null>(null);
  const [resizeHoverRow, setResizeHoverRow] = useState<number | null>(null);
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState({
    open: true,
    booked: true,
    ghost: true,
    conflict: true,
  });

  const stepMinutes = snapMinutes;
  const rowsPerDay = (24 * 60) / stepMinutes;

  const slotsByDay = useMemo(() => {
    const map = new Map<string, ViewingCalendarSlot[]>();
    for (const slot of slots) {
      const key = format(new Date(slot.startAt), "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), slot]);
    }
    for (const [key, values] of map.entries()) {
      map.set(
        key,
        values.sort(
          (left, right) =>
            new Date(left.startAt).getTime() -
            new Date(right.startAt).getTime(),
        ),
      );
    }
    return map;
  }, [slots]);

  const days = useMemo(() => {
    if (mode === "week") {
      const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
      return Array.from({ length: 7 }).map((_, index) =>
        addDays(weekStart, index),
      );
    }

    const monthStart = startOfMonth(anchor);
    const monthEnd = endOfMonth(anchor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const diffDays = Math.ceil(
      (monthEnd.getTime() - gridStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    const total = Math.ceil((diffDays + 1) / 7) * 7;
    return Array.from({ length: total }).map((_, index) =>
      addDays(gridStart, index),
    );
  }, [anchor, mode]);

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, index) =>
      addDays(weekStart, index),
    );
  }, [anchor]);

  const weekDayKeys = weekDays.map((day) => format(day, "yyyy-MM-dd"));
  const dayIndexByKey = new Map(weekDayKeys.map((key, index) => [key, index]));

  const dragRangeKeys = useMemo(() => {
    if (!dragStartKey || !dragHoverKey) return new Set<string>();
    const start = new Date(`${dragStartKey}T00:00:00`).getTime();
    const end = new Date(`${dragHoverKey}T00:00:00`).getTime();
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    const keys = new Set<string>();
    for (let cursor = min; cursor <= max; cursor += 24 * 60 * 60 * 1000) {
      keys.add(format(new Date(cursor), "yyyy-MM-dd"));
    }
    return keys;
  }, [dragHoverKey, dragStartKey]);

  const activeCellRect = useMemo(() => {
    if (!dragStartCell || !dragHoverCell) return null;
    const startDay = dayIndexByKey.get(dragStartCell.dayKey);
    const hoverDay = dayIndexByKey.get(dragHoverCell.dayKey);
    if (startDay === undefined || hoverDay === undefined) return null;
    return {
      minDay: Math.min(startDay, hoverDay),
      maxDay: Math.max(startDay, hoverDay),
      minRow: Math.min(dragStartCell.row, dragHoverCell.row),
      maxRow: Math.max(dragStartCell.row, dragHoverCell.row),
    };
  }, [dayIndexByKey, dragHoverCell, dragStartCell]);

  const slotRects = useMemo(() => {
    return slots
      .map((slot) => {
        const start = new Date(slot.startAt);
        const end = slot.endAt
          ? new Date(slot.endAt)
          : new Date(start.getTime() + stepMinutes * 60 * 1000);
        const dayKey = format(start, "yyyy-MM-dd");
        const startRow = Math.max(
          0,
          Math.floor(
            (start.getHours() * 60 + start.getMinutes()) / stepMinutes,
          ),
        );
        const endRow = Math.min(
          rowsPerDay,
          Math.max(
            startRow + 1,
            Math.ceil((end.getHours() * 60 + end.getMinutes()) / stepMinutes),
          ),
        );
        return {
          slot,
          dayKey,
          startRow,
          endRow,
        };
      })
      .filter((entry) => dayIndexByKey.has(entry.dayKey));
  }, [dayIndexByKey, rowsPerDay, slots]);

  const hasConflictForRange = (
    dayKey: string,
    startRow: number,
    endRow: number,
    ignoreSlotId?: string,
  ) => {
    return slotRects.some((entry) => {
      if (entry.dayKey !== dayKey) return false;
      if (entry.slot.status === "CANCELLED") return false;
      if (ignoreSlotId && entry.slot.id === ignoreSlotId) return false;
      return startRow < entry.endRow && endRow > entry.startRow;
    });
  };

  const rowLabel = (row: number) => {
    const hours = Math.floor((row * stepMinutes) / 60);
    const minutes = (row * stepMinutes) % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const cellOverlappingRect = (dayKey: string, row: number) => {
    return slotRects.find(
      (entry) =>
        entry.dayKey === dayKey && row >= entry.startRow && row < entry.endRow,
    );
  };

  const completeWeekDrag = (dayKey: string) => {
    if (!activeCellRect) {
      setDragStartCell(null);
      setDragHoverCell(null);
      return;
    }

    const releasedDay = dayIndexByKey.get(dayKey);
    if (releasedDay === undefined) {
      setDragStartCell(null);
      setDragHoverCell(null);
      return;
    }

    if (
      releasedDay < activeCellRect.minDay ||
      releasedDay > activeCellRect.maxDay
    ) {
      setDragStartCell(null);
      setDragHoverCell(null);
      return;
    }

    const ranges: Array<{ startAt: string; endAt: string }> = [];
    let hasConflict = false;
    for (
      let dayIndex = activeCellRect.minDay;
      dayIndex <= activeCellRect.maxDay;
      dayIndex++
    ) {
      const key = weekDayKeys[dayIndex];
      if (
        hasConflictForRange(
          key,
          activeCellRect.minRow,
          activeCellRect.maxRow + 1,
        )
      ) {
        hasConflict = true;
      }
      const start = new Date(`${key}T00:00:00`);
      start.setMinutes(activeCellRect.minRow * stepMinutes);
      const end = new Date(`${key}T00:00:00`);
      end.setMinutes((activeCellRect.maxRow + 1) * stepMinutes);
      ranges.push({ startAt: start.toISOString(), endAt: end.toISOString() });
    }

    if (hasConflict) {
      setInteractionError(
        "Selected range conflicts with existing/booked slots",
      );
      setDragStartCell(null);
      setDragHoverCell(null);
      return;
    }

    setInteractionError(null);

    if (onDragCreateTimeBlocks) {
      onDragCreateTimeBlocks(ranges);
    } else if (onDragCreateTimeBlock && ranges[0]) {
      onDragCreateTimeBlock(ranges[0]);
    }

    setDragStartCell(null);
    setDragHoverCell(null);
  };

  const completeResize = (dayKey: string) => {
    if (!resizeState || !onResizeOpenSlot || resizeHoverRow === null) {
      setResizeState(null);
      setResizeHoverRow(null);
      return;
    }
    if (resizeState.dayKey !== dayKey) {
      setResizeState(null);
      setResizeHoverRow(null);
      return;
    }

    const target = slotRects.find(
      (entry) => entry.slot.id === resizeState.slotId,
    );
    if (!target || target.slot.status !== "OPEN") {
      setResizeState(null);
      setResizeHoverRow(null);
      return;
    }

    let startRow = target.startRow;
    let endRow = target.endRow;
    if (resizeState.edge === "start") {
      startRow = Math.min(Math.max(0, resizeHoverRow), endRow - 1);
    } else {
      endRow = Math.max(Math.min(rowsPerDay, resizeHoverRow + 1), startRow + 1);
    }

    if (hasConflictForRange(dayKey, startRow, endRow, target.slot.id)) {
      setInteractionError("Resize conflicts with another slot");
      setResizeState(null);
      setResizeHoverRow(null);
      return;
    }

    setInteractionError(null);

    const start = new Date(`${dayKey}T00:00:00`);
    start.setMinutes(startRow * stepMinutes);
    const end = new Date(`${dayKey}T00:00:00`);
    end.setMinutes(endRow * stepMinutes);

    onResizeOpenSlot({
      slotId: target.slot.id,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    });

    setResizeState(null);
    setResizeHoverRow(null);
  };

  const nudgeOpenSlot = (
    slotId: string,
    edge: "start" | "end",
    dayKey: string,
    delta: -1 | 1,
  ) => {
    if (!onResizeOpenSlot) return;
    const target = slotRects.find((entry) => entry.slot.id === slotId);
    if (!target || target.slot.status !== "OPEN") return;

    let startRow = target.startRow;
    let endRow = target.endRow;
    if (edge === "start") {
      startRow = Math.min(Math.max(0, startRow + delta), endRow - 1);
    } else {
      endRow = Math.max(Math.min(rowsPerDay, endRow + delta), startRow + 1);
    }

    if (hasConflictForRange(dayKey, startRow, endRow, slotId)) {
      setInteractionError("Nudge blocked by slot conflict");
      return;
    }

    setInteractionError(null);

    const start = new Date(`${dayKey}T00:00:00`);
    start.setMinutes(startRow * stepMinutes);
    const end = new Date(`${dayKey}T00:00:00`);
    end.setMinutes(endRow * stepMinutes);

    onResizeOpenSlot({
      slotId,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    });
  };

  const dragPreviewConflict = useMemo(() => {
    if (!activeCellRect) return false;
    for (
      let dayIndex = activeCellRect.minDay;
      dayIndex <= activeCellRect.maxDay;
      dayIndex++
    ) {
      const key = weekDayKeys[dayIndex];
      if (
        hasConflictForRange(
          key,
          activeCellRect.minRow,
          activeCellRect.maxRow + 1,
        )
      ) {
        return true;
      }
    }
    return false;
  }, [activeCellRect, slotRects, weekDayKeys]);

  const resizePreview = useMemo(() => {
    if (!resizeState || resizeHoverRow === null) return null;
    const target = slotRects.find(
      (entry) => entry.slot.id === resizeState.slotId,
    );
    if (!target) return null;

    let startRow = target.startRow;
    let endRow = target.endRow;
    if (resizeState.edge === "start") {
      startRow = Math.min(Math.max(0, resizeHoverRow), endRow - 1);
    } else {
      endRow = Math.max(Math.min(rowsPerDay, resizeHoverRow + 1), startRow + 1);
    }

    return {
      slotId: target.slot.id,
      dayKey: target.dayKey,
      startRow,
      endRow,
      hasConflict: hasConflictForRange(
        target.dayKey,
        startRow,
        endRow,
        target.slot.id,
      ),
    };
  }, [hasConflictForRange, resizeHoverRow, resizeState, rowsPerDay, slotRects]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setAnchor(
                mode === "month" ? addMonths(anchor, -1) : addDays(anchor, -7),
              )
            }
          >
            Prev
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setAnchor(
                mode === "month" ? addMonths(anchor, 1) : addDays(anchor, 7),
              )
            }
          >
            Next
          </Button>
          <span className="text-sm font-medium text-foreground">
            {format(anchor, "MMMM yyyy")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={mode === "week" ? "default" : "secondary"}
            onClick={() => setMode("week")}
          >
            Week
          </Button>
          <Button
            size="sm"
            variant={mode === "month" ? "default" : "secondary"}
            onClick={() => setMode("month")}
          >
            Month
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <button
          type="button"
          aria-pressed={visibility.open}
          onClick={() =>
            setVisibility((current) => ({ ...current, open: !current.open }))
          }
          className={`rounded-full px-2 py-0.5 ${
            visibility.open
              ? "bg-emerald-50 text-emerald-800"
              : "bg-muted text-muted-foreground"
          }`}
        >
          Open
        </button>
        <button
          type="button"
          aria-pressed={visibility.booked}
          onClick={() =>
            setVisibility((current) => ({
              ...current,
              booked: !current.booked,
            }))
          }
          className={`rounded-full px-2 py-0.5 ${
            visibility.booked
              ? "bg-slate-200 text-slate-600"
              : "bg-muted text-muted-foreground"
          }`}
        >
          Booked
        </button>
        <button
          type="button"
          aria-pressed={visibility.ghost}
          onClick={() =>
            setVisibility((current) => ({ ...current, ghost: !current.ghost }))
          }
          className={`rounded-full border px-2 py-0.5 ${
            visibility.ghost
              ? "border-dashed border-emerald-500 bg-emerald-100/80 text-emerald-900"
              : "border-border bg-muted text-muted-foreground"
          }`}
        >
          Ghost
        </button>
        <button
          type="button"
          aria-pressed={visibility.conflict}
          onClick={() =>
            setVisibility((current) => ({
              ...current,
              conflict: !current.conflict,
            }))
          }
          className={`rounded-full px-2 py-0.5 ${
            visibility.conflict
              ? "bg-rose-200 text-rose-900"
              : "bg-muted text-muted-foreground"
          }`}
        >
          Conflict
        </button>
      </div>
      {interactionError ? (
        <p className="text-xs text-amber-700">{interactionError}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Drag to create. Red preview means conflict and will not submit.
        </p>
      )}

      <div className="grid grid-cols-7 gap-2">
        {mode === "week" &&
        (onDragCreateTimeBlocks || onDragCreateTimeBlock) ? (
          <>
            {weekDays.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const dayIndex = dayIndexByKey.get(dayKey) ?? 0;
              return (
                <div
                  key={dayKey}
                  className="rounded-lg border border-border p-1"
                >
                  <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {format(day, "EEE d")}
                  </p>
                  <div className="space-y-0.5">
                    {Array.from({ length: rowsPerDay }).map((_, row) => {
                      const overlapping = cellOverlappingRect(dayKey, row);
                      const rawStatus = overlapping?.slot.status ?? null;
                      const status =
                        rawStatus === "OPEN" && visibility.open
                          ? rawStatus
                          : rawStatus === "BOOKED" && visibility.booked
                            ? rawStatus
                            : null;
                      const inSelection =
                        Boolean(activeCellRect) &&
                        dayIndex >= (activeCellRect?.minDay ?? 0) &&
                        dayIndex <= (activeCellRect?.maxDay ?? 0) &&
                        row >= (activeCellRect?.minRow ?? 0) &&
                        row <= (activeCellRect?.maxRow ?? 0);
                      const inResizePreview =
                        resizePreview?.dayKey === dayKey &&
                        row >= (resizePreview?.startRow ?? -1) &&
                        row < (resizePreview?.endRow ?? -1);

                      const showGhost = visibility.ghost;
                      const showConflict = visibility.conflict;

                      const isStartHandle =
                        visibility.open &&
                        overlapping?.slot.status === "OPEN" &&
                        row === overlapping.startRow;
                      const isEndHandle =
                        visibility.open &&
                        overlapping?.slot.status === "OPEN" &&
                        row === overlapping.endRow - 1;

                      return (
                        <div
                          key={`${dayKey}-${row}`}
                          className={`relative flex h-5 items-center justify-between rounded px-1 text-[10px] ${
                            inResizePreview &&
                            resizePreview?.hasConflict &&
                            showConflict
                              ? "bg-rose-200 text-rose-900"
                              : inResizePreview && showGhost
                                ? "border border-dashed border-emerald-500 bg-emerald-100/80 text-emerald-900"
                                : inSelection &&
                                    dragPreviewConflict &&
                                    showConflict
                                  ? "bg-rose-200 text-rose-900"
                                  : inSelection && showGhost
                                    ? "border border-dashed border-emerald-500 bg-emerald-100/80 text-emerald-900"
                                    : status === "BOOKED"
                                      ? "bg-slate-200 text-slate-500"
                                      : status === "OPEN"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-background text-muted-foreground hover:bg-muted/50"
                          }`}
                          onMouseDown={() => {
                            if (resizeState) return;
                            setDragStartCell({ dayKey, row });
                            setDragHoverCell({ dayKey, row });
                          }}
                          onMouseEnter={() => {
                            if (resizeState && resizeState.dayKey === dayKey) {
                              setResizeHoverRow(row);
                            }
                            if (!dragStartCell || resizeState) return;
                            setDragHoverCell({ dayKey, row });
                          }}
                          onMouseUp={() => {
                            if (resizeState) {
                              completeResize(dayKey);
                              return;
                            }
                            completeWeekDrag(dayKey);
                          }}
                        >
                          <span>{rowLabel(row)}</span>
                          <span>
                            {status === "BOOKED"
                              ? "B"
                              : status === "OPEN"
                                ? "O"
                                : ""}
                          </span>

                          {isStartHandle && overlapping ? (
                            <button
                              type="button"
                              className="absolute left-0 right-0 top-0 h-1 cursor-ns-resize bg-emerald-400/70"
                              aria-label="Resize slot start"
                              onMouseDown={(event) => {
                                event.stopPropagation();
                                setResizeState({
                                  slotId: overlapping.slot.id,
                                  edge: "start",
                                  dayKey,
                                });
                                setResizeHoverRow(row);
                              }}
                              onKeyDown={(event) => {
                                if (
                                  event.key !== "ArrowUp" &&
                                  event.key !== "ArrowDown"
                                ) {
                                  return;
                                }
                                event.preventDefault();
                                nudgeOpenSlot(
                                  overlapping.slot.id,
                                  "start",
                                  dayKey,
                                  event.key === "ArrowUp" ? -1 : 1,
                                );
                              }}
                            />
                          ) : null}
                          {isEndHandle && overlapping ? (
                            <button
                              type="button"
                              className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize bg-emerald-400/70"
                              aria-label="Resize slot end"
                              onMouseDown={(event) => {
                                event.stopPropagation();
                                setResizeState({
                                  slotId: overlapping.slot.id,
                                  edge: "end",
                                  dayKey,
                                });
                                setResizeHoverRow(row);
                              }}
                              onKeyDown={(event) => {
                                if (
                                  event.key !== "ArrowUp" &&
                                  event.key !== "ArrowDown"
                                ) {
                                  return;
                                }
                                event.preventDefault();
                                nudgeOpenSlot(
                                  overlapping.slot.id,
                                  "end",
                                  dayKey,
                                  event.key === "ArrowUp" ? -1 : 1,
                                );
                              }}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <>
            {days.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const daySlots = slotsByDay.get(dayKey) ?? [];

              return (
                <div
                  key={dayKey}
                  className={`min-h-[120px] rounded-lg border border-border p-2 ${
                    dragRangeKeys.has(dayKey) ? "bg-emerald-50/60" : ""
                  }`}
                  onMouseDown={() => {
                    if (!onDragCreateDates) return;
                    setDragStartKey(dayKey);
                    setDragHoverKey(dayKey);
                  }}
                  onMouseEnter={() => {
                    if (!onDragCreateDates || !dragStartKey) return;
                    setDragHoverKey(dayKey);
                  }}
                  onMouseUp={() => {
                    if (!onDragCreateDates || !dragStartKey) return;
                    const keys = Array.from(dragRangeKeys);
                    if (keys.length) {
                      onDragCreateDates(keys.sort());
                    }
                    setDragStartKey(null);
                    setDragHoverKey(null);
                  }}
                >
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {format(day, "EEE d")}
                  </p>
                  <div className="space-y-1">
                    {daySlots.length ? (
                      daySlots
                        .filter((slot) => {
                          if (slot.status === "OPEN") return visibility.open;
                          if (slot.status === "BOOKED")
                            return visibility.booked;
                          return false;
                        })
                        .map((slot) => {
                          const isOpen = slot.status === "OPEN";
                          const selected = slot.id === selectedSlotId;
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={!isOpen || !onSelectSlot}
                              onClick={() => onSelectSlot?.(slot.id)}
                              className={`w-full rounded px-2 py-1 text-left text-[11px] ${
                                !isOpen
                                  ? "cursor-not-allowed bg-slate-100 text-slate-400"
                                  : selected
                                    ? "bg-emerald-100 text-emerald-900"
                                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>
                                  {format(new Date(slot.startAt), "HH:mm")}
                                </span>
                                <span className="text-[10px] uppercase">
                                  {isOpen ? "Open" : slot.status}
                                </span>
                              </div>
                              {slot.viewerName ? (
                                <p className="truncate text-[10px] text-slate-500">
                                  {slot.viewerName}
                                </p>
                              ) : null}
                            </button>
                          );
                        })
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        No slots
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
