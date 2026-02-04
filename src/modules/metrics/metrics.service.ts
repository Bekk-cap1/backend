import { Injectable } from '@nestjs/common';
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

type HttpLabels = {
  method: string;
  route: string;
  status: string;
};

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly enabled: boolean;
  private readonly httpDuration: Histogram<'method' | 'route' | 'status'>;
  private readonly httpTotal: Counter<'method' | 'route' | 'status'>;

  constructor() {
    this.enabled = String(process.env.METRICS_ENABLED ?? 'true') === 'true';

    if (this.enabled) {
      collectDefaultMetrics({ register: this.registry });
    }

    this.httpDuration = new Histogram({
      name: 'http_request_duration_ms',
      help: 'HTTP request duration in ms',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.httpTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });
  }

  isEnabled() {
    return this.enabled;
  }

  observeHttp(labels: HttpLabels, durationMs: number) {
    if (!this.enabled) return;
    this.httpDuration.observe(labels, durationMs);
    this.httpTotal.inc(labels);
  }

  async metrics(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}
