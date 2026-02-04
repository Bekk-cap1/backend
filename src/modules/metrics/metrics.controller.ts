import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@Controller()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Public()
  @Get('metrics')
  @ApiOperation({ summary: 'Prometheus metrics' })
  async metricsEndpoint(@Res() res: Response) {
    const body = await this.metrics.metrics();
    res.setHeader('Content-Type', this.metrics.contentType());
    res.status(200).send(body);
  }
}
