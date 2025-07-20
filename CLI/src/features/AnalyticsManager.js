const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const axios = require('axios');
const Table = require('cli-table3');

const { 
  API_BASE_URL, 
  ERROR_MESSAGES
} = require('../config/constants');

const { 
  showError, 
  showSuccess, 
  showWarning, 
  showInfo,
  formatBytes,
  formatDate,
  createProgressBar
} = require('../utils/display');

class AnalyticsManager {
  constructor(authManager) {
    this.authManager = authManager;
  }

  /**
   * Handle analytics and statistics
   */
  async handleAnalytics() {
    try {
      console.log(chalk.cyan.bold('📊 Analytics & Statistics\n'));

      while (true) {
        const action = await this.showAnalyticsMenu();
        
        if (action === 'back') {
          break;
        }

        await this.handleAnalyticsAction(action);
      }

    } catch (error) {
      showError(`Analytics failed: ${error.message}`);
      
      if (process.env.NODE_ENV === 'development') {
        console.error(chalk.dim(error.stack));
      }
    }
  }

  /**
   * Show analytics menu
   */
  async showAnalyticsMenu() {
    const options = [
      {
        name: '📈 Account Overview',
        value: 'overview',
        description: 'View your account statistics and usage'
      },
      {
        name: '📊 Usage Analytics',
        value: 'usage',
        description: 'Detailed usage statistics and trends'
      },
      {
        name: '🔥 Popular Files',
        value: 'popular',
        description: 'Most accessed and downloaded files'
      },
      {
        name: '📅 Activity Timeline',
        value: 'timeline',
        description: 'Recent uploads and activity'
      },
      {
        name: '💾 Storage Analysis',
        value: 'storage',
        description: 'Storage usage breakdown by file type'
      },
      {
        name: '🌍 Geographic Stats',
        value: 'geographic',
        description: 'Access statistics by location'
      },
      {
        name: '📋 Export Report',
        value: 'export',
        description: 'Export analytics data to file'
      },
      {
        name: '🔙 Back to main menu',
        value: 'back',
        description: 'Return to the main menu'
      }
    ];

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What analytics would you like to view?',
        choices: options.map(option => ({
          name: `${option.name}\n  ${chalk.dim(option.description)}`,
          value: option.value,
          short: option.name
        })),
        pageSize: 10
      }
    ]);

    return answer.action;
  }

  /**
   * Handle analytics action
   */
  async handleAnalyticsAction(action) {
    switch (action) {
      case 'overview':
        await this.showAccountOverview();
        break;
      case 'usage':
        await this.showUsageAnalytics();
        break;
      case 'popular':
        await this.showPopularFiles();
        break;
      case 'timeline':
        await this.showActivityTimeline();
        break;
      case 'storage':
        await this.showStorageAnalysis();
        break;
      case 'geographic':
        await this.showGeographicStats();
        break;
      case 'export':
        await this.exportAnalyticsReport();
        break;
    }

    // Wait for user to continue
    if (action !== 'back') {
      await inquirer.prompt([
        {
          type: 'input',
          name: 'continue',
          message: 'Press Enter to continue...',
          default: ''
        }
      ]);
    }
  }

  /**
   * Show account overview statistics
   */
  async showAccountOverview() {
    const spinner = ora('Loading account overview...').start();

    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/overview`, {
        headers: {
          'Authorization': `Bearer ${this.authManager.getApiKey()}`
        },
        timeout: 30000
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load overview');
      }

      const data = response.data.data;
      spinner.succeed('Account overview loaded');

      console.log(chalk.cyan('\n📈 Account Overview:\n'));

      // Main stats table
      const statsTable = new Table({
        head: ['Metric', 'Value'],
        colWidths: [25, 20],
        style: {
          head: ['cyan'],
          border: ['dim']
        }
      });

      statsTable.push(
        ['Total Files', data.totalFiles.toLocaleString()],
        ['Total Storage Used', formatBytes(data.totalStorage)],
        ['Total Downloads', data.totalDownloads.toLocaleString()],
        ['Total Bandwidth', formatBytes(data.totalBandwidth)],
        ['Account Created', formatDate(data.accountCreated)],
        ['Last Upload', data.lastUpload ? formatDate(data.lastUpload) : 'Never']
      );

      console.log(statsTable.toString());

      // Storage usage progress bar
      if (data.storageLimit) {
        const usagePercent = (data.totalStorage / data.storageLimit) * 100;
        console.log(chalk.cyan('\n💾 Storage Usage:'));
        console.log(createProgressBar(usagePercent, 40));
        console.log(`${formatBytes(data.totalStorage)} / ${formatBytes(data.storageLimit)} (${usagePercent.toFixed(1)}%)`);
      }

      // Recent activity summary
      if (data.recentActivity && data.recentActivity.length > 0) {
        console.log(chalk.cyan('\n🕒 Recent Activity:'));
        data.recentActivity.slice(0, 5).forEach(activity => {
          const icon = activity.type === 'upload' ? '📤' : '📥';
          console.log(`${icon} ${activity.description} - ${formatDate(activity.timestamp)}`);
        });
      }

    } catch (error) {
      spinner.fail('Failed to load account overview');
      this.handleAnalyticsError(error);
    }
  }

  /**
   * Show detailed usage analytics
   */
  async showUsageAnalytics() {
    const spinner = ora('Loading usage analytics...').start();

    try {
      // Get time period from user
      const periodAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'period',
          message: 'Select time period:',
          choices: [
            { name: 'Last 7 days', value: '7d' },
            { name: 'Last 30 days', value: '30d' },
            { name: 'Last 90 days', value: '90d' },
            { name: 'All time', value: 'all' }
          ]
        }
      ]);

      const response = await axios.get(`${API_BASE_URL}/analytics/usage`, {
        headers: {
          'Authorization': `Bearer ${this.authManager.getApiKey()}`
        },
        params: {
          period: periodAnswer.period
        },
        timeout: 30000
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load usage analytics');
      }

      const data = response.data.data;
      spinner.succeed('Usage analytics loaded');

      console.log(chalk.cyan(`\n📊 Usage Analytics (${this.getPeriodLabel(periodAnswer.period)}):\n`));

      // Usage metrics table
      const metricsTable = new Table({
        head: ['Metric', 'Count', 'Change'],
        colWidths: [20, 15, 15],
        style: {
          head: ['cyan'],
          border: ['dim']
        }
      });

      metricsTable.push(
        ['Uploads', data.uploads.toLocaleString(), this.formatChange(data.uploadsChange)],
        ['Downloads', data.downloads.toLocaleString(), this.formatChange(data.downloadsChange)],
        ['Views', data.views.toLocaleString(), this.formatChange(data.viewsChange)],
        ['Bandwidth', formatBytes(data.bandwidth), this.formatChange(data.bandwidthChange)]
      );

      console.log(metricsTable.toString());

      // Top file types
      if (data.topFileTypes && data.topFileTypes.length > 0) {
        console.log(chalk.cyan('\n📁 Top File Types:'));
        const fileTypesTable = new Table({
          head: ['Type', 'Count', 'Size'],
          style: {
            head: ['cyan'],
            border: ['dim']
          }
        });

        data.topFileTypes.forEach(type => {
          fileTypesTable.push([
            type.fileType,
            type.count.toLocaleString(),
            formatBytes(type.totalSize)
          ]);
        });

        console.log(fileTypesTable.toString());
      }

      // Daily breakdown (if available)
      if (data.dailyStats && data.dailyStats.length > 0) {
        console.log(chalk.cyan('\n📅 Daily Breakdown:'));
        const dailyTable = new Table({
          head: ['Date', 'Uploads', 'Downloads', 'Bandwidth'],
          style: {
            head: ['cyan'],
            border: ['dim']
          }
        });

        data.dailyStats.slice(-7).forEach(day => {
          dailyTable.push([
            formatDate(day.date, 'short'),
            day.uploads.toLocaleString(),
            day.downloads.toLocaleString(),
            formatBytes(day.bandwidth)
          ]);
        });

        console.log(dailyTable.toString());
      }

    } catch (error) {
      spinner.fail('Failed to load usage analytics');
      this.handleAnalyticsError(error);
    }
  }

  /**
   * Show popular files
   */
  async showPopularFiles() {
    const spinner = ora('Loading popular files...').start();

    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/popular-files`, {
        headers: {
          'Authorization': `Bearer ${this.authManager.getApiKey()}`
        },
        params: {
          limit: 20
        },
        timeout: 30000
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load popular files');
      }

      const files = response.data.data;
      spinner.succeed('Popular files loaded');

      if (files.length === 0) {
        showInfo('No file access data available yet.');
        return;
      }

      console.log(chalk.cyan('\n🔥 Most Popular Files:\n'));

      const popularTable = new Table({
        head: ['Rank', 'File Name', 'Downloads', 'Views', 'Size'],
        colWidths: [6, 30, 12, 10, 12],
        style: {
          head: ['cyan'],
          border: ['dim']
        }
      });

      files.forEach((file, index) => {
        popularTable.push([
          `#${index + 1}`,
          file.originalName.length > 25 ? file.originalName.substring(0, 25) + '...' : file.originalName,
          file.downloads.toLocaleString(),
          file.views.toLocaleString(),
          formatBytes(file.fileSize)
        ]);
      });

      console.log(popularTable.toString());

      // Show top performer details
      if (files.length > 0) {
        const topFile = files[0];
        console.log(chalk.yellow(`\n🏆 Top Performer: ${topFile.originalName}`));
        console.log(`   Downloads: ${topFile.downloads.toLocaleString()}`);
        console.log(`   Views: ${topFile.views.toLocaleString()}`);
        console.log(`   Upload Date: ${formatDate(topFile.createdAt)}`);
      }

    } catch (error) {
      spinner.fail('Failed to load popular files');
      this.handleAnalyticsError(error);
    }
  }

  /**
   * Show activity timeline
   */
  async showActivityTimeline() {
    const spinner = ora('Loading activity timeline...').start();

    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/timeline`, {
        headers: {
          'Authorization': `Bearer ${this.authManager.getApiKey()}`
        },
        params: {
          limit: 50
        },
        timeout: 30000
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load timeline');
      }

      const activities = response.data.data;
      spinner.succeed('Activity timeline loaded');

      if (activities.length === 0) {
        showInfo('No recent activity found.');
        return;
      }

      console.log(chalk.cyan('\n📅 Recent Activity Timeline:\n'));

      activities.forEach(activity => {
        const icon = this.getActivityIcon(activity.type);
        const timeAgo = this.getTimeAgo(activity.timestamp);
        
        console.log(`${icon} ${chalk.white(activity.description)}`);
        console.log(`   ${chalk.dim(formatDate(activity.timestamp))} (${timeAgo})`);
        
        if (activity.metadata) {
          Object.entries(activity.metadata).forEach(([key, value]) => {
            console.log(`   ${chalk.dim(`${key}: ${value}`)}`);
          });
        }
        console.log();
      });

    } catch (error) {
      spinner.fail('Failed to load activity timeline');
      this.handleAnalyticsError(error);
    }
  }

  /**
   * Show storage analysis
   */
  async showStorageAnalysis() {
    const spinner = ora('Analyzing storage usage...').start();

    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/storage`, {
        headers: {
          'Authorization': `Bearer ${this.authManager.getApiKey()}`
        },
        timeout: 30000
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load storage analysis');
      }

      const data = response.data.data;
      spinner.succeed('Storage analysis complete');

      console.log(chalk.cyan('\n💾 Storage Analysis:\n'));

      // Storage by file type
      if (data.byFileType && data.byFileType.length > 0) {
        console.log(chalk.cyan('📊 Storage by File Type:'));
        
        const storageTable = new Table({
          head: ['File Type', 'Files', 'Total Size', '% of Storage'],
          style: {
            head: ['cyan'],
            border: ['dim']
          }
        });

        data.byFileType.forEach(type => {
          const percentage = ((type.totalSize / data.totalStorage) * 100).toFixed(1);
          storageTable.push([
            type.fileType,
            type.count.toLocaleString(),
            formatBytes(type.totalSize),
            `${percentage}%`
          ]);
        });

        console.log(storageTable.toString());
      }

      // Largest files
      if (data.largestFiles && data.largestFiles.length > 0) {
        console.log(chalk.cyan('\n📏 Largest Files:'));
        
        const largestTable = new Table({
          head: ['File Name', 'Size', 'Type', 'Uploaded'],
          colWidths: [30, 12, 15, 12],
          style: {
            head: ['cyan'],
            border: ['dim']
          }
        });

        data.largestFiles.forEach(file => {
          largestTable.push([
            file.originalName.length > 25 ? file.originalName.substring(0, 25) + '...' : file.originalName,
            formatBytes(file.fileSize),
            file.fileType.split('/')[1] || 'unknown',
            formatDate(file.createdAt, 'short')
          ]);
        });

        console.log(largestTable.toString());
      }

      // Storage optimization suggestions
      if (data.suggestions && data.suggestions.length > 0) {
        console.log(chalk.yellow('\n💡 Optimization Suggestions:'));
        data.suggestions.forEach(suggestion => {
          console.log(`   • ${suggestion}`);
        });
      }

    } catch (error) {
      spinner.fail('Failed to analyze storage');
      this.handleAnalyticsError(error);
    }
  }

  /**
   * Show geographic statistics
   */
  async showGeographicStats() {
    const spinner = ora('Loading geographic statistics...').start();

    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/geographic`, {
        headers: {
          'Authorization': `Bearer ${this.authManager.getApiKey()}`
        },
        timeout: 30000
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to load geographic stats');
      }

      const data = response.data.data;
      spinner.succeed('Geographic statistics loaded');

      if (!data.countries || data.countries.length === 0) {
        showInfo('No geographic data available yet.');
        return;
      }

      console.log(chalk.cyan('\n🌍 Geographic Statistics:\n'));

      // Top countries
      console.log(chalk.cyan('🏴 Top Countries by Access:'));
      const countriesTable = new Table({
        head: ['Country', 'Requests', 'Bandwidth', '% of Total'],
        style: {
          head: ['cyan'],
          border: ['dim']
        }
      });

      data.countries.forEach(country => {
        const percentage = ((country.requests / data.totalRequests) * 100).toFixed(1);
        countriesTable.push([
          `${country.flag} ${country.name}`,
          country.requests.toLocaleString(),
          formatBytes(country.bandwidth),
          `${percentage}%`
        ]);
      });

      console.log(countriesTable.toString());

      // Summary stats
      console.log(chalk.cyan('\n📊 Geographic Summary:'));
      console.log(`Total Countries: ${chalk.white(data.totalCountries)}`);
      console.log(`Total Requests: ${chalk.white(data.totalRequests.toLocaleString())}`);
      console.log(`Total Bandwidth: ${chalk.white(formatBytes(data.totalBandwidth))}`);

    } catch (error) {
      spinner.fail('Failed to load geographic statistics');
      this.handleAnalyticsError(error);
    }
  }

  /**
   * Export analytics report
   */
  async exportAnalyticsReport() {
    const spinner = ora('Generating analytics report...').start();

    try {
      const formatAnswer = await inquirer.prompt([
        {
          type: 'list',
          name: 'format',
          message: 'Select export format:',
          choices: [
            { name: 'JSON (machine readable)', value: 'json' },
            { name: 'CSV (spreadsheet)', value: 'csv' },
            { name: 'Text (human readable)', value: 'txt' }
          ]
        }
      ]);

      const response = await axios.get(`${API_BASE_URL}/analytics/export`, {
        headers: {
          'Authorization': `Bearer ${this.authManager.getApiKey()}`
        },
        params: {
          format: formatAnswer.format
        },
        timeout: 60000
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to export report');
      }

      const fs = require('fs');
      const filename = `ghostcdn-analytics-${new Date().toISOString().split('T')[0]}.${formatAnswer.format}`;
      
      let content;
      if (formatAnswer.format === 'json') {
        content = JSON.stringify(response.data.data, null, 2);
      } else {
        content = response.data.data;
      }

      fs.writeFileSync(filename, content);
      
      spinner.succeed(`Analytics report exported to ${filename}`);
      showSuccess(`Report saved: ${filename}`);

    } catch (error) {
      spinner.fail('Failed to export analytics report');
      this.handleAnalyticsError(error);
    }
  }

  /**
   * Handle analytics errors
   */
  handleAnalyticsError(error) {
    if (error.response?.status === 401) {
      showError(ERROR_MESSAGES.AUTH_FAILED);
    } else if (error.code === 'ECONNREFUSED') {
      showError(ERROR_MESSAGES.CONNECTION_REFUSED);
    } else {
      showError(error.response?.data?.error || error.message || 'Analytics operation failed');
    }
  }

  /**
   * Get period label for display
   */
  getPeriodLabel(period) {
    const labels = {
      '7d': 'Last 7 days',
      '30d': 'Last 30 days',
      '90d': 'Last 90 days',
      'all': 'All time'
    };
    return labels[period] || period;
  }

  /**
   * Format change percentage
   */
  formatChange(change) {
    if (change === null || change === undefined) {
      return chalk.dim('N/A');
    }
    
    const formatted = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
    
    if (change > 0) {
      return chalk.green(formatted);
    } else if (change < 0) {
      return chalk.red(formatted);
    } else {
      return chalk.dim(formatted);
    }
  }

  /**
   * Get activity icon
   */
  getActivityIcon(type) {
    const icons = {
      'upload': '📤',
      'download': '📥',
      'delete': '🗑️',
      'view': '👁️',
      'share': '🔗',
      'api_key_created': '🔑',
      'api_key_deleted': '🔒'
    };
    return icons[type] || '📋';
  }

  /**
   * Get time ago string
   */
  getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }
  }
}

module.exports = AnalyticsManager;