/**
 * 🎛️ HYBRID SCRAPER API CONTROLLER
 * 
 * Controller para endpoints específicos do hybrid scraper
 * Integrado com o sistema de dashboard multi-scraper
 */

import { Request, Response } from 'express';
import { getHybridScraperIntegration } from './hybridScraperIntegration';
import { DriverIdProvider } from './src/services/driverIdProvider';

interface BatchResults {
  extraction: any[];
  recharge: Array<{ driverId: string; amount: number; success: boolean }>;
  errors: Array<{ 
    driverId?: string; 
    batch?: number; 
    operation?: string; 
    error: string; 
  }>;
}

export class HybridScraperController {
  private hybridIntegration = getHybridScraperIntegration();
  private driverIdProvider = DriverIdProvider.getInstance();

  /**
   * 🎯 POST /api/hybrid/extract - Extrair dados de motoristas
   */
  public async extractDriversData(req: Request, res: Response): Promise<void> {
    try {
      const { driverIds, useCache = true } = req.body;

      if (!driverIds || !Array.isArray(driverIds)) {
        res.status(400).json({
          success: false,
          error: 'driverIds array is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`🎯 [HybridController] Starting extraction for ${driverIds.length} drivers`);

      const results = await this.hybridIntegration.performExtraction(driverIds);

      res.json({
        success: true,
        data: {
          processed: results.length,
          total: driverIds.length,
          results: results,
          metrics: this.hybridIntegration.getMetrics()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ [HybridController] Error during extraction:', error);
      res.status(500).json({
        success: false,
        error: 'Extraction failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 💰 POST /api/hybrid/recharge - Processar recarga
   */
  public async processRecharge(req: Request, res: Response): Promise<void> {
    try {
      const { driverId, amount } = req.body;

      if (!driverId || !amount) {
        res.status(400).json({
          success: false,
          error: 'driverId and amount are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`💰 [HybridController] Processing recharge: Driver ${driverId}, Amount ${amount}`);

      const success = await this.hybridIntegration.performRecharge(driverId, amount);

      res.json({
        success: success,
        data: {
          driverId,
          amount,
          processed: success,
          metrics: this.hybridIntegration.getMetrics()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ [HybridController] Error during recharge:', error);
      res.status(500).json({
        success: false,
        error: 'Recharge failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🆔 GET /api/hybrid/driver-ids - Obter IDs de motoristas em cache
   */
  public async getDriverIds(req: Request, res: Response): Promise<void> {
    try {
      const { refresh = false } = req.query;

      console.log(`🆔 [HybridController] Getting driver IDs (refresh: ${refresh})`);

      const driverInfos = await this.driverIdProvider.getAllDriverIds(refresh === 'true');
      const driverIds = driverInfos.map(info => info.id);

      res.json({
        success: true,
        data: {
          driverIds,
          total: driverIds.length,
          cached: !refresh,
          stats: this.driverIdProvider.getStats()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ [HybridController] Error getting driver IDs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get driver IDs',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 📊 GET /api/hybrid/status - Status do hybrid scraper
   */
  public async getHybridStatus(req: Request, res: Response): Promise<void> {
    try {
      const metrics = this.hybridIntegration.getMetrics();
      const scraperId = this.hybridIntegration.getScraperId();
      const scraperName = this.hybridIntegration.getScraperName();
      const driverStats = this.driverIdProvider.getStats();

      res.json({
        success: true,
        data: {
          scraperId,
          scraperName,
          metrics,
          cache: {
            driverIds: driverStats.cacheSize,
            expiry: driverStats.cacheExpiry,
            valid: driverStats.cacheValid
          },
          environment: {
            ridesUsername: process.env.RIDES_USERNAME,
            dashboardUrl: process.env.DASHBOARD_URL,
            headlessMode: process.env.HEADLESS_MODE
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ [HybridController] Error getting hybrid status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get hybrid status',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🔄 POST /api/hybrid/refresh-cache - Atualizar cache de IDs
   */
  public async refreshDriverIdsCache(req: Request, res: Response): Promise<void> {
    try {
      console.log(`🔄 [HybridController] Refreshing driver IDs cache`);

      // Clear cache and get fresh data
      this.driverIdProvider.clearCache();
      const driverInfos = await this.driverIdProvider.getAllDriverIds(true);
      const driverIds = driverInfos.map(info => info.id);

      res.json({
        success: true,
        data: {
          driverIds,
          total: driverIds.length,
          refreshed: true,
          stats: this.driverIdProvider.getStats()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ [HybridController] Error refreshing cache:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh cache',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🎮 POST /api/hybrid/batch-operation - Operação em lote (extração + recarga)
   */
  public async batchOperation(req: Request, res: Response): Promise<void> {
    try {
      const { 
        operation = 'extract', // 'extract' | 'recharge' | 'both'
        driverIds = [],
        rechargeAmount = 0,
        batchSize = 10
      } = req.body;

      if (!Array.isArray(driverIds) || driverIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'driverIds array is required and cannot be empty',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`🎮 [HybridController] Batch operation: ${operation} for ${driverIds.length} drivers`);

      const results: BatchResults = {
        extraction: [],
        recharge: [],
        errors: []
      };

      // Processar em lotes
      for (let i = 0; i < driverIds.length; i += batchSize) {
        const batch = driverIds.slice(i, i + batchSize);
        console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} drivers)`);

        try {
          // Extração
          if (operation === 'extract' || operation === 'both') {
            const extractionResults = await this.hybridIntegration.performExtraction(batch);
            results.extraction.push(...extractionResults);
          }

          // Recarga
          if (operation === 'recharge' || operation === 'both') {
            for (const driverId of batch) {
              try {
                const rechargeSuccess = await this.hybridIntegration.performRecharge(driverId, rechargeAmount);
                results.recharge.push({ driverId, amount: rechargeAmount, success: rechargeSuccess });
              } catch (error) {
                results.errors.push({ driverId, operation: 'recharge', error: error.message });
              }
            }
          }

          // Delay entre lotes
          if (i + batchSize < driverIds.length) {
            await this.delay(5000); // 5s entre lotes
          }

        } catch (error) {
          console.error(`❌ Error processing batch ${Math.floor(i / batchSize) + 1}:`, error);
          results.errors.push({ batch: Math.floor(i / batchSize) + 1, error: error.message });
        }
      }

      res.json({
        success: true,
        data: {
          operation,
          processed: driverIds.length,
          results,
          metrics: this.hybridIntegration.getMetrics(),
          summary: {
            extracted: results.extraction.length,
            recharged: results.recharge.filter(r => r.success).length,
            errors: results.errors.length
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ [HybridController] Error during batch operation:', error);
      res.status(500).json({
        success: false,
        error: 'Batch operation failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * ⏱️ Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
