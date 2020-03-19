const axios = require('axios');
const d3 = require('d3');

let data;
let populationFactor = 100000;

async function loadData() {
    data = await axios
        .get('https://covid-19.openmedical.de/index.json')
        .then(res => {
            return res.data;
        })
        .catch(err => console.log(err));

    let population = await axios
        .get('./population.json')
        .then(res => {
            return res.data;
        })
        .catch(err => console.log(err));

    let merged = [];

    for (let i = 0; i < data.length; i++) {
        merged.push({
                ...data[i],
                ...(population.find((itmInner) => itmInner.state === data[i].state))
            }
        );
    }
    data = merged;
    return data;
}

export async function generateMultiple() {
    if (!data) {
        data = await loadData();
    }

    /* Format Data */
    let all = [];
    let date;
    let parseDate = d3.timeParse('%d.%m.%Y');
    data.forEach(function (d) {
        d.data.forEach(function (e) {
            date = parseDate(e.date);
            all.push({
                'state': d.state,
                'population': d.population,
                'area': d.area,
                'date': date,
                'infected': e.infected,
                'new': e.infected_diff,
                'infected_population': (e.infected / d.population * populationFactor),
                'dead': e.dead,
                'dead_population': (e.dead / d.population * populationFactor),
            })
        });
    });

    // set the dimensions and margins of the graph
    let margin = {top: 20, right: 25, bottom: 50, left: 100},
        width = 400 - margin.left - margin.right,
        height = 250 - margin.top - margin.bottom;

    // group the data: I want to draw one line per group
    let sumstat = d3.nest() // nest function allows to group the calculation per level of a factor
        .key(function (d) {
            return d.state;
        })
        .entries(all);

    // color palette
    let color = d3.scaleOrdinal(d3.schemeTableau10);

    // Add an svg element for each group.
    // The will be one beside each other and will go on the next row when no more room available
    let svg = d3.select("#multiple")
        .selectAll("uniqueChart")
        .data(sumstat)
        .enter()
        .append('div')
        .attr('class', 'large-6 medium-12 small-12 cell')
        .append("svg")
        .attr("viewBox", "0 0 " + (width + margin.right + margin.left) + " " + (height + margin.top + margin.bottom))
        .attr("preserveAspectRatio", "xMidYMid meet")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + (margin.left/2) + "," + (margin.top + 10) + ")");

    //region x
    // Add X axis
    let x = d3.scaleTime()
        .domain(d3.extent(all, d => d.date)).nice()
        .range([0, width - 20]);
    svg.append("g")
        .attr("class", "tick")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat('%d.%m.')))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)");
    //endregion x

    //region infections
    //infections (total)
//    let y = d3.scaleSymlog()
    let infections = d3.scaleLinear()
        .domain([0, d3.max(all, d => +d.infected)])
        .range([height, 0]);
    svg.append("g")
        .attr("class", "tick")
        .attr("color", function (d) {
            return color(d.key);
        })
        .call(d3.axisLeft(infections).ticks(10))
        .append("text")
        .attr("class", "axis-title")
        .attr("transform", "rotate(-90)")
        .attr("x", (-height + margin.bottom) / 2)
        .attr("y", -35)
        .style("text-anchor", "end")
        .attr("fill", function (d) {
            return color(d.key);
        })
        .text("Infections");
    // Draw the line for infections
    svg
        .append("path")
        .attr("class", "multipath")
        .attr("fill", "none")
        .attr("stroke", function (d) {
            return color(d.key)
        })
        .attr("stroke-width", 1.9)
        .attr("d", function (d) {
            return d3.line()
                .x(function (d) {
                    return x(d.date);
                })
                .y(function (d) {
                    return infections(d.infected);
                })
                (d.values)
        });
    //endregion infections

    //region infections per inhabitants
    // infections per inhabitants
    let infectedpopulation = d3.scaleLinear()
        .domain([0, (d3.max(all, d => d.infected / d.population * populationFactor))])
        .range([height, 0]);
    svg.append("g")
        .attr("class", "tick")
        //        .attr("transform", "translate( " + (width-20) + ", 0 )")
        .attr("color", '#666')
        .call(d3.axisRight(infectedpopulation))
        .append("text")
        .attr("class", "axis-title")
        .attr("transform", "rotate(-90)")
        .attr("x", -margin.bottom / 2)
        .attr("y", 35)
        .style("text-anchor", "end")
        .attr("fill", '#666')
        .text("Infections / " + populationFactor + " Inhabitants");
    // Draw the line for infections / $populationFactor inhabitants
    svg
        .append("path")
        .attr("class", "multipath")
        .attr("fill", "none")
        .attr("stroke", '#666')
        .attr("stroke-width", 1.9)
        .attr("stroke-dasharray", 4)
        .attr("d", function (d) {
            return d3.line()
                .x(function (d) {
                    return x(d.date);
                })
                .y(function (d) {
                    return infectedpopulation(d.infected / d.population * populationFactor);
                })
                (d.values)
        });
    //endregion infections per inhabitants

    //region deaths
    // deaths (total)
    let deaths = d3.scaleLinear()
        .domain([0, d3.max(all, d => d.infected / 100)])
        .range([height, 0]);
    svg.append("g")
        .attr("class", "tick")
        .attr("color", '#aaa')
        .attr("transform", "translate( " + (width - 10) + ", 0 )")
        .call(d3.axisRight(deaths))
        .append("text")
        .attr("class", "axis-title")
        .attr("transform", "rotate(-90)")
        .attr("x", (-height + margin.bottom) / 2)
        .attr("y", 35)
        .style("text-anchor", "end")
        .attr("fill", "#aaa")
        .text("Deaths");
    // Draw the line for deaths
    svg
        .append("path")
        .attr("fill", "none")
        .attr("stroke", '#aaa')
        .attr("stroke-width", 1.9)
        .attr("d", function (d) {
            return d3.line()
                .x(function (d) {
                    return x(d.date);
                })
                .y(function (d) {
                    return deaths(d.dead);
                })
                (d.values)
        });
    //endregion deaths

    // Add titles
    svg
        .append("text")
        .attr("text-anchor", "start")
        .attr("y", -margin.top / 2)
        .attr("x", margin.left/2)
        .text(function (d) {
            return (d.key)
        })
        .style("fill", function (d) {
            return color(d.key)
        });
}

export async function generateHeatMaps() {
    if (!data) {
        data = await loadData();
    }

    /* Format Data */
    let parseDate = d3.timeParse('%d.%m.%Y');
    let parseDay = d3.timeFormat('%d.%m.');
    let newlyInfected = [];

    let date;

    data.forEach(function (d) {
        d.data.forEach(function (e) {
            date = parseDay(parseDate(e.date));
            newlyInfected.push({
                'state': d.state,
                'state_short': d.state_short,
                'day': date,
                'new': e.infected_diff,
                'new_rel': (e.infected_diff / d.population * populationFactor).toFixed(2)
            })
        });
    });

    const states = [...new Set(newlyInfected.map(item => item.state_short))].reverse();
    const days = [...new Set(newlyInfected.map(item => item.day))];

    heatmap(days, states, newlyInfected, 'new', '#heatmap' );
    heatmap(days, states, newlyInfected, 'new_rel', '#heatmap2' );
}

function heatmap(xValues, yValues, data, key, selector) {
    // set the dimensions and margins of the graph
    let margin = {top: 0, right: 25, bottom: 50, left: 10},
        width = 500 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    let svg = d3.select(selector)
        .append("svg")
        .attr("viewBox", "0 0 " + (width + margin.right + margin.left )+ " " + (height + margin.top + margin.bottom))
        .attr("preserveAspectRatio", "xMidYMid meet")
        .attr("width", width + margin.left * 2 + margin.right * 2)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");


    // Build X scales and axis:
    let x = d3.scaleBand()
        .range([0, width])
        .domain(xValues)
        .padding(0.05);

    let xAxis = svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).tickSize(0));

    xAxis.selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)");
    xAxis.selectAll(".domain")
        .remove();

    // Build Y scales and axis:
    let y = d3.scaleBand()
        .range([height, 0])
        .domain(yValues)
        .padding(0.05);

    svg.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .select(".domain").remove();

    let max = d3.max(data, d => d[key]);
    // Build color scale
    let myColor = d3.scaleSequential()
        .interpolator(d3.interpolatePuBu)
        .domain([0, max]);

    // add the squares
    svg.selectAll()
        .data(data, function (d) {
            return d.state_short + ':' + d.day;
        })
        .enter()
        .append("g")
        .append("rect")
        .attr("x", function (d) {
            return x(d.day);
        })
        .attr("y", function (d) {
            return y(d.state_short);
        })
        .attr("rx", 2)
        .attr("ry", 2)
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", function (d) {
            return myColor(d[key])
        })
        .style("stroke-width", 4)
        .style("stroke", "none")
        .style("opacity", 0.8);

    svg.selectAll()
        .data(data, function (d) {
            console.log(d);
            return d.state_short + ':' + d.day;
        })
        .enter()
        .append('text')
        .attr("x", function (d) {
            return x(d.day) + (x.bandwidth() / 2);
        })
        .attr("y", function (d) {
            return y(d.state_short) + (y.bandwidth() / 2);
        })
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "middle")
        .attr("class", "square-text")
        .text(function (d) {
            return d[key];
        });
}

generateMultiple();

generateHeatMaps();
