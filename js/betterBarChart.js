var uniqueBeerCount = {};
var uniqueBeersArray = [];
var needsUpdate = false;
var betterBarChartSVG = null;

/*
    When a user clicks on the US map the zoommap.js computes the list of beers within that state.
    This method takes that list and does a count on the beers
*/
function beerDataPass(data) {
    //Reset counts incase user clicks on another state
    uniqueBeerCount = {};
    uniqueBeerCountValuesOnly = [];

    //Determine count
    for (const beer of data) {
        uniqueBeerCount[beer] = uniqueBeerCount[beer] ? uniqueBeerCount[beer] + 1 : 1;
    }

    //Flatten to be processed later
    uniqueBeersArray = Object.keys(uniqueBeerCount).map((key) => [String(key), uniqueBeerCount[key]]);

    //Generate bar chart
    betterBarChart();


}

/*
    Grabs top 5 beers and generate bar chart next to the map
*/

function betterBarChart() {
    //Sort beers based on value
    uniqueBeersArray.sort(sortFunction);

    //Take top 5 beers
    var top5Beers = uniqueBeersArray.slice(-5);

    //Create JSON string so d3 can process it
    var beerJSONString = "[";
    for (var i = 0; i < top5Beers.length; i++) {
        var beerJSONStringTemp = "{\"beerName\":\"" + top5Beers[i][0] + "\", \"value\":" + top5Beers[i][1] + "}";

        if (i != top5Beers.length - 1)
            beerJSONStringTemp += ",";
        beerJSONString += beerJSONStringTemp;
    }
    beerJSONString += "]";
    var jsonParse = JSON.parse(beerJSONString);

    //Check if a bar chart already exists. If so remove it so we can generate a new one
    if (betterBarChartSVG != null) {
        betterBarChartSVG.remove();
    }

    //Generate bar chart. Attach to specific div and create an svg for it
    betterBarChartSVG = d3v4
        .select("#betterBarChart")
        .append("svg")
        .attr("width", 580)
        .attr("height", 480)
        .style("background-color", "#E7E6E1");
    var betterBarChartMargin = {top: 20, right: 20,bottom: 30, left: 50};
    var betterBarChartWidth = +betterBarChartSVG.attr("width") - betterBarChartMargin.left - betterBarChartMargin.right;
    var betterBarChartHeight = +betterBarChartSVG.attr("height") - betterBarChartMargin.top - betterBarChartMargin.bottom;

    //Tooltip base for the barchart when user hovers over an individual bar
    var betterBarChartToolTip = d3v4.select("#betterBarChart").append("div").attr("class", "betterBarChartToolTip")
        .style("opacity", 0);;

    //Create scales (modified from lecture)
    var betterBarChartX = d3v4.scaleBand().rangeRound([0, betterBarChartWidth]).padding(0.1);
    var betterBarChartY = d3v4.scaleLinear().rangeRound([betterBarChartHeight, 0]);

    //5 colors specifically for 5 beers.
    var beerColors = d3v4.scaleOrdinal().range(["#FBE6C2", "#F3CF7A", "#BE6A15", "#AC3F21", "#6E3B3B"]);

    //Add tooltip to bar
    var betterBarChartG = betterBarChartSVG.append("g")
        .attr("transform", "translate(" + 15 + "," + betterBarChartMargin.top + ")")
        .on("mouseover", function(d) {
            betterBarChartToolTip.transition()
                .duration(200)
                .style("opacity", 0.9);
            betterBarChartToolTip
                .style("left", (d3v4.event.clientX - 1075) + "px")
                .style("top", (d3v4.event.clientY - 90) + "px");
        }).on("mousemove", function(d) {
            betterBarChartToolTip
                .style("left", (d3v4.event.clientX - 1075) + "px")
                .style("top", (d3v4.event.clientY - 90) + "px");
        });

    //Attach beer name
    betterBarChartX.domain(jsonParse.map(function(d) {
        return d.beerName;
    }));
    //Attach beer count value
    betterBarChartY.domain([0, d3v4.max(jsonParse, function(d) {
        return d.value;
    })]);

    //Add x axis labels
    betterBarChartG.append("g")
        .attr("class", "axis-betterBarChartX")
        .attr("transform", "translate(0," + betterBarChartHeight + ")")
        .call(d3v4.axisBottom(betterBarChartX))
        .selectAll(".tick text")
        .call(wrap, betterBarChartX.bandwidth())

    //Add y axis labels
    betterBarChartG.append("g")
        .attr("class", "axis-betterBarChartY")
        .call(d3v4.axisLeft(betterBarChartY).ticks(5).tickFormat(function(d) {
            return parseInt(d);
        }).tickSizeInner([-betterBarChartWidth]))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "0.71em")
        .attr("text-anchor", "end")
        .attr("fill", "#5D6971")

    //Generate bar for individual beer
    betterBarChartG.selectAll(".bar")
        .data(jsonParse)
        .enter().append("rect")
        .attr("x", function(d) {
            return betterBarChartX(d.beerName);
        })
        .attr("y", function(d) {
            return betterBarChartY(d.value);
        })
        .attr("width", betterBarChartX.bandwidth())
        .attr("height", function(d) {
            return betterBarChartHeight - betterBarChartY(d.value);
        })
        .attr("fill", function(d) {
            return beerColors(d.beerName);
        })
        .on("mousemove", function(d) {
            betterBarChartToolTip
                .style("left", (d3v4.event.pageX) + "px")
                .style("top", (d3v4.event.pageY) + "px")
                .attr("style", "display: block;")
                .html((d.beerName) + "<br>" + "Count: " + (d.value));
        })
        .on("mouseout", function(d) {
            betterBarChartToolTip.style("display", "none");
        });
}

/*
    Sort function to determine top 5
*/
function sortFunction(a, b) {
    if (a[1] === b[1]) {
        return 0;
    } else {
        return (a[1] < b[1]) ? -1 : 1;
    }
}
/*
    Some beer names are too long
    This wrap function helps wrap it to next line to fit the chart appropriately
*/
function wrap(text, width) {
    text.each(function() {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em")
        while (word = words.pop()) {
            line.push(word)
            tspan.text(line.join(" "))
            if (tspan.node().getComputedTextLength() > width) {
                line.pop()
                tspan.text(line.join(" "))
                line = [word]
                tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", `${++lineNumber * lineHeight + dy}em`).text(word)
            }
        }
    })
}