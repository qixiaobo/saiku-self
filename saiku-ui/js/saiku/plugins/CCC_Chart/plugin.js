/*  
 *   Copyright 2012 OSBI Ltd
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

/**
 * Renders a chart for each workspace
 */
var Chart = Backbone.View.extend({
    events: {
        'click #charteditor' : 'show_editor',
        'click #mapeditor' : 'show_map_config'

    },
    initialize: function(args) {
        
        this.workspace = args.workspace;
        
        // Create a unique ID for use as the CSS selector
        this.id = _.uniqueId("chart_");
        $(this.el).attr({ id: this.id });

        this.renderer = new SaikuChartRenderer(null, { htmlObject: $(this.el), zoom: true, adjustSizeTo: ".workspace_results", workspace:this.workspace });

        // Bind table rendering to query result event
        _.bindAll(this, "receive_data", "show", "render_view", "exportChart");
        var self = this;
        this.workspace.bind('query:run',  function() {
            if (! $(self.workspace.querytoolbar.el).find('.render_chart').hasClass('on')) {
                return false;
            }
            self.renderer.data = {};
            self.renderer.data.resultset = [];
            self.renderer.data.metadata = [];
            $(self.el).find('.canvas_wrapper').hide();
            return false;
        });
        
        this.workspace.bind('query:result', this.receive_data);

         var pseudoForm = "<div id='nav" + this.id + "' style='display:none' class='nav'><form id='svgChartPseudoForm' target='_blank' method='POST'>" +
                "<input type='hidden' name='type' class='type'/>" +
                "<input type='hidden' name='svg' class='svg'/>" +
                "</form></div>";
        if (isIE) {
            pseudoForm = "<div></div>";
        }
        this.nav =$(pseudoForm);
 //$(this.el).append('<div style="display: block !important;" id="charteditor" class="chart_editor">HELLOOOOOO</div>');

        $(this.el).append(this.nav);


    },

    getData: function() {
        return this.data;
    },

    exportChart: function(type) {
        var svgContent = new XMLSerializer().serializeToString($('svg')[0]);
        var rep = '<svg xmlns="http://www.w3.org/2000/svg" ';
        if (svgContent.substr(0,rep.length) != rep) {
            svgContent = svgContent.replace('<svg ', rep);    
        }
        svgContent = '<!DOCTYPE svg [<!ENTITY nbsp "&#160;">]>' + svgContent;
        
        var form = $('#svgChartPseudoForm');
        form.find('.type').val(type);
        form.find('.svg').val(svgContent);
        form.attr('action', Settings.REST_URL + this.workspace.query.url() + escape("/../../export/saiku/chart"));
        form.submit();
        return false;
    },

    show_editor:function(event) {
        var $currentTarget = $(event.currentTarget);
        if ($currentTarget.attr('disabled') !== 'disabled') {
            (new ChartEditor({ data: this.renderer, workspace: this.workspace })).render().open();
        }
    },
    show_map_config: function(event){
        (new MapEditor({data: this.renderer, workspace: this.workspace})).render().open();
    },
    render_view: function() {
    	// Append chart to workspace, called by workspace
        $(this.workspace.el).find('.workspace_results')
            .prepend($(this.el).hide());
    },
    
    show: function(event, ui) {
        var self = this;
        this.workspace.adjust();
        this.renderer.cccOptions.width = $(this.workspace.el).find('.workspace_results').width() - 40;
        this.renderer.cccOptions.height = $(this.workspace.el).find('.workspace_results').height() - 40;
        
        $(this.el).show();
        var hasRun = this.workspace.query.result.hasRun();
        //$(this.workspace.el).find('.query_toolbar').append('<div style="display: block !important;" id="charteditor" class="chart_editor">HELLOOOOOO</div>');
        if($(this.workspace.el).find('#charteditor').length ===0) {
            $(this.workspace.el).find('.query_toolbar_vertical').find('.options.chart.hide li:eq(0)').after('<li id="charteditor" class="seperator_vertical chart_editor"><a href="#charteditor" ' +
                'style="height:30px;" class="button">Properties</a></li>');
            if(Settings.MAPS) {
            	$(this.workspace.el).find('.query_toolbar_vertical').find('.options.chart.hide li:eq(1)').after('<li id="mapeditor"><a href="#map" ' +
                    'style="height:30px;" class="button">Map</a></li>');
            }

            $(this.workspace.el).find('.query_toolbar_vertical').find('#charteditor').on('click', function (event) {
                self.show_editor(event);
            });
            $(this.workspace.el).find('.query_toolbar_vertical').find('#mapeditor').on('click', function (event) {
                self.show_map_config(event);
            });
        }
        if (hasRun) {
            _.defer( function() {
                self.renderer.process_data_tree({ data: self.workspace.query.result.lastresult() }, true, true);
                var p = self.workspace.query.getProperty("saiku.ui.chart.options");
                self.renderer.switch_chart(self.renderer.type, {workspace: this.workspace, poption: p});
            });
        }



    },

 chart_editor: function() {
$('a#acharteditor').click();
return true;
},

    export_button: function(event) {
        var self = this;
        var $target = $(event.target).hasClass('button') ? $(event.target) : $(event.target).parent();
        
        var self = this;
        var $body = $(document);
        var $currentTarget = $(event.currentTarget);
        //$body.off('.contextMenu .contextMenuAutoHide');
        //$('.context-menu-list').remove();
        
        if ($currentTarget.parent().attr('disabled') !== 'disabled') {
            $.contextMenu('destroy', '.export_button');
            $.contextMenu({
                    selector: '.export_button',
                    trigger: 'left',
                    ignoreRightClick: true,
                    callback: function(key, options) {
                        self.workspace.chart.exportChart(key);
                    },
                    items: {
                        "png": {name: "PNG"},
                        "jpg": {name: "JPEG"},
                        "pdf": {name: "PDF"}
                    }
            });
            $target.contextMenu();
        }
    },

    properties_button: function(event) {
        var self = this;
        var $target = $(event.target).hasClass('button') ? $(event.target) : $(event.target).parent();

        var self = this;
        var $body = $(document);
        //$body.off('.contextMenu .contextMenuAutoHide');
        //$('.context-menu-list').remove();
        $target.html("hello");
    },
    receive_data: function(args) {
        if (! $(this.workspace.querytoolbar.el).find('.render_chart').hasClass('on')) {
            return;
        }
        this.workspace.adjust();
        this.renderer.process_data_tree(args, true, true);
        var p = this.workspace.query.getProperty("saiku.ui.chart.options");
        this.renderer.switch_chart(this.renderer.type, {workspace: this.workspace, poption: p});
        //_.delay(this.renderer.process_data_tree, 0, args, true, true);

        if (Settings.MAPS && Settings.MAPS_TYPE === 'OSM' && this.workspace.query.getProperty('saiku.ui.render.mode') === 'map') {
            var mapProperties = this.workspace.query.getProperty('saiku.ui.map.options');
            var mapType = this.workspace.query.getProperty('saiku.ui.render.type');
            var saikuMapRenderer = new SaikuMapRenderer(this, mapType, mapProperties, 'run_workspace_map');
            _.defer(function() {
                saikuMapRenderer.renderMap();
            });
        }
    }
});

// Not remove. Temporary style code. Migrate to styles.css in Saiku version 4.0.
Saiku.loadCSS('js/saiku/plugins/CCC_Chart/chart_editor.css');
Saiku.loadCSS('js/saiku/plugins/CCC_Chart/map_editor.css');
