
beerCountData = [];
//Read Count Data
d3v4.csv("data/beercount.csv", function(error, beer) {
    if (error) throw error;

    //Process brewery data
    for (var i = 0; i < beer.length; i++) {
        var combined = {
            "id": beer[i].id,
            "name": beer[i].Name,
            "count": beer[i].Count
        };
        beerCountData.push(combined);

    }

    generateBubblePlot()

});



function generateBubblePlot() {
    // Determine size of bubble plot
    var bubbleDiameter = 750;
    var bubbleFormat = d3v4.format(",d");
    var bubbleColor = d3v4.scaleOrdinal(d3v4.schemeCategory20c);

    var bubble = d3v4.pack().size([bubbleDiameter, bubbleDiameter]).padding(1.0);

    // Create svg canvas
    var bubbleSVG = d3v4.select("#bubblePlot").append("svg")
        .attr("width", bubbleDiameter)
        .attr("height", bubbleDiameter)
        .attr("class", "bubble");
    // So apparently d3 v4 hierarchy can't read JSON data without the children header for bubble plots? Sure, I guess
    var beerDataInAFancyJSONThatD3CanRead = {
        "children": beerCountData
    }

    // Generate circle sizes
    var bubbleRoot = d3v4.hierarchy(beerDataInAFancyJSONThatD3CanRead)
        .sum(function(d) {
            return d.count
        })
        .sort(function(a, b) {
            return b.count - a.count
        });

    // Create bubble nodes and add tooltip to them for hover
    var bubbleNode = bubbleSVG.selectAll(".node").data(bubble(bubbleRoot).descendants())
        .enter()
        .filter(function(d) {
            return !d.children
        })
        .append("g")
        .attr("class", "node")
        .attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        }).on("mouseover", function(d) {
            bubbleToolTip.transition()
                .duration(200)
                .style("opacity", 0.9);
            bubbleToolTip.html("<b>Name: " + d.data.name + "<br>Count: " + d.data.count + "</b>")
                .style("left", (d3v4.event.clientX - 660) + "px")
                .style("top", (d3v4.event.clientY - 30) + "px");
        }).on("mousemove", function(d) {
            bubbleToolTip
                .style("left", (d3v4.event.clientX - 660) + "px")
                .style("top", (d3v4.event.clientY - 30) + "px");
        }).on("mouseleave", function(d) {
            bubbleToolTip.transition().duration(200).style("opacity", 0);
        });


    // Tooltip base
    var bubbleToolTip = d3v4.select('#bubblePlot').append("div")
        .attr("class", "bubbleToolTip")
        .style("opacity", 0);
        
    // Draw bubble/node with a circle
    bubbleNode.append("circle").attr("r", function(d) {
        return d.r
    }).style("fill", function(d) {
        return bubbleColor(d.data.name)
    })

}