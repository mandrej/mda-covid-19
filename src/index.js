import * as d3 from 'd3';

var margin = { top: 20, right: 30, bottom: 40, left: 50 },
    W = 800, H = 500,
    width = W - margin.left - margin.right,
    height = H - margin.top - margin.bottom;

// parse the date / time
var parseDate = d3.timeParse("%Y-%m-%d");
var fromDate = "2020-03-01"

var locations = {
    "Serbia": 6.804596,
    "Slovenia": 2.078932,
    "Croatia": 4.105268,
    "Spain": 46.754783,
    "Italy": 60.461828,
    "Germany": 83.783945,
    "United States": 331.002647,
    // "China": 1439.323774
};
var countries = Object.keys(locations);

d3.csv("https://covid.ourworldindata.org/data/ecdc/full_data.csv").then(raw => {
    chart(raw, "total_cases");
    chart(raw, "new_cases");
    chart(raw, "total_deaths");
});

var chart = function (raw, value) {
    var data = raw.filter(d => {
        return countries.indexOf(d.location) >= 0 && +d[value] > 0
    }).map(d => {
        return {
            location: d.location,
            date: parseDate(d.date),
            total: +d[value] / locations[d.location]
        }
    }).filter(d => {
        return d.date >= parseDate(fromDate)
    });
    var byLocation = countries.map(loc => {
        return {
            location: loc,
            values: data.filter(d => {
                return d.location === loc
            })
        }
    });

    // set the ranges
    var xScale = d3.scaleTime()
        .domain(d3.extent(data, function (d) { return d.date })).nice()
        .rangeRound([0, width]);
    var yScale = d3.scaleLog()
        .domain([
            d3.min(byLocation, c => {
                return d3.min(c.values, d => {
                    return d.total;
                })
            }),
            d3.max(byLocation, c => {
                return d3.max(c.values, d => {
                    return d.total;
                })
            })
        ]).nice()
        .range([height, 0]);
    var zScale = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(byLocation.map(function (c) { return c.location; }));

    var latest = d3.max(data, function (d) { return d.date });
    var format = d3.timeFormat("%d.%m.%Y %H:%M");
    document.getElementById("latest").innerHTML = format(latest);

    // line generator
    var line = d3.line()
        .x(function (d, i) { return xScale(d.date); })
        .y(function (d) { return yScale(d.total); })
        .curve(d3.curveBasis);

    // gridlines generator
    function make_x_gridlines () {
        return d3.axisBottom(xScale)
            .ticks(10)
    };
    function make_y_gridlines () {
        return d3.axisLeft(yScale)
            .ticks(10)
    };

    var svg = d3.select("body").append("svg")
        // .attr("width", W)
        // .attr("height", H)
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 " + W + " " + H)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // add axis
    svg.append("g")
        .attr("class", "axes")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale)
            .tickFormat(d3.timeFormat("%d.%m")));
    svg.append("g")
        .attr("class", "axes")
        .call(d3.axisLeft(yScale)
            .ticks(5)
            .tickFormat(d3.format("1,")));

    // add gridlines
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", "translate(0," + height + ")")
        .call(make_x_gridlines()
            .tickSize(-height)
            .tickFormat(""));
    svg.append("g")
        .attr("class", "grid")
        .call(make_y_gridlines()
            .tickSize(-width)
            .tickFormat(""));

    // add x-label
    svg.append("text")
        .attr("class", "label")
        .attr("transform", "translate(" + (width / 2) + " ," + (height + margin.top + 20) + ")")
        .style("text-anchor", "middle")
        .text("date");

    // add legend
    var legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(" + (margin.left - 30) + "," + (margin.top + 20) + ")");
    legend.append("text")
        .style("font", "24px sans-serif")
        .text(value + " / per million inhabitants");
    legend.selectAll("circle")
        .data(countries)
        .enter()
        .append("circle")
        .attr("cx", 10)
        .attr("cy", function (d, i) { return 20 + i * 20 }) // 100 is where the first dot appears. 25 is the distance between dots
        .attr("r", 7)
        .style("fill", function (d) { return zScale(d) });
    legend.selectAll(".country")
        .data(countries)
        .enter()
        .append("text")
        .attr("class", "country")
        .attr("x", 20)
        .attr("y", function (d, i) { return 21 + i * 20 }) // 100 is where the first dot appears. 25 is the distance between dots
        .style("fill", function (d) { return zScale(d) })
        .text(function (d) { return d })
        .style("alignment-baseline", "middle");

    // add lines byLocation
    var loc = svg.selectAll(".location")
        .data(byLocation)
        .enter().append("g")
        .attr("class", "location");

    loc.append("path")
        .attr("class", "line")
        .attr("d", d => { return line(d.values); })
        .style("stroke", function (d) { return zScale(d.location) });
}
