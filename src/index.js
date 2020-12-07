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
    'Montenegro',
    'Macedonia',
    'Bosnia and Herzegovina',
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
const start = '2020-03-01';
const period = 7;

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
            maxAge: 3600 * 1000, // 1 hour
            store: forageStore // Pass `localforage` store to `axios-cache-adapter`
        }
    })
}

function grouping (data, country) {
    return data.filter(d => d.location === country)
        .reduce((chunk, item, index) => {
            const chunkIndex = Math.floor(index / period)
            if (!chunk[chunkIndex]) {
                chunk[chunkIndex] = [] // start a new chunk
            }
            chunk[chunkIndex].push(item)
            return chunk
        }, [])
}

configure().then(async (http) => {
    const resp = await http.get('/owid-covid-data.csv')
    const parsed = [];
    const lines = resp.data.split('\n');
    const headers = lines[0].split(',');
    const needed = ['date', 'location', 'new_cases_per_million', 'total_cases', 'total_deaths', 'total_cases_per_million']
    for (let i = 1; i < lines.length; i++) {
        let obj = {};
        const currentline = lines[i].split(',');
        for (let j = 0; j < headers.length; j++) {
            if (needed.indexOf(headers[j]) >= 0) {
                switch (headers[j]) {
                    case 'date':
                        obj[headers[j]] = moment(currentline[j], 'YYYY-MM-DD');
                        break
                    case 'location':
                        obj[headers[j]] = currentline[j];
                        break
                    default:
                        obj[headers[j]] = +currentline[j];
                }
            }
        }
        parsed.push(obj);
    }
    const data = parsed.filter(d => {
        return locations.indexOf(d.location) >= 0
    }).filter(d => {
        return d.date > moment(start, 'YYYY-MM-DD')
    });
    main(data);
})

let id = document.querySelector('#selected option:checked').value;
const ctx = document.getElementById('chart').getContext('2d');
const skip = { x: null, y: null };
const shown = ['Serbia'];
ga_add_country(shown[0]);

const xAxes = [{
    type: 'time',
    time: {
        unit: 'month',
        displayFormats: {
            month: 'MMM YYYY'
        }
    },
    ticks: {
        min: moment(start, 'YYYY-MM-DD') // Sunday
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
                const group = grouping(data, country);
                return {
                    label: country,
                    data: group.map(chunk => {
                        const average = chunk.map(d => d.new_cases_per_million).reduce((acc, cur) => acc + cur) / chunk.length
                        const latest = chunk.slice(-1).pop()
                        if (latest.date) {
                            return { x: latest.date, y: average / 10 }
                        } else {
                            return skip
                        }
                    }),
                    hidden: (shown.includes(country)) ? false : true
                }
            }),
            tooltips: {
                callbacks: {
                    label: function (tooltipItem, data) {
                        let label = data.datasets[tooltipItem.datasetIndex].label || '';
                        if (label) label += ': ';
                        label += Math.round(tooltipItem.yLabel * 10) / 10;
                        return label;
                    }
                }
            }
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
                const group = grouping(data, country);
                return {
                    label: country,
                    data: group.map(chunk => {
                        const average = chunk.map(d => d.total_deaths / d.total_cases).reduce((acc, cur) => acc + cur) / chunk.length
                        const latest = chunk.slice(-1).pop()
                        if (latest.date) {
                            return { x: latest.date, y: average }
                        } else {
                            return skip
                        }
                    }),
                    hidden: (shown.includes(country)) ? false : true
                }
            }),
            tooltips: {
                callbacks: {
                    label: function (tooltipItem, data) {
                        let label = data.datasets[tooltipItem.datasetIndex].label || '';
                        if (label) label += ': ';
                        label += Math.round(tooltipItem.yLabel * 1000) / 10 + '%';
                        return label;
                    }
                }
            }
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
                const group = grouping(data, country);
                return {
                    label: country,
                    data: group.map(chunk => {
                        const average = chunk.map(d => d.total_cases_per_million).reduce((acc, cur) => acc + cur) / chunk.length
                        const latest = chunk.slice(-1).pop()
                        if (latest.date) {
                            return { x: latest.date, y: average / 10 }
                        } else {
                            return skip
                        }
                    }),
                    hidden: (shown.includes(country)) ? false : true
                }
            }),
            tooltips: {
                callbacks: {
                    label: function (tooltipItem, data) {
                        let label = data.datasets[tooltipItem.datasetIndex].label || '';
                        if (label) label += ': ';
                        label += Math.round(tooltipItem.yLabel * 10) / 10;
                        return label;
                    }
                }
            }
        }
    }

    let setDate = false;
    const latest = charts[id].datasets[0].data.slice(-3);
    latest.slice().reverse().forEach(obj => {
        if (obj.x && !setDate) {
            document.getElementById('latest').innerHTML = obj.x.format('DD.MM.YYYY');
            setDate = true;
        }
    })

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
                            shown.push(item.text);
                            ga_add_country(item.text);
                        }
                    } else {
                        if (idx !== -1) {
                            shown.splice(idx, 1);
                            ga_del_country(item.text);
                        }
                    }
                    // Chart.defaults.global.legend.onClick.call(this, event, item);
                    const meta = this.chart.getDatasetMeta(item.datasetIndex);
                    meta.hidden = (shown.includes(item.text)) ? false : true;
                    this.chart.update();
                }
            },
            scales: {
                xAxes: xAxes,
                yAxes: charts[id].yAxes
            },
            tooltips: charts[id].tooltips
        }
    });

    ga_select_graph(id);
    document.getElementById('selected').addEventListener('change', event => {
        id = event.target.value;
        ga_select_graph(id);

        graph.data.datasets = charts[id].datasets;
        graph.data.datasets.forEach((dataset, i) => {
            let meta = graph.getDatasetMeta(i);
            meta.hidden = (shown.includes(dataset.label)) ? false : true
        });
        graph.options.scales.yAxes = charts[id].yAxes;
        graph.options.tooltips = charts[id].tooltips;
        graph.update();
    })

    document.getElementById('download').addEventListener('click', event => {
        const canvas = document.getElementById('chart');
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        event.target.download = id + '.png';
        event.target.href = canvas.toDataURL("image/png");
    });
    document.getElementById('loader').style.display = 'none';
}

Chart.defaults.global.aspectRatio = 1.8;
Chart.defaults.global.legend.position = 'bottom';
Chart.defaults.global.legend.labels.boxWidth = 12;
Chart.defaults.global.tooltips.mode = 'x';
Chart.defaults.global.tooltips.intersect = true;
Chart.defaults.global.elements.line.fill = false;
Chart.defaults.global.elements.line.spanGaps = true;
Chart.defaults.global.elements.point.radius = 5;
Chart.defaults.global.elements.point.hoverRadius = 8;
Chart.defaults.global.plugins.colorschemes.scheme = 'tableau.Tableau10';

function ga_select_graph (name, value = 1) {
    gtag('event', 'select_graph', {
        event_category: 'engagement',
        event_label: name,
        value: value
    })
}

function ga_add_country (country, value = 1) {
    gtag('event', 'add_country', {
        event_category: 'engagement',
        event_label: country,
        value: value
    })
}

function ga_del_country (country, value = 1) {
    gtag('event', 'del_country', {
        event_category: 'engagement',
        event_label: country,
        value: value
    })
}
