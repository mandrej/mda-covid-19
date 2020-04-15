import * as d3 from "d3";

export default function (locations, raw, value, perMillion, axesFormat, title) {
    var margin = { top: 20, right: 50, bottom: 40, left: 50 },
        W = 800, H = 500,
        width = W - margin.left - margin.right,
        height = H - margin.top - margin.bottom;

    var fromDate = "2020-01-01";
    var dateFormat = d3.timeFormat("%d.%m.%Y");
    var numberFormat = d3.format(",.2f")
    var parseDate = d3.timeParse("%Y-%m-%d");

    var countries = Object.keys(locations);
    var data = raw.filter(d => {
        return countries.indexOf(d.location) >= 0 && +d["new_cases"] > 0
    }).map(d => {
        return {
            location: d.location,
            date: parseDate(d.date),
            total: (perMillion) ? +d[value] / locations[d.location] : +d[value] / +d["total_cases"]
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
        .domain(d3.extent(data, d => { return d.date })).nice()
        .rangeRound([0, width]);
    if (perMillion) {
        var yScale = d3.scaleLog();
    } else {
        var yScale = d3.scaleLinear();
    }
    yScale.domain([
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
        .domain(byLocation.map(c => { return c.location; }));

    var latest = d3.max(data, d => { return d.date });
    document.getElementById("latest").innerHTML = dateFormat(latest);

    // line generator
    var line = d3.line()
        .x((d, i) => { return xScale(d.date); })
        .y(d => { return yScale(d.total); })
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
            .tickFormat(axesFormat));
    svg.append("g")
        .attr("class", "axes")
        .attr("transform", "translate(" + width + ", 0)")
        .call(d3.axisRight(yScale)
            .ticks(5)
            .tickFormat(axesFormat));

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
        .style("font-size", "20px")
        .text(title);
    legend.selectAll("circle")
        .data(countries)
        .enter()
        .append("circle")
        .attr("cx", 10)
        .attr("cy", (d, i) => { return 20 + i * 20 }) // 100 is where the first dot appears. 25 is the distance between dots
        .attr("r", 7)
        .style("fill", d => { return zScale(d) });
    legend.selectAll(".country")
        .data(Object.entries(locations))
        .enter()
        .append("text")
        .attr("class", "country")
        .attr("x", 20)
        .attr("y", (d, i) => { return 21 + i * 20 }) // 100 is where the first dot appears. 25 is the distance between dots
        .style("fill", d => { return zScale(d[0]) })
        .text(d => { return d[0] + " (" + numberFormat(d[1]) + " mil.)" })
        .style("font-size", "14px")
        .style("alignment-baseline", "middle");

    svg.selectAll(".dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => { return xScale(d.date) })
        .attr("cy", d => { return yScale(d.total) })
        .attr("r", 4)
        .style("fill", d => { return zScale(d.location) })
        .append("title")
        .text(d => {
            return (perMillion) ?
                d.location + "\n" + dateFormat(d.date) + "\n" + numberFormat(d.total) :
                d.location + "\n" + dateFormat(d.date) + "\n" + axesFormat(d.total)
        });

    // add lines byLocation
    var loc = svg.selectAll(".location")
        .data(byLocation)
        .enter().append("g")
        .attr("class", "location");

    loc.append("path")
        .attr("class", "line")
        .attr("d", d => { return line(d.values); })
        .style("stroke", d => { return zScale(d.location) });
}
