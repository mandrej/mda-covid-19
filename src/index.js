import * as d3 from "d3";
import chart from "./chart";
import d3ToPng from 'd3-svg-to-png';

const title = {
    1: "Total cases / per million",
    2: "Daily cases / per million",
    3: "Total deaths / total cases"
}

const choose = function () {
    const nodes = document.querySelectorAll("input[name='country']:checked");
    const selected = Array.from(nodes).map(sel => {
        return sel.value
    })
    return selected
}

export function save (num) {
    // https://www.npmjs.com/package/d3-svg-to-png
    d3ToPng("#g" + num, title[num], {
        scale: 1,
        download: true
    }).then(file => {
        // data:image/png;base64,
    })
}

export function draw () {
    const countries = choose();

    d3.csv("https://covid.ourworldindata.org/data/ecdc/full_data.csv").then(raw => {
        d3.selectAll("svg").remove();

        chart(countries, raw, "total_cases", true, d3.format("1,"), title[1]);
        chart(countries, raw, "new_cases", true, d3.format("1,"), title[2]);
        chart(countries, raw, "total_deaths", false, d3.format(",.1%"), title[3]);
    })
}

draw();