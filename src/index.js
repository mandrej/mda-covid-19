import axios from 'axios'
import dayjs from 'dayjs';
import localforage from 'localforage'
import Chart from 'chart.js';
import 'chartjs-adapter-dayjs';
import 'chartjs-plugin-colorschemes';

const locations = [
    'Serbia',
    'Montenegro',
    'Bosnia and Herzegovina',
    'Croatia',
    'Hungary',
    'Romania',
    'Bulgaria',
    'North Macedonia',
    'Greece',
    'Italy',
    'Slovenia',
    'Austria',
    'Germany',
    // 'Spain',
    // 'Portugal',
    'Sweden',
    // 'United States',
    // 'Russia'
]
const start = '2020-08-30'; // '2020-03-01'
const period = 7;

const store = localforage.createInstance({
    driver: [
        localforage.LOCALSTORAGE,
    ],
    name: 'covid-data'
});

store.getItem('graph').then(graph => {
    const now = Date.now()
    const expired = 3600 * 1000;
    let shown = ['Serbia'];
    let id = document.querySelector('#selected option:checked').value;
    if (graph) {
        if (graph.name !== id) {
            document.getElementById('selected').value = graph.name
        }
        id = graph.name
        if (graph.list.length) {
            shown = graph.list
        }
    } else {
        store.setItem('graph', { name: id, list: shown })
    }
    // statistics
    ga_select_graph(id);
    shown.forEach(country => {
        ga_add_country(country);
    })

    store.getItem('cache').then(cache => {
        if (cache) {
            main(id, shown, cache.data)
            if (now - cache.ts > expired) {
                fetch(id, shown, main);
            }
        } else {
            fetch(id, shown, main);
        }
    }).catch(err => console.log(err))
}).catch(err => console.log(err))

function fetch (id, shown, callback) {
    /**
     * iso_code, continent, location, date, total_cases, new_cases, new_cases_smoothed,
     * total_deaths, new_deaths, new_deaths_smoothed, total_cases_per_million, 
     * new_cases_per_million, new_cases_smoothed_per_million, total_deaths_per_million,
     * new_deaths_per_million, new_deaths_smoothed_per_million, reproduction_rate, icu_patients,
     * icu_patients_per_million, hosp_patients, hosp_patients_per_million, weekly_icu_admissions,
     * weekly_icu_admissions_per_million, weekly_hosp_admissions, weekly_hosp_admissions_per_million,
     * new_tests, total_tests, total_tests_per_thousand, new_tests_per_thousand, new_tests_smoothed,
     * new_tests_smoothed_per_thousand, positive_rate, tests_per_case, tests_units, total_vaccinations,
     * people_vaccinated, people_fully_vaccinated, total_boosters, new_vaccinations, 
     * new_vaccinations_smoothed, total_vaccinations_per_hundred, people_vaccinated_per_hundred,
     * people_fully_vaccinated_per_hundred, total_boosters_per_hundred, 
     * new_vaccinations_smoothed_per_million, stringency_index, population, population_density, 
     * median_age, aged_65_older, aged_70_older, gdp_per_capita, extreme_poverty, cardiovasc_death_rate,
     * diabetes_prevalence, female_smokers, male_smokers, handwashing_facilities, 
     * hospital_beds_per_thousand, life_expectancy, human_development_index, excess_mortality
     */
    axios.get('https://covid.ourworldindata.org/data/owid-covid-data.csv').then(resp => {
        const parsed = [];
        const lines = resp.data.split('\n');
        const headers = lines[0].split(',');
        const needed = ['date', 'location', 'new_cases_per_million', 'excess_mortality'] //'total_cases', 'total_deaths', 'total_cases_per_million']
        for (let i = 1; i < lines.length; i++) {
            let obj = {};
            const currentline = lines[i].split(',');
            for (let j = 0; j < headers.length; j++) {
                if (needed.indexOf(headers[j]) >= 0) {
                    switch (headers[j]) {
                        case 'date':
                            obj[headers[j]] = dayjs(currentline[j], 'YYYY-MM-DD');
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
        const tmp = parsed.filter(d => {
            return locations.indexOf(d.location) >= 0
        }).filter(d => {
            return d.date > dayjs(start, 'YYYY-MM-DD')
        });
        store.setItem('cache', { ts: Date.now(), data: tmp })
        callback(arguments[0], arguments[1], tmp)
    })
}

const ctx = document.getElementById('chart').getContext('2d');
const skip = { x: NaN, y: NaN };

const xAxes = [{
    type: 'time',
    time: {
        unit: 'month',
        displayFormats: {
            month: 'MMM \'YY'
        }
    },
    ticks: {
        min: dayjs(start, 'YYYY-MM-DD') // Sunday
    }
}];

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

function main (id, shown, data) {
    const charts = {
        'daily_cases_per_million': {
            yAxes: [{
                type: 'logarithmic',
                position: 'right',
                ticks: {
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
                titleAlign: 'right',
                callbacks: {
                    title: function (tooltipItem, data) {
                        return dayjs(tooltipItem[0].label).format('DD.MM.YYYY')
                    },
                    label: function (tooltipItem, data) {
                        let label = data.datasets[tooltipItem.datasetIndex].label || '';
                        if (label) label += ': ';
                        label += Math.round(tooltipItem.yLabel * 10) / 10;
                        return label;
                    }
                }
            }
        },
        'excess_mortality': {
            yAxes: [{
                type: 'linear',
                position: 'right',
                ticks: {
                    autoSkipPadding: 14,
                    callback: function (value, index, values) {
                        return value + '%'
                    }
                }
            }],
            datasets: locations.map(country => {
                const group = data.filter(d => d.location === country && d.excess_mortality > 0);
                return {
                    label: country,
                    data: group.map(d => {
                        return { x: d.date, y: d.excess_mortality }
                    }),
                    hidden: (shown.includes(country)) ? false : true
                }
            }),
            tooltips: {
                titleAlign: 'right',
                callbacks: {
                    title: function (tooltipItem, data) {
                        return dayjs(tooltipItem[0].label).format('DD.MM.YYYY')
                    },
                    label: function (tooltipItem, data) {
                        let label = data.datasets[tooltipItem.datasetIndex].label || '';
                        if (label) label += ': ';
                        label += tooltipItem.yLabel + '%';
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
            document.getElementById('latest').innerHTML = dayjs(obj.x).format('DD.MM.YYYY');
            setDate = true;
        }
    })

    const graph = new Chart(ctx, {
        type: 'line',
        responsive: true,
        data: {
            datasets: charts[id].datasets
        },
        options: {
            legend: {
                display: true,
                onClick: function (event, item) {
                    const idx = shown.indexOf(item.text);
                    if (item.hidden) {
                        if (idx === -1) {
                            shown.push(item.text);
                            store.setItem('graph', { name: id, list: shown })
                        }
                    } else {
                        if (idx !== -1) {
                            shown.splice(idx, 1);
                            store.setItem('graph', { name: id, list: shown })
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

    document.getElementById('selected').addEventListener('change', event => {
        id = event.target.value;
        store.setItem('graph', { name: id, list: shown })

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
Chart.defaults.global.elements.line.tension = 0;
Chart.defaults.global.elements.point.radius = 8;
Chart.defaults.global.elements.point.hoverRadius = 8;
Chart.defaults.global.plugins.colorschemes.scheme = 'tableau.Tableau10';

function ga_select_graph (name, value = 1) {
    gtag('event', 'graph', {
        event_category: 'engagement',
        event_label: name,
        value: value
    })
}

function ga_add_country (country, value = 1) {
    gtag('event', 'country', {
        event_category: 'engagement',
        event_label: country,
        value: value
    })
}
