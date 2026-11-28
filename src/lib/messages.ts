/** Shared bits for the messaging system (chat page, composer, send API). */

/** Stored as the text of a message that is only photos, so previews, pushes and emails read naturally. */
export const PHOTO_ONLY_BODY = "📷 Photo";

/** Most photos one message can carry. */
export const MAX_MESSAGE_PHOTOS = 4;

/** One-tap starters. Tapping fills the box so the member can still edit before sending. */
export const QUICK_REPLIES = {
  buyer: ["Is this still available?", "What's your best price?", "Can you send more photos?", "When could I pick it up?"],
  seller: ["Yes, it's still available!", "Sorry, it's sold.", "When works for you to pick up?", "The price is firm."],
} as const;

/**
 * Payment and shipping words that show up in scams. Plenty of honest hobbyists
 * use Venmo or Zelle too, so this only adds a gentle reminder, it never blocks.
 */
const SCAM_WORDS =
  /\b(zelle|cash\s?app|venmo|gift\s?cards?|western\s?union|money\s?gram|wire\s?(transfer|money)|paypal\s?friends|deposit|ship(ping)?\s?(it|them|the fish)?\s?(first|to you)|crypto|bitcoin)\b/i;

export function looksLikePaymentTalk(text: string): boolean {
  return SCAM_WORDS.test(text);
}
