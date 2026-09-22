const labels = ['SP', 'RJ', 'MG', 'BA', 'PE', 'RS'];
const values = [82, 74, 68, 63, 58, 77];

const ctx = document.getElementById('oportunidadeChart');

new Chart(ctx, {
  type: 'bar',
  data: {
    labels: labels,
    datasets: [{
      label: 'Score de oportunidade',
      data: values,
      backgroundColor: ['#0f766e', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1'],
      borderRadius: 8,
      borderSkipped: false,
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Oportunidade: ${context.parsed.y}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 40,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      }
    }
  }
});

const scoreEl = document.getElementById('score');
scoreEl.textContent = `${Math.round(values.reduce((a, b) => a + b, 0) / values.length)}%`;
