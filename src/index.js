import * as d3 from "d3";
import chart from "./chart";

const choose = function () {
    const nodes = document.querySelectorAll("input[name='country']:checked");
    const selected = Array.from(nodes).map(sel => {
        return sel.value
    })
    return selected
}

export function draw () {
    const countries = choose();

    d3.csv("https://covid.ourworldindata.org/data/ecdc/full_data.csv").then(raw => {
        d3.selectAll("svg").remove();

        chart(countries, raw, "total_cases", true, d3.format("1,"), "Total cases / per million");
        chart(countries, raw, "new_cases", true, d3.format("1,"), "Daily cases / per million");
        chart(countries, raw, "total_deaths", false, d3.format(",.1%"), "Total deaths / total cases");
    })
}

draw();