import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TimeService } from '../time/time.service';
import { TransportRunsService } from './transport-runs.service';

const tz = 'Europe/Paris';

@Injectable()
export class TransportRunsCron {
  private readonly logger = new Logger(TransportRunsCron.name);

  constructor(
    private prisma: PrismaService,
    private timeService: TimeService,
    private transportRunsService: TransportRunsService,
  ) {}

  /**
   * Automatically generate transport runs after the planning window closes
   * Runs every Sunday at 23:59 (Europe/Paris)
   */
  @Cron('59 23 * * 0', { timeZone: tz })
  async autoGenerateRuns() {
    this.logger.log(
      '⏰ Auto-generating transport runs after planning window close',
    );

    try {
      // Get app settings
      const settings = await this.prisma.appSetting.findUnique({
        where: { id: 1 },
      });

      if (!settings) {
        this.logger.warn('App settings not found, skipping auto-generation');
        return;
      }

      // This cron is set to run at the close time of the planning window
      // Generate runs for the next week
      const now = new Date();
      const nextWeekStart = this.timeService.getNextIsoWeekStart(now);
      const weekStartDate = this.timeService.formatAsLocalDate(nextWeekStart);

      this.logger.log(`Generating runs for week starting ${weekStartDate}`);

      const result = await this.transportRunsService.generateRunsForWeek({
        weekStart: weekStartDate,
      });

      this.logger.log(
        `✅ Auto-generation complete: ${result.runsCreated} runs created`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error during auto-generation: ${error.message}`,
        error.stack,
      );
    }
  }
}
