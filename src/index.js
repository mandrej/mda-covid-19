import axios from 'axios'
import localforage from 'localforage'
import memoryDriver from 'localforage-memoryStorageDriver'
import { setup } from 'axios-cache-adapter'
import Chart from 'chart.js';
import 'chartjs-adapter-moment';
import 'chartjs-plugin-colorschemes';
import moment from 'moment';

const locations = [
    'Serbia',
    'Slovenia',
    'Croatia',
    'Bulgaria',
    'Greece',
    'Sweden',
    'Romania',
    'Portugal',
    'Spain',
    'Italy',
    'Germany',
    'United States',
    'Russia'
]

async function configure () {
    await localforage.defineDriver(memoryDriver)
    const forageStore = localforage.createInstance({
        driver: [
            localforage.INDEXEDDB,
            localforage.LOCALSTORAGE,
            memoryDriver._driver
        ],
        name: 'covid-data'
    })
    return setup({
        baseURL: 'https://covid.ourworldindata.org/data',
        cache: {
            maxAge: 15 * 60 * 1000, // 15 min
            store: forageStore // Pass `localforage` store to `axios-cache-adapter`
        }
    })
}

configure().then(async (http) => {
    const resp = await http.get('/owid-covid-data.csv')
    const parsed = [];
    const lines = resp.data.split('\n');
    const headers = lines[0].split(',');
    for (let i = 1; i < lines.length; i++) {
        let obj = {};
        const currentline = lines[i].split(',');
        for (let j = 0; j < headers.length; j++) {
            switch (headers[j]) {
                case 'date':
                    obj[headers[j]] = moment(currentline[j], 'YYYY-MM-DD');
                    break
                case 'new_cases':
                case 'total_cases':
                case 'total_deaths':
                case 'total_cases_per_million':
                case 'new_cases_per_million':
                case 'new_tests':
                    obj[headers[j]] = +currentline[j];
                    break
                default:
                    obj[headers[j]] = currentline[j];
            }
        }
        parsed.push(obj);
    }
    const data = parsed.filter(d => {
        return locations.indexOf(d.location) >= 0
    });
    main(data);
})

let id = document.querySelector('#selected option:checked').value;
const ctx = document.getElementById('chart').getContext('2d');
let shown = ['Serbia'];

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

function main (data) {
    const charts = {
        'daily_cases_per_million': {
            legend: true,
            yAxes: [{
                type: 'logarithmic',
                position: 'right',
                ticks: {
                    min: 0.1,
                    autoSkipPadding: 14,
                    callback: function (value, index, values) {
                        return Number(value.toString())
                    }
                }
            }],
            datasets: locations.map(country => {
                return {
                    label: country,
                    data: data.filter(d => d.location === country)
                        .map(d => {
                            return { x: d.date, y: d.new_cases_per_million }
                        }),
                    hidden: (shown.includes(country)) ? false : true
                }
            }),
            mul: 10
        },
        'daily_cases_per_daily_tests': {
            legend: false,
            yAxes: [{
                type: 'logarithmic',
                position: 'right',
                ticks: {
                    min: 0.005,
                    autoSkipPadding: 14,
                    callback: function (value, index, values) {
                        return Math.round(value * 1000) / 10 + '%';
                    }
                }
            }],
            datasets: locations.map(country => {
                return {
                    label: country,
                    data: data.filter(d => d.location === country)
                        .map(d => {
                            return { x: d.date, y: d.new_cases / d.new_tests }
                        }),
                    hidden: (shown.includes(country)) ? false : true
                }
            }),
            mul: 1000
        },
        'total_deaths_per_total_cases': {
            legend: false,
            yAxes: [{
                type: 'linear',
                position: 'right',
                ticks: {
                    autoSkipPadding: 14,
                    callback: function (value, index, values) {
                        return Math.round(value * 1000) / 10 + '%';
                    }
                }
            }],
            datasets: locations.map(country => {
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
                position: 'right',
                ticks: {
                    min: 0.1,
                    autoSkipPadding: 14,
                    callback: function (value, index, values) {
                        return Number(value.toString())
                    }
                }
            }],
            datasets: locations.map(country => {
                return {
                    label: country,
                    data: data.filter(d => d.location === country)
                        .map(d => {
                            return { x: d.date, y: d.total_cases_per_million }
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
                    const idx = shown.indexOf(item.text);
                    if (item.hidden) {
                        if (idx === -1) {
                            shown.push(item.text)
                        }
                    } else {
                        if (idx !== -1) {
                            shown.splice(idx, 1)
                        }
                    }
                    redraw(id);
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

    function redraw (id) {
        graph.data.datasets = charts[id].datasets;
        graph.data.datasets.forEach((dataset, i) => {
            let meta = graph.getDatasetMeta(i);
            meta.hidden = (shown.includes(dataset.label)) ? false : true
        });
        graph.options.scales.yAxes = charts[id].yAxes;
        graph.update();
    }

    document.getElementById('selected').addEventListener('change', event => {
        id = event.target.value;
        redraw(id);
    })

    document.getElementById('download').addEventListener('click', event => {
        const canvas = document.getElementById('chart');
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        event.target.download = id + '.png';
        event.target.href = canvas.toDataURL("image/png");
    });
}

Chart.defaults.global.aspectRatio = 1.8;
Chart.defaults.global.legend.position = 'bottom';
Chart.defaults.global.legend.labels.boxWidth = 12;
Chart.defaults.global.tooltips.mode = 'x';
Chart.defaults.global.tooltips.intersect = true;
Chart.defaults.global.elements.line.fill = false;
Chart.defaults.global.elements.line.spanGaps = true;
Chart.defaults.global.elements.point.radius = 5;
Chart.defaults.global.elements.point.hoverRadius = 5;
Chart.defaults.global.plugins.colorschemes.scheme = 'tableau.Tableau20';
