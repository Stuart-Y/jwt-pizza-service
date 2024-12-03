const config = require('./config.json');
const os = require('os');

class Metrics {
  constructor() {
    this.totalRequests = 0;

    // This will periodically sent metrics to Grafana
    const timer = setInterval(() => {
      this.sendMetricsPeriodically(60000);
    }, 10000);
    timer.unref();
  }

  incrementRequests() {
    this.totalRequests++;
  }

  getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
  }
  
  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
  }

  sendMetricsPeriodically(period) {
    const timer = setInterval(() => {
      try {
        const buf = new MetricBuilder();
        httpMetrics(buf);
        systemMetrics(buf);
        userMetrics(buf);
        purchaseMetrics(buf);
        authMetrics(buf);
  
        const metrics = buf.toString('\n');
        this.sendMetricToGrafana(metrics);
      } catch (error) {
        console.log('Error sending metrics', error);
      }
    }, period);
  }
}

const metrics = new Metrics();
module.exports = metrics;