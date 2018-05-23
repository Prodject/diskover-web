/*
Copyright (C) Chris Park 2017
diskover is released under the Apache 2.0 license. See
LICENSE for the full license text.
 */

/*
 * d3 hardlinks analytics for diskover-web
 */

function getESJsonData() {

     // config references
     var chartConfig = {
         target: 'mainwindow',
         data_url: 'd3_data_hardlinks.php'
     };

     // loader settings
     var opts = {
         lines: 12, // The number of lines to draw
         length: 6, // The length of each line
         width: 3, // The line thickness
         radius: 7, // The radius of the inner circle
         color: '#EE3124', // #rgb or #rrggbb or array of colors
         speed: 1.9, // Rounds per second
         trail: 40, // Afterglow percentage
         className: 'spinner', // The CSS class to assign to the spinner
     };

     // loader settings
     var target = document.getElementById(chartConfig.target);

     // trigger loader
     var spinner = new Spinner(opts).spin(target);

     // get json data from Elasticsearch using php data grabber
     console.log("no json data in session storage, grabbing from Elasticsearch");

     // load json data from Elasticsearch
     d3.json(chartConfig.data_url, function(error, data) {
         // display error if data has error message
         if ((data && data.error) || error || data === null) {
             spinner.stop();
             console.warn("nothing found in Elasticsearch: " + error);
             document.getElementById('error').style.display = 'block';
             return false;
         }

         console.log("storing json data in session storage");
         // store in session Storage
         sessionStorage.setItem('diskover-hardlinks', JSON.stringify(data));

         // stop spin.js loader
         spinner.stop();

         renderHardLinksCharts(data);

     });
}

function renderHardLinksCharts(dataset) {

     // display charts container
     document.getElementById('hardlinkscharts-wrapper').style.display = 'block';

     // Bar chart (hardlinks counts)

     var valueLabelWidth = 20; // space reserved for value labels (right)
     var barHeight = 10; // height of one bar
     var barLabelWidth = 100; // space reserved for bar labels
     var barLabelPadding = 10; // padding between bar and bar labels (left)
     var gridChartOffset = 0; // space between start of grid and first bar
     var maxBarWidth = '86vw'; // width of the bar with the max value

     var totalcount = d3.sum(dataset, function(d) {
         return d.count;
     });

     var min = d3.min(dataset, function(d) {
         return d.count;
     });

     var max = d3.max(dataset, function(d) {
         return d.count;
     });

     // svg container element
     var svg = d3.select('#hardlinkscountchart').append("svg")
         .attr('width', '98vw')
         .attr('height', '199vh');

     var color = d3.scale.linear()
                .domain([min, max])
                .range(['black', 'green']);

     svg.append("g")
         .attr("class", "bars");
     svg.append("g")
         .attr("class", "barvaluelabel");
     svg.append("g")
         .attr("class", "barlabel");

     /* ------- TOOLTIP -------*/

     var tip = d3.tip()
         .attr('class', 'd3-tip')
         .html(function(d) {
             var percent = (d.count / totalcount * 100).toFixed(1) + '%';
             var files = '';
             d.files.forEach(function(f) {
                 files += f + '<br>\n';
             });
             return "<span style='font-size:10px;color:gray;'>" + files + "</span><br><span style='font-size:12px; color:white;'>inode: " + d.label + "</span><br><span style='font-size:12px; color:red;'>count: " + d.count + " (" + percent + ")</span>";
         });

     svg.call(tip);

     d3.select("hardlinkscountchart").append("div")
         .attr("class", "tooltip")
         .style("opacity", 0);

     /* ------- BARS -------*/

     // accessor functions
     var barLabel = function(d) {
         return d['label'];
     };
     var barValue = function(d) {
         return d['count'];
     };

     // scales
     var yScale = d3.scale.ordinal().domain(d3.range(0, dataset.length)).rangeBands([0, dataset.length * barHeight]);
     var y = function(d, i) {
         return yScale(i);
     };
     var yText = function(d, i) {
         return y(d, i) + yScale.rangeBand() / 2;
     };
     var x = d3.scale.linear().domain([0, d3.max(dataset, barValue)]).range([0, maxBarWidth]);

     // bars
     var bar = svg.select(".bars").selectAll("rect")
            .data(dataset.sort(function(a, b) { return d3.descending(a.count, b.count); }));

     bar.enter().append("rect")
         .attr('transform', 'translate(' + barLabelWidth + ',' + gridChartOffset + ')')
         .attr('height', yScale.rangeBand())
         .attr('y', y)
         .attr('class', 'bars')
         .style('fill', function(d) {
             return color(d.count);
         })
         .attr('width', function(d) {
             return x(barValue(d));
         })
         .on("click", function(d) {
             document.location.href='advanced.php?&submitted=true&p=1&inode=' + d.label + '&doctype=file';
         })
         .on("mouseover", function(d) {
             tip.show(d);
         })
         .on('mouseout', function(d) {
             tip.hide(d)
         })
         .on('mousemove', function() {
             return tip
                 .style("top", (d3.event.pageY - 10) + "px")
                 .style("left", (d3.event.pageX + 10) + "px");
         })
         .on("click", function(d) {
             document.location.href='advanced.php?>&submitted=true&p=1&inode=' + d.label + '&doctype=file';
         });


     bar
         .transition().duration(750)
         .attr("width", function(d) {
             return x(barValue(d));
         });

     bar.exit().remove();

     // bar labels
     var barlabel = svg.select(".barlabel").selectAll('text').data(dataset);

     barlabel.enter().append('text')
         .attr('transform', 'translate(' + (barLabelWidth - barLabelPadding) + ',' + gridChartOffset + ')')
         .attr('y', yText)
         .attr("dy", ".35em") // vertical-align: middle
         .attr("class", "barlabel")
         .text(barLabel);

     barlabel.exit().remove();

     // bar value labels
     var barvaluelabel = svg.select(".barvaluelabel").selectAll('text').data(dataset);

     barvaluelabel.enter().append("text")
         .attr('transform', 'translate(' + barLabelWidth + ',' + gridChartOffset + ')')
         .attr("dx", 3) // padding-left
         .attr("dy", ".35em") // vertical-align: middle
         .attr("class", "barvaluelabel");

     barvaluelabel
         .attr("x", function(d) {
             return x(barValue(d));
         })
         .attr("y", yText)
         .text(function(d) {
             return barValue(d);
         });

     barvaluelabel.exit().remove();

}

console.time('loadtime')
// check if json data stored in session storage
root = JSON.parse(sessionStorage.getItem("diskover-hardlinks"));

// get data from Elasticsearh if no json in session storage
if (!root) {
    getESJsonData();
} else {
    console.log("using cached json data in session storage");
    renderHardLinksCharts(root);
}

console.timeEnd('loadtime');
