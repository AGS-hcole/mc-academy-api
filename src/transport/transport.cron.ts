import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TransportTemplatesService } from './transport-templates.service';
import { TransportOccurrencesService } from './transport-occurrences.service';
import { DateTime } from 'luxon';

const tz = 'Europe/Paris';

@Injectable()
export class TransportCron {
  private readonly logger = new Logger(TransportCron.name);

  constructor(
    private readonly templatesService: TransportTemplatesService,
    private readonly occurrencesService: TransportOccurrencesService,
  ) {}

  /**
   * Génération automatique des occurrences de transport
   * Tous les jours à 00:30 (heure Paris)
   * Génère les occurrences pour les 30 prochains jours
   */
  @Cron('30 0 * * *', { timeZone: tz })
  async generateTransportOccurrences() {
    this.logger.log('⏰ Génération automatique des occurrences de transport');

    try {
      // Récupérer tous les templates actifs
      const activeTemplates = await this.templatesService.findAll(true);

      if (activeTemplates.length === 0) {
        this.logger.warn('Aucun template de transport actif trouvé');
        return;
      }

      this.logger.log(
        `${activeTemplates.length} template(s) actif(s) trouvé(s)`,
      );

      // Calculer les dates (aujourd'hui + 30 jours)
      const now = DateTime.now().setZone(tz);
      const fromDate = now.toFormat('yyyy-MM-dd');
      const toDate = now.plus({ days: 30 }).toFormat('yyyy-MM-dd');

      let totalGenerated = 0;

      // Générer les occurrences pour chaque template
      for (const template of activeTemplates) {
        try {
          this.logger.log(
            `Génération des occurrences pour le template: ${template.name} (${template.id})`,
          );

          const result = await this.occurrencesService.generateForTemplate(
            template.id,
            { fromDate, toDate },
          );

          totalGenerated += result.generated;

          this.logger.log(
            `  ✅ ${result.generated} occurrence(s) générée(s) pour "${template.name}"`,
          );
        } catch (error) {
          this.logger.error(
            `  ❌ Erreur lors de la génération pour le template "${template.name}": ${error.message}`,
            error.stack,
          );
          // Continue avec les autres templates même en cas d'erreur
        }
      }

      this.logger.log(
        `✅ Génération terminée: ${totalGenerated} occurrence(s) au total`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors de la génération automatique des occurrences: ${error.message}`,
        error.stack,
      );
    }
  }
}
