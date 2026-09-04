/** Event types only. Never attach names, HKID, amounts, creditors, or free text. */
export const EVENT_TYPES = [
  "app_open",
  "assessment_started",
  "assessment_done",
  "pack_created",
  "door_chosen",
  "share_tapped",
  "status_tapped",
  "sunday_started",
  "sunday_triage_done",
  "sunday_pack_created",
  "sunday_door_chosen",
  "sunday_share_tapped",
];

const ALLOWED = new Set(EVENT_TYPES);

export function isAllowedEvent(type) {
  return ALLOWED.has(type);
}

export function makeEvent(type, extraEnum) {
  if (!ALLOWED.has(type)) {
    throw new Error("unknown_event");
  }
  const event = { type, at: Date.now() };
  if (extraEnum != null) {
    if (typeof extraEnum !== "string" || extraEnum.length > 32) {
      throw new Error("enum_only");
    }
    event.enum = extraEnum;
  }
  return event;
}

export function countEvents(events) {
  const counts = Object.fromEntries(EVENT_TYPES.map((type) => [type, 0]));
  for (const event of events) {
    if (ALLOWED.has(event.type)) counts[event.type] += 1;
  }
  return counts;
}
