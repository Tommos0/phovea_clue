import {AVisInstance} from "../caleydo_core/vis";
import {SimHash} from "./simhash"
import {isUndefined, indexOf, mod} from "../caleydo_core/main";
import lineup = require('lineupjs')
import tables = require('../caleydo_core/table');
import {numberCol2} from "../targid2/LineUpView";
import {EventHandler} from "../caleydo_core/event";

import C = require('../caleydo_core/main');
import $ = require('jquery');
import ranges = require('../caleydo_core/range');
import idtypes = require('../caleydo_core/idtype');
import provenance = require('./prov');
import provvis = require('./provvis')
import d3 = require('d3');
import vis = require('../caleydo_core/vis');
import {StateNode} from "./prov";

interface Weight {
    name;
    value;
    color;
    active;
}


export class LinupStateView extends vis.AVisInstance {
    protected node;
    private config;
    private lineup;

    private lstack;
    private cstack;
    private rstack;

    private lu;
    private luDataProvider
    private arr;


    constructor(container, public data:provenance.ProvenanceGraph) {
        super()
        this.node = container;
        this.initialize()
        SimHash.hasher.on('weights_changed', this.updateWeights.bind(this))
        this.data.on('add_state', this.onExecutionStartedListener.bind(this));
        this.data.on('action-execution-complete', this.onStateAddedListener.bind(this));
        this.data.on('select_state', this.stateSelectionChanged.bind(this));
        return this;
    }

    private executionToStateRunning:StateNode = null;

    onExecutionStartedListener(event:any, state:provenance.StateNode) {
        if (this.executionToStateRunning === null) {
            this.executionToStateRunning = state;
        } else {
            throw Error("Two executions are run in paralell")
        }
    }

    onStateAddedListener(event:any, state:provenance.StateNode) {
        if (this.executionToStateRunning === null) return
        if (this.executionToStateRunning === state) {
            this.recalcStateSim(event, state)
            this.executionToStateRunning = null;
        }
    }

    stateSelectionChanged(event:any, state:provenance.StateNode) {
        if (event.args[1] === "selected") this.recalcStateSim(event, state)
    }

    recalcStateSim(event:any, state:provenance.StateNode) {
        //this.fillArr();
        //this.luDataProvider.data =this.arr
        //this.lu.update()
        this.lu.destroy()
        this.initialize(state);
    }

    fillArr(state:provenance.StateNode) {
        this.arr = []
        //let state:StateNode = this.data.selectedStates(idtypes.defaultSelectionType)[0]
        if (isUndefined(state) || state === null) return;
        let allstates = this.data.states;
        allstates.forEach(function (s) {
          s.lineUpIndex = -1;
        })
        for (let i = 0; i < allstates.length; i++) {
            let currState:StateNode = <StateNode>allstates[i];
            if (state === currState) continue;
            let sim = state.getSimForLineupTo(currState)
            this.arr = this.arr.concat({
                "ld": sim[0][0], "lv": sim[0][1], "ls": sim[0][2], "ll": sim[0][3], "la": sim[0][4],
                "cd": sim[1][0], "cv": sim[1][1], "cs": sim[1][2], "cl": sim[1][3], "ca": sim[1][4],
                "rd": sim[2][0], "rv": sim[2][1], "rs": sim[2][2], "rl": sim[2][3], "ra": sim[2][4], "state":currState
            })
            currState.lineUpIndex = i;
        }
    }


    updateWeights() {
        let width:number = 48;
        let weights = SimHash.hasher.categoryWeighting
        this.lstack.setWeights(weights);
        this.lstack.setWidth(width);
        this.cstack.setWeights(weights);
        this.cstack.setWidth(width);
        this.rstack.setWeights(weights);
        this.rstack.setWidth(width);
        this.lu.update();
    }

    private static classColors = ['#e41a1c', '#377eb8', '#984ea3', '#ffff33', '#ff7f00']

    initialize(reason:provenance.StateNode = null) {
        var desc = [
            {label: 'data', type: 'number', column: 'ld', 'domain': [0, 1], color: LinupStateView.classColors[0]},
            {label: 'visual', type: 'number', column: 'lv', 'domain': [0, 1], color: LinupStateView.classColors[1]},
            {label: 'selection', type: 'number', column: 'ls', 'domain': [0, 1], color: LinupStateView.classColors[2]},
            {label: 'layout', type: 'number', column: 'll', 'domain': [0, 1], color: LinupStateView.classColors[3]},
            {label: 'analysis', type: 'number', column: 'la', 'domain': [0, 1], color: LinupStateView.classColors[4]},
            {label: 'data', type: 'number', column: 'cd', 'domain': [0, 1], color: LinupStateView.classColors[0]},
            {label: 'visual', type: 'number', column: 'cv', 'domain': [0, 1], color: LinupStateView.classColors[1]},
            {label: 'selection', type: 'number', column: 'cs', 'domain': [0, 1], color: LinupStateView.classColors[2]},
            {label: 'layout', type: 'number', column: 'cl', 'domain': [0, 1], color: LinupStateView.classColors[3]},
            {label: 'analysis', type: 'number', column: 'ca', 'domain': [0, 1], color: LinupStateView.classColors[4]},
            {label: 'data', type: 'number', column: 'rd', 'domain': [0, 1], color: LinupStateView.classColors[0]},
            {label: 'visual', type: 'number', column: 'rv', 'domain': [0, 1], color: LinupStateView.classColors[1]},
            {label: 'selection', type: 'number', column: 'rs', 'domain': [0, 1], color: LinupStateView.classColors[2]},
            {label: 'layout', type: 'number', column: 'rl', 'domain': [0, 1], color: LinupStateView.classColors[3]},
            {label: 'analysis', type: 'number', column: 'ra', 'domain': [0, 1], color: LinupStateView.classColors[4]}
        ];
        //this.arr = [{"ld":1, "lv":1, "ls":1, "ll":1, "la":1,"cd":1, "cv":1, "cs":1, "cl":1, "ca":1,"rd":1, "rv":1, "rs":1, "rl":1, "ra":1}]

        this.fillArr(reason)
        this.luDataProvider = new lineup.provider.LocalDataProvider(this.arr, desc);
        var r = this.luDataProvider.pushRanking();

        this.lstack = this.luDataProvider.create(lineup.model.createStackDesc('Selected'));
        r.push(this.lstack)
        this.lstack.push(this.luDataProvider.create(desc[0]))
        this.lstack.push(this.luDataProvider.create(desc[1]))
        this.lstack.push(this.luDataProvider.create(desc[2]))
        this.lstack.push(this.luDataProvider.create(desc[3]))
        this.lstack.push(this.luDataProvider.create(desc[4]))

        this.cstack = this.luDataProvider.create(lineup.model.createStackDesc('Intersection'));
        r.push(this.cstack)
        this.cstack.push(this.luDataProvider.create(desc[5]));
        this.cstack.push(this.luDataProvider.create(desc[6]));
        this.cstack.push(this.luDataProvider.create(desc[7]));
        this.cstack.push(this.luDataProvider.create(desc[8]));
        this.cstack.push(this.luDataProvider.create(desc[9]));

        this.rstack = this.luDataProvider.create(lineup.model.createStackDesc('Other'));
        r.push(this.rstack)
        this.rstack.push(this.luDataProvider.create(desc[10]));
        this.rstack.push(this.luDataProvider.create(desc[11]));
        this.rstack.push(this.luDataProvider.create(desc[12]));
        this.rstack.push(this.luDataProvider.create(desc[13]));
        this.rstack.push(this.luDataProvider.create(desc[14]));

        this.lu = lineup.create(this.luDataProvider, this.node, {
            /*
             additionalDesc : [
             lineup.model.StackColumn.desc('+ Stack')
             ],
             */
            /*htmlLayout: {
             autoRotateLabels: true
             },*/
            body: {
                renderer: 'svg',
                visibleRowsOnly: false
            },
            manipulative: false
        });
        this.cstack.sortByMe(false);
        this.updateWeights()
        this.lu.update();
        this.registerListeners()
    }

    registerListeners() {
        this.lu.on("selectionChanged", this.selectStateListener.bind(this))
        this.lu.on("hoverChanged", this.hoverListener.bind(this))
        this.data.on("select", this.selectionChangedListener.bind(this))
    }

    private selectionChangedListener = (event: any, type: string, act: ranges.Range) => {
      if (type === idtypes.hoverSelectionType) {
        const selectedStates = this.data.selectedStates(type);
        if (selectedStates.length === 0) this.luDataProvider.clearSelection()
        else {
          this.luDataProvider.select(selectedStates[0].lineUpIndex)
        }
      }

    }

    private lastHovered:number = -1
    private hoverListener(index:number) {
        if (index < 0) {
            this.arr[this.lastHovered].state.isHoveredInLineUp = false;
            this.lastHovered = -1
        } else {
            //console.log(this.arr[index])
            this.arr[index].state.isHoveredInLineUp = true;
            this.lastHovered = index;
        }
        this.data.fire('linupHoverChanged')
    }

    private selectStateListener(index:number) {
        if (index < 0) return
        /*
        d3.event.stopPropagation();
        this.data.selectState(this.arr[index].state,idtypes.toSelectOperation(d3.event))
        this.data.jumpTo(this.arr[index].state);
        */
        //TODO draw state similarity view
    }
}

export class WeightInterface {

    protected cats = ["data", "visual", "selection", "layout", "analysis"]
    protected weights:Weight[] = [];
    protected cumSum:number[] = []
    protected scalefactor:number = (300 - 4) / 100

    protected catContainer;
    protected barContainer;
    protected faString:string[] = ["fa-database", "fa-bar-chart", "fa-pencil-square", "fa-desktop", "fa-gear"]

    protected closeWeightSelection;
    protected openWeightSelection;

    constructor(container) {
        this.catContainer = container;
        this.barContainer = this.catContainer.select(".barContainer")
        let rawWeights = SimHash.hasher.categoryWeighting;
        this.cumSum[0] = 0
        for (var i = 1; i <= rawWeights.length; i++) {
            this.cumSum[i] = this.cumSum[i - 1] + rawWeights[i - 1]
        }
        var cols = ['#e41a1c', '#377eb8', '#984ea3', '#ffff33', '#ff7f00']
        this.weights[0] = {name: this.cats[0], value: rawWeights[0], color: cols[0], active: true}
        this.weights[1] = {name: this.cats[1], value: rawWeights[1], color: cols[1], active: true}
        this.weights[2] = {name: this.cats[2], value: rawWeights[2], color: cols[2], active: true}
        this.weights[3] = {name: this.cats[3], value: rawWeights[3], color: cols[3], active: true}
        this.weights[4] = {name: this.cats[4], value: rawWeights[4], color: cols[4], active: true}

        //this.update(false);
        this.initialize()
        return this;
    }

    public close() {
        this.closeWeightSelection()
    }

    protected catsWeightMap(name):Weight {
        return this.weights[this.cats.indexOf(name)]
    }

    protected getNextActive(index) {
        let nextIndex = -1
        for (var i = 1; i < this.weights.length; i++) {
            if (this.weights[mod(index + i, 5)].active) {
                nextIndex = mod(index + i, 5)
                break;
            }
        }
        return nextIndex
    }

    protected getPreviousActive(index) {
        let nextIndex = -1
        for (var i = 1; i < this.weights.length; i++) {
            if (this.weights[mod(index - i, 5)].active) {
                nextIndex = mod(index - i, 5)
                break;
            }
        }
        return nextIndex
    }

    protected shadeColor(color, percent) {
        var f = parseInt(color.slice(1), 16), t = percent < 0 ? 0 : 255, p = percent < 0 ? percent * -1 : percent, R = f >> 16, G = f >> 8 & 0x00FF, B = f & 0x0000FF;
        return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G) * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1);
    }

    protected update(transitions:boolean) {
        let _that = this;
        let transitionDuration = 300;
        let bars = this.barContainer.selectAll("div")
            .data(this.weights, function (d) {
                return d.name;
            })
        let lines = this.catContainer.selectAll("line")
            .data(this.weights, function (d) {
                return d.name;
            })

        //update


        //enter
        bars.enter()
            .append("div")
            .classed("bar", true)
            .classed("adjustable", true)
        lines.enter()
            .append("line")
            .style("stroke", function (d) {
                return d.color
            })

        //update+enter
        let b = <any>bars
        if (transitions) b = <any>bars.transition().duration(transitionDuration)
        b.style("left", "0px")
            .style("height", function (d) {
                return d.value * _that.scalefactor + "px";
            })
            .style("top", function (d, i) {
                return _that.cumSum[i] * _that.scalefactor + "px"
            })
            .style("width", "30px")
            .text("")


        let l = <any>lines
        if (transitions) l = <any>lines.transition().duration(transitionDuration)
        l.style("stroke", function (d) {
            return d.color
        })
            .attr("y1", function (d, i) {
                return (_that.cumSum[i] + _that.cumSum[i + 1]) / 2 * _that.scalefactor + 10
            })
            .attr("y2", function (d, i) {
                return i * 26 + 90 + 13
            })
            .attr("x1", "50")
            .attr("x2", "120")
            .style("opacity", function (d) {
                return d.active ? 1 : 0
            })


        d3.selectAll('.categoryUnit label').transition()
            .delay(transitionDuration)
            .style("background-color", function () {
                return _that.shadeColor(_that.catsWeightMap($(this).attr("title")).color, 0.3)
            })


        //set weights
        let w = [0, 0, 0, 0, 0]
        w[_that.cats.indexOf(_that.weights[0].name)] = _that.weights[0].value
        w[_that.cats.indexOf(_that.weights[1].name)] = _that.weights[1].value
        w[_that.cats.indexOf(_that.weights[2].name)] = _that.weights[2].value
        w[_that.cats.indexOf(_that.weights[3].name)] = _that.weights[3].value
        w[_that.cats.indexOf(_that.weights[4].name)] = _that.weights[4].value
        SimHash.hasher.categoryWeighting = w

        //update handlePos
        let handles = this.catContainer.selectAll(".chart_handle")
        let h = <any>handles
        if (transitions) h = <any>handles.transition().duration(transitionDuration)
        h.style("left", "10px")
            .style("top", function (d, i) {
                return _that.cumSum[i + 1] * _that.scalefactor + "px"
            })
            .style("opacity", function (d) {
                let setActive = _that.catsWeightMap($(this).attr('id')).active;
                let index = _that.cats.indexOf($(this).attr('id'))
                if (_that.getNextActive(index) <= index) setActive = false;
                return setActive ? 1 : 0;
            })
            .style("z-index", function (d) {
                return _that.catsWeightMap($(this).attr('id')).active ? 4 : -4;
            })

        //update textfields
        let label = <any>d3.selectAll(".categoryUnit input.catValue")
        if (transitions) label = label.transition().duration(transitionDuration)
        label.attr("value", function () {
            return Math.round(_that.catsWeightMap($(this).attr('id')).value) / 100
        })
    }


    initialize() {
        let _that = this;
        let categoryUnit = function (catName:string, defaultWeight:number, faString:string):string {
            let capitalizeFirstLetter = function (string) {
                return string.charAt(0).toUpperCase() + string.slice(1);
            }
            return (
            "<div class='categoryUnit' id='" + catName + "'>" +
            "<input class='catValue' type='number' min='0' max='1' value='" + defaultWeight / 100 + "' id='" + catName + "'></input>" +
            "<label class='btn btn-default btn-xs' title='" + catName + "'>" +
            "<input type='checkbox' autocomplete='off' name='category' value='" + catName + "'> <i class='fa " + faString + "'></i>" + capitalizeFirstLetter(catName) +
            "</label>" +
            "</div>")
        }

        $(".controlContainer").append(categoryUnit(this.weights[0].name, this.weights[0].value, this.faString[0]))
        $(".controlContainer").append(categoryUnit(this.weights[1].name, this.weights[1].value, this.faString[1]))
        $(".controlContainer").append(categoryUnit(this.weights[2].name, this.weights[2].value, this.faString[2]))
        $(".controlContainer").append(categoryUnit(this.weights[3].name, this.weights[3].value, this.faString[3]))
        $(".controlContainer").append(categoryUnit(this.weights[4].name, this.weights[4].value, this.faString[4]))
        $('.provenance-similarity-vis').hide();

        $('.categoryUnit label input[type=checkbox]').prop('checked', true);

        let handleHtml = function (id:string) {
            return (
            "<div class='chart_handle' id='" + id + "'>" +
            "<i class='fa fa-arrow-right' aria-hidden='true'></i>" +
            "</div>")
        }

        $(".catWeightContainer").append(handleHtml(this.cats[0]))
        $(".catWeightContainer").append(handleHtml(this.cats[1]))
        $(".catWeightContainer").append(handleHtml(this.cats[2]))
        $(".catWeightContainer").append(handleHtml(this.cats[3]))

        var dragResize = d3.behavior.drag()
            .on('drag', function () {
                let x = d3.mouse(_that.barContainer.node())[1] / _that.scalefactor;
                if (x > 100) x = 100
                let id = _that.cats.indexOf($(this).attr("id"))
                let diff = _that.cumSum[id + 1] - x
                _that.weights[id].value -= diff
                let next = _that.getNextActive(id)
                let prev = _that.getPreviousActive(id)
                let isLast = next <= id
                if (next <= id) {
                    _that.weights[prev].value += diff
                } else {
                    _that.weights[next].value += diff
                }

                _that.cumSum[0] = 0
                for (var i = 1; i <= _that.weights.length; i++) {
                    _that.cumSum[i] = _that.cumSum[i - 1] + _that.weights[i - 1].value
                }
                _that.update(false)
                SimHash.hasher.fire("weights_changed")
                //that.update()
            });
        d3.selectAll(".chart_handle").call(dragResize);


        this.closeWeightSelection = function () {
            let _that = this;
            $(".controlContainer").hide()
            d3.select(".controlContainer").transition()
                .duration(150)
                .style("opacity", 0)
            this.barContainer.style("width", "280px")
                .transition()
                .style("left", "0px")
                .style("top", "0px")
                .style("width", "300px")
            this.catContainer.transition()
                .delay(300)
                .duration(400)
                .style("background-color", "#60AA85").each(function () {
                _that.catContainer.classed("closed", true)
                    .classed("open", false)
            })
            this.catContainer.transition()
                .delay(75)
                .duration(100)
                .style("height", "22px")
            this.catContainer.selectAll(".chart_handle").transition()
                .style("opacity", 0)
                .duration(100)
                .each(function () {
                    $(".chart_handle").hide()
                })
            d3.select(".lineContainer").transition()
                .duration(100)
                .style("opacity", 0)
                .each(function () {
                    $("lineContainer").hide()
                })
            d3.select(".lineContainer").transition()
                .delay(75)
                .duration(100)
                .style("height", "22px")
            this.barContainer.selectAll(".adjustable").transition()
                .text(function (d, i) {
                    return (_that.cats[i] + " " + Math.round(d.value) + "%");
                })
                .style("top", "0px")
                .style("left", function (d, i) {
                    return _that.cumSum[i] * _that.scalefactor + "px"
                })
                .style("width", function (d) {
                    return d.value * _that.scalefactor + "px";
                })
                .style("height", "22px")
                .style("background-color", function (d, i) {
                    return d.color
                })
                //.style("opacity", 0.8)
                .style("color", function (d, i) {
                    return i >= 3 ? "black" : "white"
                })
            //.duration(2500)
            this.barContainer.selectAll(".adjustable")
                .classed("compact", true)
                .classed("adjustable", false)
        }.bind(this)

        this.openWeightSelection = function () {
            let _that = this;
            $(".controlContainer").show()
            $(".lineContainer").show()
            d3.select(".lineContainer").transition()
                .delay(150)
                .duration(150)
                .style("height", "300px")
                .style("opacity", 1)
            d3.select(".controlContainer").transition()
                .delay(150)
                .duration(150)
                .style("opacity", 1)
            $(".chart_handle").show()
            this.catContainer.selectAll(".chart_handle")
                .transition()
                .delay(150)
                .duration(150)
            this.barContainer.style("width", "30px")
                .transition()
                .style("left", "20px")
                .style("top", "10px")
            this.catContainer.transition()
                .style("height", "320px")
            this.barContainer.selectAll(".compact").transition()
                .style("left", "0px")
                .style("height", function (d) {
                    return d.value * _that.scalefactor + "px";
                })
                .style("top", function (d, i) {
                    return _that.cumSum[i] * _that.scalefactor + "px"
                })
                .style("width", "30px")
                .text("")
            //.duration(1500)
            this.barContainer.selectAll(".compact")
                .classed("compact", false)
                .classed("adjustable", true)
            this.catContainer.classed("closed", false)
                .classed("open", true)
            this.update(true)
        }.bind(this)

        this.closeWeightSelection()
        this.update(false)
        this.catContainer.on('click', this.openWeightSelection)
        this.catContainer.on('mouseleave', this.closeWeightSelection)

        d3.selectAll(".categoryUnit label input").on('change', function () {
            let index = _that.cats.indexOf($(this).attr("value"))
            if (_that.weights[index].active) {
                //deactivate
                _that.weights[_that.getNextActive(index)].value += _that.weights[index].value
                _that.weights[index].value = 0
            } else {
                //activate
                let nextIndex = _that.getNextActive(index)
                if (nextIndex < 0) {
                    _that.weights[index].value = 100
                } else {
                    let val = _that.weights[nextIndex].value
                    _that.weights[index].value = val / 2
                    _that.weights[nextIndex].value = val / 2
                }
            }
            _that.weights[index].active = !_that.weights[index].active
            _that.cumSum[0] = 0
            for (var i = 1; i <= _that.weights.length; i++) {
                _that.cumSum[i] = _that.cumSum[i - 1] + _that.weights[i - 1].value
            }
            _that.update(true)
            SimHash.hasher.fire("weights_changed")
            //that.update();
        })
    }
}
