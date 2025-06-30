const cron = require('node-cron');
const cleanupService = require('./cleanup.service');
const prisma = require('../lib/prisma');



class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Start all scheduled tasks
   */
  start() {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }

    console.log('Starting GhostCDN scheduler service...');

    // Guest upload cleanup - runs every day at 2:00 AM
    this.scheduleGuestCleanup();
    
    // Health monitoring - runs every 5 minutes
    this.scheduleHealthCheck();
    
    // Log cleanup - runs every week on Sunday at 3:00 AM
    this.scheduleLogCleanup();

    this.isRunning = true;
    console.log('Scheduler service started successfully');
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    if (!this.isRunning) {
      console.log('Scheduler is not running');
      return;
    }

    console.log('Stopping scheduler service...');
    
    for (const [name, task] of this.jobs) {
      task.stop();
      console.log(`Stopped scheduled task: ${name}`);
    }
    
    this.jobs.clear();
    this.isRunning = false;
    console.log('Scheduler service stopped');
  }

  /**
   * Schedule guest upload cleanup
   * Runs daily at 2:00 AM
   */
  scheduleGuestCleanup() {
    const task = cron.schedule('0 2 * * *', async () => {
      try {
        console.log('Running scheduled guest upload cleanup...');
        const result = await cleanupService.deleteExpiredGuestUploads();
        console.log(`Scheduled cleanup completed: ${result.deletedCount} files deleted, ${result.errorCount} errors`);
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
        
        // Log the error
        await prisma.systemLog.create({
          data: {
            level: 'ERROR',
            message: 'Scheduled guest upload cleanup failed',
            source: 'scheduler',
            metadata: JSON.stringify({
              error: error.message,
              task: 'guest-cleanup',
              scheduled: true
            })
          }
        });
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('guest-cleanup', task);
    task.start();
    console.log('Scheduled guest upload cleanup: Daily at 2:00 AM UTC');
  }

  /**
   * Schedule health checks
   * Runs every 5 minutes
   */
  scheduleHealthCheck() {
    const task = cron.schedule('*/5 * * * *', async () => {
      try {
        // This would trigger our existing health check endpoints
        // For now, we'll just log that it's running
        console.log('Running scheduled health check...');
        
        // You could add health check logic here or call existing health endpoints
        await this.updateHealthStatus();
      } catch (error) {
        console.error('Scheduled health check failed:', error);
        
        await prisma.systemLog.create({
          data: {
            level: 'ERROR',
            message: 'Scheduled health check failed',
            source: 'scheduler',
            metadata: JSON.stringify({
              error: error.message,
              task: 'health-check',
              scheduled: true
            })
          }
        });
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('health-check', task);
    task.start();
    console.log('Scheduled health checks: Every 5 minutes');
  }

  /**
   * Schedule log cleanup
   * Runs weekly on Sunday at 3:00 AM
   */
  scheduleLogCleanup() {
    const task = cron.schedule('0 3 * * 0', async () => {
      try {
        console.log('Running scheduled log cleanup...');
        
        // Clean up logs older than 90 days
        const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const deletedCount = await prisma.systemLog.deleteMany({
          where: {
            createdAt: { lt: cutoffDate }
          }
        });

        console.log(`Scheduled log cleanup completed: ${deletedCount.count} logs deleted`);
        
        // Log the cleanup
        await prisma.systemLog.create({
          data: {
            level: 'INFO',
            message: `Scheduled log cleanup completed: ${deletedCount.count} logs deleted`,
            source: 'scheduler',
            metadata: JSON.stringify({
              deletedCount: deletedCount.count,
              cutoffDays: 90,
              task: 'log-cleanup',
              scheduled: true
            })
          }
        });
      } catch (error) {
        console.error('Scheduled log cleanup failed:', error);
        
        await prisma.systemLog.create({
          data: {
            level: 'ERROR',
            message: 'Scheduled log cleanup failed',
            source: 'scheduler',
            metadata: JSON.stringify({
              error: error.message,
              task: 'log-cleanup',
              scheduled: true
            })
          }
        });
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('log-cleanup', task);
    task.start();
    console.log('Scheduled log cleanup: Weekly on Sunday at 3:00 AM UTC');
  }

  /**
   * Update health status (placeholder for health monitoring)
   */
  async updateHealthStatus() {
    try {
      // Basic health status update
      const now = new Date();
      
      // Update API server health
      await prisma.systemHealth.upsert({
        where: { service: 'api' },
        update: {
          status: 'healthy',
          uptime: 99.9,
          lastCheck: now,
          responseTime: Math.floor(Math.random() * 50) + 10, // Simulate response time
          metadata: JSON.stringify({
            version: process.env.npm_package_version || '1.0.0',
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime()
          })
        },
        create: {
          service: 'api',
          status: 'healthy',
          uptime: 99.9,
          lastCheck: now,
          responseTime: Math.floor(Math.random() * 50) + 10,
          metadata: JSON.stringify({
            version: process.env.npm_package_version || '1.0.0',
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime()
          })
        }
      });

      // You could add more health checks here for database, storage, etc.
    } catch (error) {
      console.error('Health status update failed:', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      jobCount: this.jobs.size,
      uptime: this.isRunning ? process.uptime() : 0
    };
  }

  /**
   * Manually trigger a specific job
   */
  async triggerJob(jobName) {
    if (!this.jobs.has(jobName)) {
      throw new Error(`Job '${jobName}' not found`);
    }

    console.log(`Manually triggering job: ${jobName}`);
    
    switch (jobName) {
      case 'guest-cleanup':
        return await cleanupService.deleteExpiredGuestUploads();
      case 'health-check':
        await this.updateHealthStatus();
        return { message: 'Health check completed' };
      case 'log-cleanup':
        const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const result = await prisma.systemLog.deleteMany({
          where: { createdAt: { lt: cutoffDate } }
        });
        return { deletedCount: result.count };
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }
}

module.exports = new SchedulerService(); 