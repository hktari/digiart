export type CallbackAction =
  | "draft"
  | "contacted"
  | "irrelevant"
  | "regenerate";

const ACTIONS: readonly CallbackAction[] = [
  "draft",
  "contacted",
  "irrelevant",
  "regenerate",
];

export interface ParsedCallback {
  action: CallbackAction;
  leadId: string;
  cardMessageId?: number;
}

/**
 * `<action>:<leadId>[:<cardMessageId>]`, kept under Telegram's 64-byte
 * callback_data limit. The optional third field lets a button on a draft reply
 * point back at the card it belongs to.
 */
export function encodeCallback(
  action: CallbackAction,
  leadId: string,
  cardMessageId?: number,
): string {
  return cardMessageId === undefined
    ? `${action}:${leadId}`
    : `${action}:${leadId}:${cardMessageId}`;
}

export function parseCallback(data: string): ParsedCallback | null {
  const parts = data.split(":");
  if (parts.length < 2 || parts.length > 3) return null;

  const [action, leadId, rawMessageId] = parts;
  if (!ACTIONS.includes(action as CallbackAction)) return null;
  if (!leadId) return null;

  let cardMessageId: number | undefined;
  if (rawMessageId !== undefined) {
    cardMessageId = Number(rawMessageId);
    if (!Number.isInteger(cardMessageId)) return null;
  }

  return { action: action as CallbackAction, leadId, cardMessageId };
}
