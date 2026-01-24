import { config } from '@/config/env';
import { logger } from '@/utils/logger';

type SmsPayload = {
  to: string;
  message: string;
};

const postJson = async (url: string, payload: Record<string, unknown>) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`SMS provider error: ${response.status} ${errorBody}`.trim());
  }
};

export const sendSms = async ({ to, message }: SmsPayload): Promise<void> => {
  if (config.nodeEnv !== 'production') {
    logger.info(`SMS (dev) to ${to}: ${message}`);
    return;
  }

  if (!config.sms.webhookUrl) {
    throw new Error('SMS_WEBHOOK_URL is not configured');
  }

  await postJson(config.sms.webhookUrl, {
    to,
    message,
    senderId: config.sms.senderId,
  });
};

