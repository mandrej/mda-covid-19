import * as d3 from "d3";
import chart from "./chart";

var choose = function () {
    const countries = {
        "Serbia": 6.804596,
        "Slovenia": 2.078932,
        "Croatia": 4.105268,
        "Romania": 19.237682,
        "Spain": 46.754783,
        "Italy": 60.461828,
        "Germany": 83.783945,
        "United States": 331.002647,
        "China": 1439.323774
    };
    const locations = {};
    const selected = document.querySelectorAll("input[name='country']:checked");
    selected.forEach(sel => {
        locations[sel.value] = countries[sel.value];
    })
    return locations;
}

export function draw () {
    var locations = choose();

    d3.csv("https://covid.ourworldindata.org/data/ecdc/full_data.csv").then(raw => {
        d3.selectAll("svg").remove();

        chart(locations, raw, "total_cases", true, d3.format("1,"), "Total cases / per million");
        chart(locations, raw, "new_cases", true, d3.format("1,"), "Daily cases / per million");
        chart(locations, raw, "total_deaths", false, d3.format(",.1%"), "Total deaths / total cases");
    });
}

draw();