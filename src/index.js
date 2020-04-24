import * as d3 from 'd3';
import chart from './chart';
import d3ToPng from 'd3-svg-to-png';

const graphs = [
    { description: 'new_cases/million', axes: d3.format('1,'), title: 'Daily cases / per million' },
    { description: 'total_deaths/total_cases', axes: d3.format(',.1%'), title: 'Total deaths / total cases' },
    { description: 'total_cases/million', axes: d3.format('1,'), title: 'Total cases / per million' },
]

const choose = function () {
    const nodes = document.querySelectorAll('input[name="country"]:checked');
    const selected = Array.from(nodes).map(sel => {
        return sel.value
    })
    return selected
}

export function save (num) {
    // https://www.npmjs.com/package/d3-svg-to-png
    d3ToPng('#g' + num, graphs[num - 1].description, {
        scale: 1,
        download: true
    }).then(file => {
        // data:image/png;base64,
    })
}

export function draw () {
    const countries = choose();
    d3.csv('https://covid.ourworldindata.org/data/ecdc/full_data.csv').then(raw => {
        d3.selectAll('svg').remove();
        graphs.map((g, i) => {
            chart(i + 1, countries, raw, g.description, g.axes, g.title);
        })
    })
}

draw();