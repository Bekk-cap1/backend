import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';

@Processor('domain-events')
export class DomainEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(DomainEventsProcessor.name);

  async process(job: any) {
    // job.name == topic
    // job.data == payload
    this.logger.log(`EVENT ${job.name} outboxId=${job.data?.outboxId}`);

    // Здесь в дальнейшем:
    // - отправка уведомлений
    // - websocket push
    // - email/sms
    // - интеграции
    // - и т.д.
  }
}
