import axios from 'axios'
import localforage from 'localforage'
import Chart from 'chart.js/auto'
import { format, formatISO, parseISO, subMonths } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'chartjs-adapter-date-fns'

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
  'Sweden'
  // 'United States',
  // 'Russia'
]
const tableau20 = [
  [31, 119, 180],
  [174, 199, 232],
  [255, 127, 14],
  [255, 187, 120],
  [44, 160, 44],
  [152, 223, 138],
  [214, 39, 40],
  [255, 152, 150],
  [148, 103, 189],
  [197, 176, 213],
  [140, 86, 75],
  [196, 156, 148],
  [227, 119, 194],
  [247, 182, 210],
  [127, 127, 127],
  [199, 199, 199],
  [188, 189, 34],
  [219, 219, 141],
  [23, 190, 207],
  [158, 218, 229]
]

const colors = Array.from(locations, (el, i) => {
  return [
    'rgba(' + [...tableau20[i], 1] + ')',
    'rgba(' + [...tableau20[i], 0.5] + ')'
  ]
})
let ctx = document.querySelector('.box canvas').getContext('2d')
let displayFrom = '2021-06-27' // Sunday
const dateFormat = 'MMM dd, yyyy'
const period = 7
const skip = { x: null, y: null }
const chartProperties = new Set(['name', 'shown'])
const cacheProperties = new Set(['ts', 'latest', 'data'])
// https://stackoverflow.com/questions/31128855/comparing-ecma6-sets-for-equality
let areSetsEqual = (a, b) =>
  a.size === b.size && [...a].every(value => b.has(value))

const store = localforage.createInstance({
  driver: [localforage.LOCALSTORAGE],
  name: 'covid-data'
})

store
  .getItem('chart')
  .then(chart => {
    const now = Date.now()
    const expired = 3600 * 1000
    let id = document.querySelector('#selected option:checked').value
    let shown = ['Serbia']

    if (chart) {
      const params = new Set(Object.getOwnPropertyNames(chart))
      if (areSetsEqual(chartProperties, params)) {
        if (chart.name !== id) {
          document.getElementById('selected').value = chart.name
        }
        id = chart.name
        if (chart.shown.length) {
          shown = chart.shown
        }
      } else {
        store.setItem('chart', { name: id, shown: shown })
      }
    } else {
      store.setItem('chart', { name: id, shown: shown })
    }
    // statistics
    ga_select_graph(id)
    shown.forEach(country => {
      ga_add_country(country)
    })

    store
      .getItem('cache')
      .then(cache => {
        if (cache) {
          const properties = new Set(Object.getOwnPropertyNames(cache))
          if (areSetsEqual(cacheProperties, properties)) {
            displayFrom = formatISO(subMonths(new Date(cache.latest), 13), {
              representation: 'date'
            })
            main(id, shown, cache)
          } else {
            fetch(id, shown, main)
          }
          if (now - cache.ts > expired) {
            fetch(id, shown, main)
          }
        } else {
          fetch(id, shown, main)
        }
      })
      .catch(err => console.log(err))
  })
  .catch(err => console.log(err))

function fetch(id, shown, callback) {
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
  axios
    .get('https://covid.ourworldindata.org/data/owid-covid-data.csv')
    .then(resp => {
      const parsed = []
      const lines = resp.data.split('\n')
      const headers = lines[0].split(',')
      const needed = [
        'date',
        'location',
        'new_cases_per_million',
        'positive_rate',
        'excess_mortality'
      ] //'total_cases', 'total_deaths', 'total_cases_per_million']
      for (let i = 1; i < lines.length; i++) {
        let obj = {}
        const currentline = lines[i].split(',')
        for (let j = 0; j < headers.length; j++) {
          if (needed.indexOf(headers[j]) >= 0) {
            switch (headers[j]) {
              case 'date':
                obj[headers[j]] = currentline[j]
                break
              case 'location':
                obj[headers[j]] = currentline[j]
                break
              default:
                obj[headers[j]] = +currentline[j]
            }
          }
        }
        if (obj.positive_rate === 0) obj.positive_rate = null
        parsed.push(obj)
      }
      const tmp = parsed
        .filter(d => {
          return locations.indexOf(d.location) >= 0
        })
        .filter(d => {
          return d.date > displayFrom
        })
      const date = tmp.slice().pop().date
      const cache = { ts: Date.now(), latest: date, data: tmp }
      store.setItem('cache', cache)

      if (document.querySelector('.box canvas')) {
        document.querySelector('.box canvas').remove()
        const canvas = document.createElement('canvas')
        document.querySelector('.box').append(canvas)
        ctx = document.querySelector('.box canvas').getContext('2d')
      }
      callback(arguments[0], arguments[1], cache)
    })
}

const xAxes = {
  adapters: {
    date: {
      locale: enUS
    }
  },
  type: 'time',
  time: {
    unit: 'month',
    tooltipFormat: dateFormat
  },
  ticks: {
    min: displayFrom
  }
}

function main(id, shown, cache) {
  const data = cache.data
  document.getElementById('latest').innerHTML = format(
    parseISO(cache.latest),
    dateFormat
  )

  function grouping(data, country) {
    return data
      .filter(d => d.location === country)
      .reduce((chunk, item, index) => {
        const chunkIndex = Math.floor(index / period)
        if (!chunk[chunkIndex]) {
          chunk[chunkIndex] = [] // start a new chunk
        }
        chunk[chunkIndex].push(item)
        return chunk
      }, [])
  }

  function writeTick(value, index, values, percent = true) {
    return percent ? value + '%' : value
  }

  function writeLabel(context, percentage = true) {
    let lbl = context.dataset.label || ''
    if (lbl) lbl += ': '
    if (context.parsed.y !== null) {
      lbl += Math.round(context.parsed.y * 10) / 10
    }
    return percentage ? lbl + '%' : lbl
  }

  const conf = {
    daily_cases_per_million: {
      title: 'Daily cases / per 100k',
      yAxes: {
        type: 'logarithmic',
        position: 'right',
        ticks: {
          autoSkipPadding: 14,
          callback: (value, index, values) =>
            writeTick(value, index, values, false)
        }
      },
      datasets: locations.map((country, idx) => {
        const group = grouping(data, country)
        return {
          label: country,
          data: group.map(chunk => {
            const average =
              chunk
                .map(d => d.new_cases_per_million)
                .reduce((acc, cur) => acc + cur) / chunk.length
            const latest = chunk.slice(-1).pop()
            const _i = parseInt(chunk.length / 2)
            if (latest.date) {
              return { x: chunk[_i].date, y: average / 10 }
            } else {
              return skip
            }
          }),
          fill: false,
          borderColor: colors[idx][0],
          backgroundColor: colors[idx][1],
          hidden: shown.includes(country) ? false : true
        }
      }),
      callbacks: {
        label: context => writeLabel(context, false)
      }
    },
    positive_rate: {
      title: 'Positive rate',
      yAxes: {
        type: 'linear',
        position: 'right',
        ticks: {
          autoSkipPadding: 14,
          callback: (value, index, values) => writeTick(value, index, values)
        }
      },
      datasets: locations.map((country, idx) => {
        const group = grouping(data, country)
        return {
          label: country,
          data: group.map(chunk => {
            const filtered = chunk.filter(d => d.positive_rate !== null)
            if (!filtered.length) return skip
            const average =
              filtered
                .map(d => d.positive_rate)
                .reduce((acc, cur) => acc + cur) / filtered.length
            const latest = chunk.slice(-1).pop()
            const _i = parseInt(chunk.length / 2)
            if (latest.date) {
              return { x: chunk[_i].date, y: average * 100 }
            } else {
              return skip
            }
          }),
          fill: false,
          borderColor: colors[idx][0],
          backgroundColor: colors[idx][1],
          hidden: shown.includes(country) ? false : true
        }
      }),
      callbacks: {
        label: context => writeLabel(context)
      }
    },
    excess_mortality: {
      title: 'Excess mortality',
      yAxes: {
        type: 'linear',
        position: 'right',
        ticks: {
          autoSkipPadding: 14,
          callback: (value, index, values) => writeTick(value, index, values)
        }
      },
      datasets: locations.map((country, idx) => {
        const group = data.filter(
          d => d.location === country && d.excess_mortality > 0
        )
        return {
          label: country,
          data: group.map(d => {
            return { x: d.date, y: d.excess_mortality }
          }),
          fill: true,
          borderColor: colors[idx][0],
          backgroundColor: colors[idx][1],
          hidden: shown.includes(country) ? false : true
        }
      }),
      callbacks: {
        label: context => writeLabel(context)
      }
    }
  }

  const chart = new Chart(ctx, {
    type: 'line',
    responsive: true,
    data: {
      datasets: conf[id].datasets
    },
    options: {
      scales: {
        xAxes: xAxes,
        yAxes: conf[id].yAxes
      },
      plugins: {
        title: {
          display: true,
          text: conf[id].title,
          font: {
            size: 14
          }
        },
        legend: {
          display: true,
          onClick: function (event, legendItem, legend) {
            const ci = legend.chart
            // const index = legendItem.datasetIndex;
            // if (ci.isDatasetVisible(index)) {
            //     ci.hide(index);
            //     legendItem.hidden = true;
            // } else {
            //     ci.show(index);
            //     legendItem.hidden = false;
            // }

            const idx = shown.indexOf(legendItem.text)
            if (legendItem.hidden) {
              if (idx === -1) {
                shown.push(legendItem.text)
                store.setItem('chart', { name: id, shown: shown })
              }
            } else {
              if (idx !== -1) {
                shown.splice(idx, 1)
                store.setItem('chart', { name: id, shown: shown })
              }
            }
            const meta = ci.getDatasetMeta(legendItem.datasetIndex)
            meta.hidden = shown.includes(legendItem.text) ? false : true
            ci.update()
          }
        },
        tooltip: {
          titleAlign: 'right',
          callbacks: conf[id].callbacks
        }
      }
    }
  })

  document.getElementById('selected').addEventListener('change', event => {
    id = event.target.value
    store.setItem('chart', { name: id, shown: shown })

    chart.data.datasets = conf[id].datasets
    chart.data.datasets.forEach((dataset, i) => {
      let meta = chart.getDatasetMeta(i)
      meta.hidden = shown.includes(dataset.label) ? false : true
    })
    chart.options.scales.yAxes = conf[id].yAxes
    chart.options.plugins.tooltip.callbacks = conf[id].callbacks
    chart.options.plugins.title.text = conf[id].title
    chart.update()
  })

  document.getElementById('download').addEventListener('click', event => {
    const canvas = document.getElementById('chart')
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    event.target.download = id + '.png'
    event.target.href = canvas.toDataURL('image/png')
  })
  document.getElementById('loader').style.display = 'none'
}

Chart.defaults.aspectRatio = 1.8
Chart.defaults.plugins.legend.position = 'bottom'
Chart.defaults.plugins.legend.labels.boxWidth = 12
Chart.defaults.interaction.mode = 'x'
Chart.defaults.interaction.intersect = true
// Chart.defaults.elements.line.fill = false;
Chart.defaults.elements.line.tension = 0
Chart.defaults.elements.point.radius = 8
Chart.defaults.elements.point.hoverRadius = 8

function ga_select_graph(name, value = 1) {
  gtag('event', 'chart', {
    event_category: 'engagement',
    event_label: name,
    value: value
  })
}

function ga_add_country(country, value = 1) {
  gtag('event', 'country', {
    event_category: 'engagement',
    event_label: country,
    value: value
  })
}
