import axios from 'axios'
import Chart from 'chart.js';
import 'chartjs-adapter-moment';
import 'chartjs-plugin-colorschemes';
import moment from 'moment';

const locations = {
    'Serbia': 6.804596,
    'Slovenia': 2.078932,
    'Croatia': 4.105268,
    'Bulgaria': 6.948445,
    'Greece': 10.423056,
    'Sweden': 10.099270,
    'Romania': 19.237682,
    'Spain': 46.754783,
    'Italy': 60.461828,
    'Germany': 83.783945,
    'United States': 331.002647,
    // 'China': 1439.323774
}
let id = document.querySelector('#selected option:checked').value;
let shown = ['Serbia'];

function parse (csv) {
    const result = [];
    const lines = csv.split("\n");
    const headers = lines[0].split(",");
    for (let i = 1; i < lines.length; i++) {
        let obj = {};
        const currentline = lines[i].split(",");
        for (let j = 0; j < headers.length; j++) {
            switch (headers[j]) {
                case 'date':
                    obj[headers[j]] = moment(currentline[j], 'YYYY-MM-DD');
                    break
                case 'new_cases':
                case 'new_deaths':
                case 'total_cases':
                case 'total_deaths':
                    obj[headers[j]] = +currentline[j];
                    break
                default:
                    obj[headers[j]] = currentline[j];
            }
        }
        result.push(obj);
    }
    return result
}
const ctx = document.getElementById('chart').getContext('2d');
axios.get('https://covid.ourworldindata.org/data/ecdc/full_data.csv').then(resp => {
    const raw = parse(resp.data);
    const data = raw.filter(d => {
        return Object.keys(locations).indexOf(d.location) >= 0 && d.total_cases > 0
    });

    const xAxes = [{
        type: 'time',
        time: {
            unit: 'week',
            isoWeekday: true,
            displayFormats: {
                week: 'DD.MMM'
            }
        },
        ticks: {
            min: moment('2020-03-01', 'YYYY-MM-DD')
        }
    }];

    const charts = {
        'daily_cases_per_million': {
            legend: true,
            yAxes: [{
                type: 'logarithmic',
                ticks: {
                    min: 0.1,
                    autoSkipPadding: 14,
                    callback: function (value, index, values) {
                        return Number(value.toString())
                    }
                }
            }],
            datasets: Object.keys(locations).map(country => {
                return {
                    label: country,
                    data: data.filter(d => d.location === country)
                        .map(d => {
                            return { x: d.date, y: d.new_cases / locations[country] }
                        }),
                    hidden: (shown.includes(country)) ? false : true
                }
            }),
            mul: 10
        },
        'total_deaths_per_total_cases': {
            legend: false,
            yAxes: [{
                type: 'linear',
                ticks: {
                    callback: function (value, index, values) {
                        return Math.round(value * 1000) / 10 + '%';
                    }
                }
            }],
            datasets: Object.keys(locations).map(country => {
                return {
                    label: country,
                    data: data.filter(d => d.location === country)
                        .map(d => {
                            return { x: d.date, y: d.total_deaths / d.total_cases }
                        }),
                    hidden: (shown.includes(country)) ? false : true
                }
            }),
            mul: 1000
        },
        'total_cases_per_million': {
            legend: false,
            yAxes: [{
                type: 'logarithmic',
                ticks: {
                    min: 0.1,
                    autoSkipPadding: 14,
                    callback: function (value, index, values) {
                        return Number(value.toString())
                    }
                }
            }],
            datasets: Object.keys(locations).map(country => {
                return {
                    label: country,
                    data: data.filter(d => d.location === country)
                        .map(d => {
                            return { x: d.date, y: d.total_cases / locations[country] }
                        }),
                    hidden: (shown.includes(country)) ? false : true
                }
            }),
            mul: 10
        }
    }

    const latest = charts[id].datasets[0].data.slice(-1)[0].x.format('DD.MM.YYYY');
    document.getElementById('latest').innerHTML = latest;

    const graph = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: charts[id].datasets
        },
        options: {
            legend: {
                display: charts[id].legend,
                onClick: function (event, item) {
                    const country = item.text;
                    const exist = shown.includes(country);
                    if (item.hidden) {
                        if (!exist) {
                            shown.push(country)
                        }
                    } else {
                        if (exist) {
                            shown = shown.filter(s => s !== country)
                        }
                    }
                    Chart.defaults.global.legend.onClick.call(this, event, item);
                }
            },
            scales: {
                xAxes: xAxes,
                yAxes: charts[id].yAxes
            },
            tooltips: {
                callbacks: {
                    label: function (tooltipItem, data) {
                        let label = data.datasets[tooltipItem.datasetIndex].label + ' ';
                        label += Math.round(tooltipItem.yLabel * charts[id].mul) / 10;
                        return label;
                    }
                }
            }
        }
    });

    document.getElementById('selected').addEventListener('change', event => {
        id = event.target.value;

        graph.data.datasets = charts[id].datasets;
        graph.data.datasets.forEach(dataset => {
            dataset.hidden = (shown.includes(dataset.label)) ? false : true
        });
        graph.options.scales.yAxes = charts[id].yAxes;
        graph.update({
            duration: 800,
            easing: 'easeInOutQuart'
        })
    })

    document.getElementById('download').addEventListener('click', event => {
        const canvas = document.getElementById('chart');
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        event.target.download = id + '.png';
        event.target.href = canvas.toDataURL("image/png");
    });
});

Chart.defaults.global.responsive = true;
// Chart.defaults.global.maintainAspectRatio = false;
Chart.defaults.global.legend.display = false;
Chart.defaults.global.legend.align = 'end';
Chart.defaults.global.legend.position = 'right';
Chart.defaults.global.tooltips.mode = 'x';
Chart.defaults.global.tooltips.intersect = true;
Chart.defaults.global.elements.line.fill = false;
Chart.defaults.global.legend.labels.boxWidth = 12;
Chart.defaults.global.plugins.colorschemes.scheme = 'tableau.Tableau10';
