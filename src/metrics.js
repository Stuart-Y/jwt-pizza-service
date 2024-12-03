const config = require('./config.json');
const os = require('os');

class Metrics {
  constructor() {
    this.totalRequests = 0;
    this.getRequests = 0;
    this.postRequests = 0;
    this.putRequests = 0;
    this.deleteRequests = 0;

    // This will periodically sent metrics to Grafana
    this.sendMetricsPeriodically(60000);
  }

  requestTracker(req) {
    this.totalRequests+=1
    if (req.method === 'GET') {
      this.getRequests += 1;
    }
    if (req.method === 'POST') {
      this.postRequests += 1;
    }
    if (req.method === 'PUT') {
      this.putRequests += 1;
    }
    if (req.method === 'DELETE') {
      this.deleteRequests += 1;
    }
  }

  httpMetrics(buf) {
    buf.addMetric('totalRequests', this.totalRequests);
    this.totalRequests = 0;
    buf.addMetric('getRequests', this.getRequests);
    this.getRequests = 0;
    buf.addMetric('postRequests', this.postRequests);
    this.postRequests = 0;
    buf.addMetric('putRequests', this.putRequests);
    this.postRequests = 0;
    buf.addMetric('deleteRequests', this.deleteRequests);
    this.deleteRequests = 0;
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