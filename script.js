let userChart, hourlyGainsChart, totalUsersOdo, newUsersOdo;

function formatNumber(num) {
  return new Intl.NumberFormat().format(num);
}

function getChangeArrow(value) {
  if (value > 0) {
    return `
            <svg xmlns="http://www.w3.org/2000/svg" width="16"
                 height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round"
                 stroke-linejoin="round">
              <path d="m5 12 7-7 7 7"/>
              <path d="M12 19V5"/>
            </svg>`;
  } else if (value < 0) {
    return `
            <svg xmlns="http://www.w3.org/2000/svg" width="16"
                 height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round"
                 stroke-linejoin="round">
              <path d="M12 5v14"/>
              <path d="m19 12-7 7-7-7"/>
            </svg>`;
  }
  return `
          <svg xmlns="http://www.w3.org/2000/svg" width="16"
               height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round"
               stroke-linejoin="round">
            <path d="M5 12h14"/>
          </svg>`;
}

function formatDateTime(date) {
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function initCharts() {
  totalUsersOdo = new Odometer({
    el: document.getElementById('totalUsers'),
    value: 0,
    format: ',ddd',
    theme: 'minimal',
  });

  newUsersOdo = new Odometer({
    el: document.getElementById('newUsers'),
    value: 0,
    format: ',ddd',
    theme: 'minimal',
  });

  Chart.defaults.color = '#9ca3af';
  Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

  const ctxUser = document.getElementById('userChart').getContext('2d');
  userChart = new Chart(ctxUser, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Total Users',
          data: [],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          tension: 0.4,
          borderWidth: 2,
          fill: true,
          pointRadius: 0,
          pointHitRadius: 10,
        },
      ],
    },
    options: {
      animation: { duration: 0 },
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(18, 18, 18, 0.95)',
          titleColor: '#f1f1f1',
          bodyColor: '#f1f1f1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            title: tooltipItems => {
              const date = new Date(tooltipItems[0].raw.x);
              return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
            },
            label: context => `Users: ${formatNumber(context.raw.y)}`,
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'hour',
            displayFormats: {
              hour: 'MMM d, HH:mm',
            },
          },
          grid: { display: false },
          ticks: { maxTicksLimit: 8 },
          min: new Date(Date.now() - 24 * 60 * 60 * 1000),
          max: new Date(),
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { callback: formatNumber },
        },
      },
    },
  });

  const ctxHourly = document
    .getElementById('hourlyGainsChart')
    .getContext('2d');
  hourlyGainsChart = new Chart(ctxHourly, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Hourly Gains',
          data: [],
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: '#3b82f6',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      animation: { duration: 0 },
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(18, 18, 18, 0.95)',
          titleColor: '#f1f1f1',
          bodyColor: '#f1f1f1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 8 },
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { callback: formatNumber },
        },
      },
    },
  });
}

async function fetchData() {
  try {
    const response = await fetch('https://api.communitrics.com/bsky');
    const data = await response.json();

    if (data.length > 0) {
      window.rawData = data;
      const latestData = data[data.length - 1];
      const currentUsers = parseInt(latestData.users);
      const earliestTimestamp = new Date(data[0].timestamp);
      const latestTimestamp = new Date(latestData.timestamp);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const minTime =
        earliestTimestamp > twentyFourHoursAgo
          ? earliestTimestamp
          : twentyFourHoursAgo;
      const maxTime = latestTimestamp;

      userChart.options.scales.x.min = minTime;
      userChart.options.scales.x.max = maxTime;
      userChart.data.datasets[0].data = data.map(point => ({
        x: new Date(point.timestamp).getTime(),
        y: parseInt(point.users),
      }));

      let hourlyData = new Map();
      data.forEach(point => {
        const timestamp = new Date(point.timestamp);
        const hourStart = new Date(
          timestamp.getFullYear(),
          timestamp.getMonth(),
          timestamp.getDate(),
          timestamp.getHours(),
          0,
          0,
          0
        );
        hourlyData.set(hourStart.getTime(), {
          timestamp: hourStart,
          users: parseInt(point.users),
        });
      });

      const sortedHourlyPoints = Array.from(hourlyData.values()).sort(
        (a, b) => b.timestamp - a.timestamp
      );

      const tableData = sortedHourlyPoints.map((point, i) => {
        let gains = 0,
          changeInGains = 0;
        if (i < sortedHourlyPoints.length - 1) {
          gains = point.users - sortedHourlyPoints[i + 1].users;
          if (i < sortedHourlyPoints.length - 2) {
            const prevGains =
              sortedHourlyPoints[i + 1].users - sortedHourlyPoints[i + 2].users;
            changeInGains = gains - prevGains;
          }
        }
        return {
          timestamp: point.timestamp,
          users: point.users,
          gains,
          changeInGains,
        };
      });

      const tableBody = document.getElementById('hourlyTableBody');
      tableBody.innerHTML = tableData
        .map(row => {
          const { date, time } = formatDateTime(row.timestamp);
          const gainClass = row.gains >= 0 ? 'positive' : 'negative';
          const changeClass =
            row.changeInGains > 0
              ? 'positive'
              : row.changeInGains < 0
              ? 'negative'
              : 'change-neutral';
          return `
                  <tr>
                    <td class="timestamp-cell">
                      <div style="font-size: 1.1rem; margin-bottom: 0.25rem;">
                        ${time}
                      </div>
                      <div>${date}</div>
                    </td>
                    <td>
                      <div class="users-cell">
                        <div class="total-users">${formatNumber(
                          row.users
                        )}</div>
                        <div class="gains-info">
                          <div class="gain-value ${gainClass}">
                            ${getChangeArrow(row.gains)}
                            ${formatNumber(Math.abs(row.gains))}
                          </div>
                          <div class="gain-value ${changeClass}">
                            ${getChangeArrow(row.changeInGains)}
                            ${formatNumber(Math.abs(row.changeInGains))}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                `;
        })
        .join('');

      totalUsersOdo.update(currentUsers);

      let compareData = data[0];
      for (let i = 0; i < data.length; i++) {
        if (new Date(data[i].timestamp) >= twentyFourHoursAgo) {
          compareData = data[Math.max(0, i - 1)];
          break;
        }
      }

      const usersGained = currentUsers - parseInt(compareData.users);
      newUsersOdo.update(usersGained);
      document.getElementById('lastUpdated').textContent =
        'Last updated: ' + new Date(latestData.timestamp).toLocaleString();

      const hourlyGains = Array(24).fill(0);
      const hourlyLabels = [];
      const now = new Date();

      for (let i = 0; i < 24; i++) {
        const hour = now.getHours() - i;
        const hourTime = new Date(now).setHours(hour, 0, 0, 0);
        const hourLabel = `${(hour + 24) % 24}:00`;
        hourlyLabels.unshift(hourLabel);
        if (hourlyData.has(hourTime) && i < tableData.length - 1) {
          hourlyGains[23 - i] = tableData[i].gains;
        }
      }
      hourlyGainsChart.data.labels = hourlyLabels;
      hourlyGainsChart.data.datasets[0].data = hourlyGains;
      userChart.update('none');
      hourlyGainsChart.update('none');
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

function downloadCSV(type) {
  if (!window.rawData) {
    return;
  }

  let filteredData = window.rawData;

  if (type === '24h') {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    filteredData = filteredData.filter(
      point => new Date(point.timestamp) >= twentyFourHoursAgo
    );
  }

  if (filteredData.length === 0) {
    return;
  }

  const timeMap = new Map();
  filteredData.forEach(row => {
    const timestamp = new Date(row.timestamp);
    timestamp.setSeconds(0, 0);
    timeMap.set(timestamp.getTime(), row.users);
  });

  const minTime = new Date(filteredData[0].timestamp);
  minTime.setSeconds(0, 0);

  const maxTime = new Date(filteredData[filteredData.length - 1].timestamp);
  maxTime.setSeconds(0, 0);

  const csvRows = [];
  csvRows.push('Timestamp,Users');

  for (let time = minTime.getTime(); time <= maxTime.getTime(); time += 60000) {
    const timestamp = new Date(time).toISOString();
    const users = timeMap.has(time) ? timeMap.get(time) : '';
    csvRows.push(`${timestamp},${users}`);
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `Bluesky_Growth_${type}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

window.addEventListener('load', () => {
  initCharts();
  fetchData();
  setInterval(fetchData, 5000);

  const dropdownButton = document.getElementById('dropdownButton');
  const dropdownContent = document.getElementById('dropdownContent');

  dropdownButton.addEventListener('click', event => {
    event.stopPropagation();
    dropdownButton.classList.toggle('active');
    dropdownContent.classList.toggle('show');
  });

  document.addEventListener('click', event => {
    if (!dropdownButton.contains(event.target)) {
      dropdownContent.classList.remove('show');
      dropdownButton.classList.remove('active');
    }
  });
});
