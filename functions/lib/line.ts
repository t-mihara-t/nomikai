// LINE Messaging API helper for Cloudflare Pages Functions
// Requires LINE_CHANNEL_ACCESS_TOKEN environment variable (secret)

const LINE_API_BASE = 'https://api.line.me/v2/bot';

export interface LineEnv {
  LINE_CHANNEL_ACCESS_TOKEN: string;
}

/**
 * Send a push message to a LINE user
 */
export async function linePushMessage(
  accessToken: string,
  userId: string,
  messages: LineMessage[]
): Promise<boolean> {
  if (!accessToken || !userId) return false;

  try {
    const res = await fetch(`${LINE_API_BASE}/message/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type LineMessage = LineTextMessage | LineFlexMessage;

interface LineTextMessage {
  type: 'text';
  text: string;
}

interface LineFlexMessage {
  type: 'flex';
  altText: string;
  contents: Record<string, unknown>;
}

/**
 * Build the immediate arrival notification message (Flex Message with button)
 */
export function buildArrivalNotification(
  participantName: string,
  etaMinutes: number | null,
  userMessage: string | null,
  eventName: string,
  eventUrl: string
): LineMessage[] {
  const etaText = etaMinutes != null ? `約${etaMinutes}分後に到着予定` : '向かっています';

  return [
    {
      type: 'flex',
      altText: `【NOMILIVE速報】${participantName}さんが遅れて参加します`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'NOMILIVE速報',
              weight: 'bold',
              color: '#FF6B35',
              size: 'sm',
            },
          ],
          backgroundColor: '#FFF3E0',
          paddingAll: '12px',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `${participantName}さんが遅れて参加します`,
              weight: 'bold',
              size: 'lg',
              wrap: true,
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              spacing: 'sm',
              contents: [
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    { type: 'text', text: '到着', color: '#aaaaaa', size: 'sm', flex: 2 },
                    { type: 'text', text: etaText, wrap: true, size: 'sm', flex: 5 },
                  ],
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    { type: 'text', text: 'イベント', color: '#aaaaaa', size: 'sm', flex: 2 },
                    { type: 'text', text: eventName, wrap: true, size: 'sm', flex: 5 },
                  ],
                },
                ...(userMessage
                  ? [
                      {
                        type: 'box' as const,
                        layout: 'baseline' as const,
                        spacing: 'sm' as const,
                        contents: [
                          { type: 'text' as const, text: 'メッセージ', color: '#aaaaaa', size: 'sm' as const, flex: 2 },
                          { type: 'text' as const, text: userMessage, wrap: true, size: 'sm' as const, flex: 5 },
                        ],
                      },
                    ]
                  : []),
              ],
            },
            {
              type: 'text',
              text: '温かく見守ってください！',
              size: 'sm',
              color: '#888888',
              margin: 'lg',
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#FF6B35',
              action: {
                type: 'uri',
                label: '当日ページを開く',
                uri: eventUrl,
              },
            },
          ],
          paddingAll: '12px',
        },
      },
    },
  ];
}

/**
 * Build the 5-min-before arrival reminder message
 */
export function buildReminderNotification(
  participantName: string,
  eventName: string,
  eventUrl: string
): LineMessage[] {
  return [
    {
      type: 'flex',
      altText: `【重要】${participantName}さんがあと5分で到着します！`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '到着まもなく！',
              weight: 'bold',
              color: '#D32F2F',
              size: 'sm',
            },
          ],
          backgroundColor: '#FFEBEE',
          paddingAll: '12px',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `${participantName}さんがあと5分で到着します！`,
              weight: 'bold',
              size: 'lg',
              wrap: true,
            },
            {
              type: 'text',
              text: 'そろそろ「最初の一杯」を注文しておきませんか？',
              size: 'sm',
              color: '#666666',
              margin: 'md',
              wrap: true,
            },
            {
              type: 'text',
              text: eventName,
              size: 'xs',
              color: '#aaaaaa',
              margin: 'md',
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#D32F2F',
              action: {
                type: 'uri',
                label: '了解！当日ページへ',
                uri: eventUrl,
              },
            },
          ],
          paddingAll: '12px',
        },
      },
    },
  ];
}
