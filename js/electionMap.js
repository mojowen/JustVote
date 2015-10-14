function ElectionMap(element, options) {
    var options = options || {}
    var config = options.config || this.constructor.prototype.config || {}
    var log_errors = this.constructor.prototype.log_errors || false

    this.create_projection = function() {
        var overlay = new google.maps.OverlayView()
        overlay.setMap(this.map)
        overlay.draw = function() {}
        this.projection = overlay.getProjection()
    }

    this.locations = []
    this.set_home = false
    this.set_zoom = 11
    this.set_county = options.county || false
    this.set_address = options.address || false

    var default_types = config.types

    this.point_types = {
        __load: function(types) { for( var i in types) this[i] = types[i]; },
        __default: function() { for( var i in this) { if( i.search('__') === -1 && Boolean(this[i]['default']) ) return i; } }
    }
    this.point_types.__load( options.point_types || default_types );
    this.set_type = options.type || this.point_types.__default() || 'all';

    this.geocoder = null;

    this.init = function() {
        this.geocoder = new google.maps.Geocoder()

        this.map = new google.maps.Map(
            canvas,
            {
                minZoom: 7,
                zoom: 7,
                center: new google.maps.LatLng(39,-105.5),
                disableDefaultUI: true,
                zoomControl: true
            }
        )
        this.create_projection()

        $.getJSON(
            config.url+'?alt=json-in-script&callback=?',
            function(response) {
                entries = response.feed.entry;
                for( var i=0; i < entries.length; i++ ) {
                    var point = new Point(entries[i], self);
                    if( i == 0 ) self.create_date_filters(point);
                    if( !!! point.errored ) self.locations.push(point);
                }
                self.county_zoom()
            }
        );

        $('#geocode').submit( function(e) {
            e.preventDefault();
            self.geocoder.geocode(
                {'address': $('#address').val()},
                function(results, status) {
                  if (status == google.maps.GeocoderStatus.OK) {

                    self.set_home = results[0].geometry.location;
                    self.active_county = find_county(results[0].address_components)
                    _gaq.push(['_trackEvent', 'County', this.active_county, 'Search']);

                    self.map.setCenter(self.set_home);
                    self.map.setZoom(self.set_zoom);
                    self.render_map()
                  }
                }
            );
        });
        $('#geolocate').click( function() {
            function setPosition(position) {
                self.set_home = new google.maps.LatLng(position.coords.latitude, position.coords.longitude)
                find_county_and_render(self.set_home)
                _gaq.push(['_trackEvent', 'County', this.active_county, 'Geolocate']);

                self.map.setCenter(self.set_home);
                self.map.setZoom(self.set_zoom);
            }
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(setPosition);
            } else {
                $(this).after('<br/>Not supported by your browser');
            }
        });

        google.maps.event.addListener(this.map, 'idle', function() {
            if (self.map.getZoom() > 9 && ! self.set_county ) {
                find_county_and_render( self.map.getCenter() )
                _gaq.push(['_trackEvent', 'County', this.active_county, 'Browse']);
            } else {
                self.create_projection()
            }
        });
        function find_county_and_render(center) {
            self.geocoder.geocode({'latLng': center}, function(results, status) {
                if( results && results[0] ) {
                    $('#address').val(results[0].formatted_address)
                    self.active_county = find_county(results[0].address_components)
                    self.render_map()
                }
            });
        }
    }

    this.render_map = function() {

        var nearby = [],
            $list = $('#list ul').empty(),
            $title = $list.prev('h3')

        for (var i = this.locations.length - 1; i >= 0; i--) {
            var location = this.locations[i];

            if( (this.set_type == 'all' || this.set_type == location.type )
                && location.county == (this.set_county || this.active_county) ) {
                    location.add_to_map();
                    nearby.push(location.distance_from())
            } else {
                location.remove_from_map()
            }
        };

        nearby = nearby.sort(function(a,b) { return a[1].is_open() ? -1 : b[1].is_open() ? 1 : 0; })
        if( this.set_home ) {
            nearby = nearby.sort(function(a,b) { return a[0] > b[0] ? 1 : -1; })
            $title.find('.closest').show()
        } else {
            $title.find('.closest').hide()
        }

        for (var i = 0; i < nearby.length; i++) {
            $list.append(nearby[i][1].to_html())
        };
        if( nearby.length > 0 ) $title.show().find('span.county').text(this.set_county || this.active_county)
        else $title.hide();
        this.create_projection()

    };
    this.counties = {
        'adams':'39.8398269, -104.19309179999999',
        'alamosa':'37.654039, -105.87600399999997',
        'arapahoe':'39.62031, -104.33264400000002',
        'archuleta':'37.1604318, -107.00670309999998',
        'baca':'37.394731, -102.52980279999997',
        'bent':'38.0036339, -103.08179029999997',
        'boulder':'40.07979643149095, -105.22863667890623',
        'broomfield':'39.9420154, -105.04405199999997',
        'chaffee':'38.7536679, -106.25221429999999',
        'cheyenne':'38.8002562, -102.62162109999997',
        'clear creek':'39.6904464, -105.6412527',
        'conejos':'37.2689711, -106.25221429999999',
        'costilla':'37.2049596, -105.50054829999999',
        'crowley':'38.2498631, -103.8216261',
        'custer':'38.0615578, -105.31311849999997',
        'delta':'38.8531357, -107.763621',
        'denver':'39.76161889999999, -104.9622498',
        'dolores':'37.7530272, -108.5225709',
        'douglas':'39.2587106, -104.93888529999998',
        'eagle':'39.576406, -106.72346390000001',
        'el paso':'38.9108325, -104.47233010000002',
        'elbert':'39.35370040000001, -104.19309179999999',
        'fremont':'38.5306514, -105.50054829999999',
        'garfield':'39.6584775, -107.763621',
        'gilpin':'39.8770159, -105.4536718',
        'grand':'40.0727382, -106.06401790000001',
        'gunnison':'38.6437083, -107.00670309999998',
        'hinsdale':'37.9316309, -107.38488310000002',
        'huerfano':'37.6125984, -104.93888529999998',
        'jackson':'40.6819242, -106.25221429999999',
        'jefferson':'39.5800298, -105.26629309999998',
        'kiowa':'38.3769671, -102.7135121',
        'kit carson':'39.3844507, -102.52980279999997',
        'la plata':'37.2125857, -107.763621',
        'lake':'39.1941167, -106.29929119999997',
        'larimer':'40.5566585,-105.067652', //'40.6955572, -105.5943388',
        'las animas':'37.2994909, -104.1001326',
        'lincoln':'39.0457549, -103.3587288',
        'logan':'40.7056181, -102.98961500000001',
        'mesa':'38.9585381, -108.61756259999999',
        'mineral':'37.6583677, -107.00670309999998',
        'moffat':'40.6138379, -108.23775190000003',
        'montezuma':'37.3257517, -108.61756259999999',
        'montrose':'38.468304, -108.1428669',
        'morgan':'40.2989226, -103.72891670000001',
        'otero':'37.9397663, -103.63627150000002',
        'ouray':'38.2016133, -107.763621',
        'park':'39.0897928, -105.5943388',
        'phillips':'40.53713339999999, -102.34638749999999',
        'pitkin':'39.159101, -106.81783769999998',
        'prowers':'37.84337560000001, -102.25479189999999',
        'pueblo':'38.2528534, -104.47233010000002',
        'rio blanco':'39.9814297, -108.23775190000003',
        'rio grande':'37.5749508, -106.44058719999998',
        'routt':'40.4771623, -107.10119309999999',
        'saguache':'38.0019623, -106.34637909999998',
        'san juan':'37.7573704, -107.71625',
        'san miguel':'37.9781237, -108.1428669',
        'sedgwick':'40.8568843, -102.34638749999999',
        'summit':'39.5911871, -106.06401790000001',
        'teller':'38.86115789999999, -105.17268160000003',
        'washington':'40.063745, -102.98961500000001',
        'weld':'40.3920718, -104.71582260000002',
        'yuma':'40.1448234, -102.25479189999999'
    }
    this.county_zoom = function(county) {
        var county = county || this.set_county;

        if( ! county || county.length < 1 ) return false;

        _gaq.push(['_trackEvent', 'County', county, 'Select']);

        var counter_center =  this.counties[ county ].split(',')
        this.set_county = county
        this.map.setCenter( new google.maps.LatLng(counter_center[0], counter_center[1]) )
        this.map.setZoom(this.set_zoom - 1)
        this.render_map();

        var placed_markers = this.locations.filter( function(point) { return point.marker }),
            none_visible = placed_markers.length > 0,
            current_zoom = this.map.getZoom()

        while( none_visible ) {
            var bounds = this.map.getBounds()
            for (var i = placed_markers.length - 1; i >= 0; i--) {
                if( bounds && bounds.contains( placed_markers[i].latlng ) && placed_markers[i].is_open() ) {
                    none_visible = false
                    break;
                }
            };
            current_zoom -= 1
            if( current_zoom == 7 ) none_visible = false
            if( none_visible ) this.map.setZoom(current_zoom)
        }
    }

    var self = this

    if( typeof window.google === 'undefined' ) {
        var callback_name = '___'+( new Date ).getTime()+'__init'
        window[ callback_name ] = function(result) {
            self.init()
            window[ callback_name ] = null
        }

        var script = document.createElement('script')
        script.type = "text/javascript"
        script.src = ["https://maps.googleapis.com/maps/api/js?",
                      "sensor=true&",
                      "libraries=geometry&",
                      "callback="+callback_name].join('')

        document.body.appendChild(script)
    } else {
        self.init();
    }

    this.date_filters = []
    this.create_date_filters = function(point) {
        var date_filters = []
        for( var key in point) {
            if( key.split('weekof').length > 1 ) {
                var date_string = key.split('weekof')[1],
                    month = date_string.split(/\d/)[0],
                    day = date_string.replace(/\D+/g,''),
                    year = (new Date()).getFullYear()
                var date = new Date([day, month, year].join(' '))

                date_filters.push({"date":date, "label": key})
            }
        }
        date_filters.sort(function(a,b) { return a.date - b.date });
        this.date_filters = date_filters;
    }
    this.closed_states = config.states || []

    function Point(data, election_map) {
        for( var g_key in data ) {
            var key = g_key.split('gsx$')
            if( key.length > 1 ) {
                this[ key[1] ] = data[g_key]['$t'];
            }
        }

        this.county = data.title['$t'].toLowerCase()
        var lat = this.latlng.split(',')[0],
            lng = this.latlng.split(',')[1]
        this.latlng = new google.maps.LatLng(lat, lng)

        if( this.latlng.toString().search('NaN') !== -1 ) {
            log_error("could not create latlng object", data)
            this.errored = true
            return false
        }


        this.type = this.type.toLowerCase().trim()
        if( typeof election_map.point_types[ this.type ] == 'undefined') {
            log_error(this.type+" is not one of the map point types", data)
            this.errored = true
            return false
        }

        var point_type = election_map.point_types[this.type]
        this.long_title = point_type.long_title
        this.icon = point_type.icon
        this.zIndex = Boolean(point_type['default']) ? 5 : 3
        this.directions = 'https://www.google.com/maps/dir//'+[lat,lng].join(',')

        this.tool_tip = false

        this.remove_from_map = function() {
            if( this.marker ) this.marker.setVisible(false);
        }
        this.distance_from = function(center) {
            return [google.maps.geometry.spherical.computeDistanceBetween (election_map.map.center, this.latlng), this]
        }
        this.click = function() {
            window.open(this.directions,'_blank');
        }
        this.hoverOn = function(show_directions) {
            var show_directions = show_directions || false,
                point = election_map.projection.fromLatLngToContainerPixel(this.latlng),
                inner_html = this.location + (show_directions ? '<br/><a href="#">Click for Directions</a>' : '')

            this.tool_tip = $('<span>', {'html': inner_html, 'class': 'tool_tip', 'style': ['left:', point.x,'px;', 'top:', point.y,'px'].join('') })
            $(election_map.map.getDiv()).append( this.tool_tip )
        }
        this.hoverOut = function() {
            if( this.tool_tip ) {
                this.tool_tip.remove()
                this.tool_tip = false
            }
        }
        this.is_open = function() {
            var today = new Date()
            for (var i = 0; i < election_map.date_filters.length; i++) {
                if( today > election_map.date_filters[i].date )
                    return this.closed_week(election_map.date_filters[i].label)
            };
        }
        this.closed_week = function(title) {
            return election_map.closed_states.indexOf((this[title] || '').toLowerCase()) === -1
        }
        this.format_week = function(date_filter) {

            if(typeof this[date_filter.label] === 'undefined' ||
              this[date_filter.label].length < 1 ) return '';

            var day = date_filter.date.getDate()
            var monthNames = ["January",
                              "February",
                              "March",
                              "April",
                              "May",
                              "June",
                              "July",
                              "August",
                              "September",
                              "October",
                              "November",
                              "December"]
            var month = monthNames[date_filter.date.getMonth()]

            return [
                '<strong>Week of',
                month,
                getGetOrdinal(day)+':</strong>',
                this[date_filter.label]
            ].join(' ')

        }
        this.fixed_hours = function() {
            return election_map.date_filters.map(function(date){
                return self_point.format_week(date)
            }).filter(function(elem) {
                return elem.length > 0
            }).join('<br />')
        }
        var self_point = this;
        this.add_to_map = function() {
            if( ! this.marker ) {
                var icon = new google.maps.MarkerImage(
                    this.icon,
                    new google.maps.Size(21, 34),
                    new google.maps.Point(0,0),
                    new google.maps.Point(10, 34)
                )
                this.marker = new google.maps.Marker({
                    position: this.latlng,
                    map: election_map.map,
                    title: this.Address,
                    animation: google.maps.Animation.DROP,
                    opacity: this.is_open() ? 1 : 0.5,
                    icon: this.icon,
                    zIndex: this.zIndex
                })
                if( $.browser.msie && parseInt($.browser.version) < 9 ) this.marker.opacity = null;
                google.maps.event.addListener(this.marker, 'click', function() {
                    self_point.click()
                });
                google.maps.event.addListener(this.marker, 'mouseover', function() {
                    if( self_point.$elem ) self_point.$elem.addClass('hover')
                    self_point.hoverOn(true);
                });
                google.maps.event.addListener(this.marker, 'mouseout', function() {
                    if( self_point.$elem ) self_point.$elem.removeClass('hover')
                    self_point.hoverOut()
                });
            } else {
                this.marker.setAnimation(null)
                this.marker.setVisible(true)
            }
        }
        this.to_html = function() {
            if( ! this.$elem ) {
                var container = $('<li>'),
                    title = $('<h3>'),
                    type = $('<em>').addClass('type'),
                    address = $('<p>'),
                    hours = $('<p>')
                title.text(this.location)
                type.text(this.long_title)
                address.text([this.address,this.city].join(', '))
                hours.html(this.fixed_hours())

                this.$elem = container.append(title, type, address, hours).addClass( this.is_open() ? '' : 'closed')
            }
            return this.$elem
                    .click( function(e) { self_point.click() })
                    .mouseover( function(e) { self_point.marker.setAnimation(google.maps.Animation.BOUNCE); self_point.hoverOn(); })
                    .mouseout( function(e) { self_point.marker.setAnimation(null); self_point.hoverOut(); })

        }
        return this;
    }
    function getGetOrdinal(n) {
        var s=["th","st","nd","rd"],
            v=parseInt(n)%100;
       return n+(s[(v-20)%10]||s[v]||s[0]);
    }
    function find_county(address_components) {
        for (var i = 0; i < address_components.length; i++) {
            if( address_components[i].long_name.toLowerCase().search('county') !== -1 ) {
                return address_components[i].long_name.toLowerCase().replace('county','').trim();
            }
        };
    }
    function log_error() {
    	if( log_errors ) try { console.log(arguments); } catch(e) { }
    }
}
