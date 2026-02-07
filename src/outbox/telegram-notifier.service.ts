import { Injectable, Logger } from '@nestjs/common';

type TelegramInput = {
  userId: string;
  title: string;
  message?: string | null;
};

@Injectable()
export class TelegramNotifierService {
  private readonly logger = new Logger(TelegramNotifierService.name);

  async send(input: TelegramInput) {
    const enabled = String(process.env.TELEGRAM_ENABLED ?? 'false') === 'true';
    if (!enabled) return { sent: false, mock: true };

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) {
      this.logger.warn('Telegram enabled but token/chatId not configured');
      return { sent: false };
    }

    const text = `[${input.userId}] ${input.title}\n${input.message ?? ''}`;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      this.logger.warn(`Telegram send failed: ${res.status}`);
      return { sent: false };
    }
    return { sent: true };
  }
}
