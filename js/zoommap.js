

//Setup size and projection
var width = 700;
var height = 480;
var active = d3.select(null);

//Creates generic USA projection with flat layout
var projection = d3.geo.albersUsa()
    .scale(1000)
    .translate([width / 2, height / 2]);

//Scale based on user zoom
//You can adjust how close the user can zoom by changing the last number in scaleExtent()
var zoom = d3.behavior.zoom()
    .translate([0, 0])
    .scale(1)
    .scaleExtent([1, 16])
    .on("zoom", zoomed);

var path = d3.geo.path().projection(projection);


// Add svg canvas to the map
var svg = d3.select("#map").append("svg")
    .attr("style", "")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "#4682B4")
    .on("click", stopped, true);

// Add background to svg canvas.
svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .on("click", reset);

var g = svg.append("g");

var stateAbbrev = {};

// Enable free zooming. Seems to conflict with fullpage.js most of the time (but not all the time)
svg.call(zoom).call(zoom.event);

var breweryData = [];
var beersData = [];
//Load map data
d3.json("data/us.json", function(error, us) {
    if (error) throw error;
    d3.tsv("data/us-state-names.tsv", function(tsv) {
        tsv.forEach(function(d, i) {
            stateAbbrev[d.id] = d.code;
        })
    });

    // Create state objects
    g.selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .enter().append("path")
        .attr("d", path)
        .attr("class", "feature")
        .on("click", clicked);

    // Create state boundaries
    g.append("path")
        .datum(topojson.mesh(us, us.objects.states, function(a, b) {
            return a !== b;
        }))
        .attr("class", "mesh")
        .attr("d", path);

    //Attach state codes
    g.append("path")
        .attr("class", "stateCodes")
        .selectAll("text")
        .data(topojson.feature(us, us.objects.states).features)
        .enter()
        .append("svg:text")
        .text(function(d) {
            return stateAbbrev[d.id];
        })
        .attr("x", function(d) {
            return path.centroid(d)[0];
        })
        .attr("y", function(d) {
            return path.centroid(d)[1];
        })
        .attr("text-anchor", "middle")
        .attr('fill', 'white');
});

//Load beer data
d3.csv("data/beers.csv", function(error, beers) {
    if (error) throw error;
    for (var i = 0; i < beers.length; i++) {
        var beerData = {
            "row_id": beers[i].row_id,
            "abv": beers[i].abv,
            "ibu": beers[i].ibu,
            "id": beers[i].id,
            "name": beers[i].name,
            "style": beers[i].style,
            "brewery_id": beers[i].brewery_id,
            "ounces": beers[i].ounces
        }
        beersData.push(beerData);
    }

});


//Load brewery data
d3.csv("data/breweries.csv", function(error, breweries) {
    if (error) throw error;

    //Process brewery data
    for (var i = 0; i < breweries.length; i++) {
        var combined = {
            "longitude": breweries[i].long,
            "latitude": breweries[i].lat,
            "name": breweries[i].name,
            "city": breweries[i].city,
            "state": breweries[i].state,
            "id": breweries[i].id
        };
        breweryData.push(combined);

    }

    //Add tooltip on user hover
    var div = d3.select("#map").append("div")
        .attr("class", "mapToolTip")
        .style("opacity", 0);

    // Add circles based on brewery coordinates. Attach tooltip to these circles only
    g.selectAll("circle")
        .data(breweryData).enter()
        .append("circle")
        .attr("cx", function(d) {
            return projection([d.longitude, d.latitude])[0]
        })
        .attr("cy", function(d) {
            return projection([d["longitude"], d["latitude"]])[1];
        })
        .attr("r", "1.5")
        .attr("fill", "green")
        .on("mouseover", function(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0.9);
            div.html("Name: " + d.name + "<br>City: " + d.city + ", " + d.state)
                .style("left", (d3.event.pageX - 175) + "px")
                .style("top", (d3.event.pageY - 100) + "px");
            d3.select(this).style("fill", "red");
        })
        .on("mouseout", function(d) {
            div.transition().duration(500).style("opacity", 0);
            d3.select(this).style("fill", "green");
        })
});



var breweryFilter = null;

// Zooms canvas when user clicks on a state
function clicked(d) {
    if (active.node() === this) return reset();
    active.classed("active", false);
    active = d3.select(this).classed("active", true);
    //Update graphs
    breweryFilter = breweryData.filter(function(e) {
        return e.state == stateAbbrev[d.id];
    });
    // Get list of beers within the state
    var listOfBeersInState = [];
    for (var i = 0; i < breweryFilter.length; i++) {
        var breweryID = breweryFilter[i].id;
        for (var j = 0; j < beersData.length; j++) {
            if (beersData[j].brewery_id == breweryID)
                listOfBeersInState.push(beersData[i].style);
        }
    }


    // Pass data into betterBarChart.js for further processing
    beerDataPass(listOfBeersInState);

    // Redraws boundaries for states
    var bounds = path.bounds(d);
    var dx = bounds[1][0] - bounds[0][0];
    var dy = bounds[1][1] - bounds[0][1];
    var x = (bounds[0][0] + bounds[1][0]) / 2;
    var y = (bounds[0][1] + bounds[1][1]) / 2;
    var scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height)));
    var translate = [width / 2 - scale * x, height / 2 - scale * y];

    svg.transition().duration(750).call(zoom.translate(translate).scale(scale).event);
}


/*
    Called when a user clicks an area that's not the state. Resets to the entire US
*/

function reset() {
    active.classed("active", false);
    active = d3.select(null);

    svg.transition()
        .duration(750)
        .call(zoom.translate([0, 0]).scale(1).event);
}

/*
    Adjusts canvas as user zooms
*/
function zoomed() {
    g.style("stroke-width", 1.5 / d3.event.scale + "px");
    g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

// If the drag behavior prevents the default click,
// also stop propagation so we don’t click-to-zoom.
function stopped() {
    if (d3.event.defaultPrevented) d3.event.stopPropagation();
}