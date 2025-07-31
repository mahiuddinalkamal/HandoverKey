import { InactivityMonitorService } from "./inactivity-monitor";

export class JobManager {
  private static instance: JobManager;
  private inactivityMonitor: InactivityMonitorService;
  private isStarted: boolean = false;

  constructor() {
    this.inactivityMonitor = InactivityMonitorService.getInstance();
  }

  static getInstance(): JobManager {
    if (!JobManager.instance) {
      JobManager.instance = new JobManager();
    }
    return JobManager.instance;
  }

  /**
   * Starts all background jobs
   */
  start(): void {
    if (this.isStarted) {
      console.log('JobManager is already started');
      return;
    }

    console.log('Starting JobManager...');
    
    // Start the inactivity monitor
    this.inactivityMonitor.start();
    
    this.isStarted = true;
    console.log('JobManager started successfully');
  }

  /**
   * Stops all background jobs
   */
  stop(): void {
    if (!this.isStarted) {
      console.log('JobManager is not started');
      return;
    }

    console.log('Stopping JobManager...');
    
    // Stop the inactivity monitor
    this.inactivityMonitor.stop();
    
    this.isStarted = false;
    console.log('JobManager stopped successfully');
  }

  /**
   * Gets the health status of all jobs
   */
  async getHealthStatus(): Promise<{
    isHealthy: boolean;
    jobs: {
      inactivityMonitor: {
        isHealthy: boolean;
        stats: unknown;
      };
    };
  }> {
    const inactivityMonitorStats = await this.inactivityMonitor.getStats();
    const inactivityMonitorHealthy = this.inactivityMonitor.isHealthy();

    return {
      isHealthy: inactivityMonitorHealthy,
      jobs: {
        inactivityMonitor: {
          isHealthy: inactivityMonitorHealthy,
          stats: inactivityMonitorStats,
        },
      },
    };
  }

  /**
   * Manually trigger inactivity check for all users
   */
  async triggerInactivityCheck(): Promise<void> {
    console.log('Manually triggering inactivity check...');
    await this.inactivityMonitor.checkAllUsers();
  }

  /**
   * Manually trigger inactivity check for a specific user
   */
  async triggerUserInactivityCheck(userId: string): Promise<void> {
    console.log(`Manually triggering inactivity check for user ${userId}...`);
    await this.inactivityMonitor.checkUserInactivity(userId);
  }
}