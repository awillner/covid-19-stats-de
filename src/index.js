const axios = require('axios')
const d3 = require('d3')

let data;

async function loadData() {
    const data = await axios
        .get('https://covid-19.openmedical.de/index.json')
        .then(res => {
            return res.data;
        })
        .catch(err => console.log(err));
    return data;

    /* Format Data */
    var parseDate = d3.timeParse("%d.%m.%Y");
    var parseDay = d3.timeFormat('%d.%m.');
    data.forEach(function (d) {
        d.data.forEach(function (d) {
            d.date = parseDate(d.date);
            d.day = parseDay(d.date);
        });
    });
}

export async function generateMultiple() {
    if (!data) {
        data = await loadData();
    }

    /* Format Data */
    var parseDate = d3.timeParse('%d.%m.%Y');
    let all = [];

    let date;
    data.forEach(function (d) {
        d.data.forEach(function (e) {
            date = parseDate(e.date);
            all.push({'state': d.state, 'date': date, 'infected': e.infected, 'dead': e.dead, 'new': e.infected_diff})
        });
    });

    // set the dimensions and margins of the graph
    var margin = {top: 30, right: 0, bottom: 30, left: 50},
        width = 250 - margin.left - margin.right,
        height = 250 - margin.top - margin.bottom;

    // group the data: I want to draw one line per group
    var sumstat = d3.nest() // nest function allows to group the calculation per level of a factor
        .key(function(d) { return d.state;})
        .entries(all);

    // Add an svg element for each group. The will be one beside each other and will go on the next row when no more room available
    var svg = d3.select("#multiple")
        .selectAll("uniqueChart")
        .data(sumstat)
        .enter()
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Add X axis
    var x = d3.scaleTime()
        .domain(d3.extent(all, d => d.date))
        .range([0, width]);

    svg
        .append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).ticks(4));

    let maxInfected = d3.max(all, d => +d.infected);

    //Add Y axis
//    var y = d3.scaleSymlog()
    var y = d3.scaleLinear()
        .domain([0, d3.max(all, d => +d.infected)])
        .range([ height, 0 ]);
    svg.append("g")
        .call(d3.axisLeft(y).ticks(all.length/30));

    // color palette
    var color = d3.scaleOrdinal(d3.schemeTableau10);

    // Draw the line for infections
    svg
        .append("path")
        .attr("fill", "none")
        .attr("stroke", function(d){
            return color(d.key) })
        .attr("stroke-width", 1.9)
        .attr("d", function(d){
            return d3.line()
                .x(function(d) {
                    return x(d.date);
                })
                .y(function(d) {
                    return y(d.infected);
                })
                (d.values)
        })

    // Draw the line for deaths
    svg
        .append("path")
        .attr("fill", "none")
        .attr("stroke", '#000000')
        .attr("stroke-width", 1.9)
        .attr("d", function(d){
            return d3.line()
                .x(function(d) {
                    return x(d.date);
                })
                .y(function(d) {
                    return y(d.dead);
                })
                (d.values)
        })

    // Add titles
    svg
        .append("text")
        .attr("text-anchor", "start")
        .attr("y", -5)
        .attr("x", 0)
        .text(function(d){ return(d.key)})
        .style("fill", function(d){ return color(d.key) })
}

export async function generateHeatMap() {
    if (!data) {
        data = await loadData();
    }

    /* Format Data */
    var parseDate = d3.timeParse('%d.%m.%Y');
    var parseDay = d3.timeFormat('%d.%m.');
    let newlyInfected = [];

    let date;

    data.forEach(function (d) {
        d.data.forEach(function (e) {
            date = parseDay(parseDate(e.date));
            newlyInfected.push({'state': d.state, 'day': date, 'new': e.infected_diff})
        });
    });

    const states = [...new Set(newlyInfected.map(item => item.state))].reverse();
    const days = [...new Set(newlyInfected.map(item => item.day))];

    // set the dimensions and margins of the graph
    var margin = {top: 80, right: 25, bottom: 30, left: 100},
        width = 700 - margin.left - margin.right,
        height = 700 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    var svg = d3.select("#heatmap")
        .append("svg")
        .attr("width", width + margin.left*2 + margin.right*2)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left*2 + "," + margin.top + ")");


    // Build X scales and axis:
    var x = d3.scaleBand()
        .range([0, width])
        .domain(days)
        .padding(0.05);

    svg.append("g")
        .style("font-size", 15)
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).tickSize(0))
        .select(".domain").remove()

    // Build Y scales and axis:
    var y = d3.scaleBand()
        .range([height, 0])
        .domain(states)
        .padding(0.05);

    svg.append("g")
        .style("font-size", 15)
        .call(d3.axisLeft(y).tickSize(0))
        .select(".domain").remove()

    let max = d3.max(newlyInfected, d => d.new);
    // Build color scale
    var myColor = d3.scaleSequential()
        .interpolator(d3.interpolateOranges)
        .domain([0, max])

    // create a tooltip
    var tooltip = d3.select("#heatmap")
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")

    // add the squares
    svg.selectAll()
        .data(newlyInfected, function (d) {
            return d.state + ':' + d.day;
        })
        .enter()
        .append("g")
        .append("rect")
        .attr("x", function (d) {
            return x(d.day);
        })
        .attr("y", function (d) {
            return y(d.state);
        })
        .attr("rx", 2)
        .attr("ry", 2)
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", function (d) {
            return myColor(d.new)
        })
        .style("stroke-width", 4)
        .style("stroke", "none")
        .style("opacity", 0.8)

    svg.selectAll()
        .data(newlyInfected, function (d) {
            return d.state + ':' + d.day;
        })
        .enter()
        .append('text')
        .attr("x", function (d) {
            return x(d.day) + (x.bandwidth() / 2);
        })
        .attr("y", function (d) {
            return y(d.state) + (y.bandwidth() / 2);
        })
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "middle")
        .text(function (d) {
            return d.new;
        })

    svg.append("text")
        .attr("x", 0)
        .attr("y", -20)
        .attr("text-anchor", "left")
        .style("font-size", "14px")
        .style("fill", "grey")
        .style("max-width", 400)
        .text("Anzahl der Neuinfektionen pro Land und Tag.");
}

generateMultiple();
generateHeatMap();
