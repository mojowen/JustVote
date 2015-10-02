// https://spreadsheets.google.com/feeds/worksheets/0Ak0dQzYXW9EidGk5TkFHanJVMVp0Y0NfMy1PV3F2aVE/private/full

voteModel = function(data) {
	
	this.sections = ko.observableArray([])



	// Info about the voter
	this.first = ko.observable('')
	this.last = ko.observable('')
	this.status = ko.observable(null)
	this.address = ko.observable('')
	this.address.zip = ko.observable('')
	this.address.county = ko.observable('')
	this.address.latlng = ko.observable({})
	
	this.error = ko.observable('Are you registerd to vote?')
	this.error.voters = ko.observableArray([]) // can use for keeping track of multiple results	
	
	
	// Info for the menu
	this.menu = ['Voter Info','Issue + News','Volunteer','Know Your Rights','About Us', 'Calendar','Donate'];
	
	this.sections.push( new menuModel({title: 'Can I Vote?', template: 'can' }) )
	this.sections.push( new menuModel({title: 'How Can I Vote?', template: 'how' }) )
	this.sections.push( new menuModel({title: 'Where Do I Vote?', template: 'where' }) )
	this.sections.push( new menuModel({title: "What's on My Ballot?", template: 'what' }) )

	var state = document.location.hash.replace('#','').replace(/-/g,' ').toLowerCase(),
		start = this.sections().filter(function(el) { return el.title.toLowerCase().search(state) !== -1 })

	if( start.length < 1 && document.location.hash.length > 0 ) {
		console.log( $(document.location.hash+', a[name='+document.location.hash.split('#')[1]+']') )
		$(document).scrollTop( $(document.location.hash+', a[name='+document.location.hash.split('#')[1]+']').position().top - 10 )
	}
	
	start = start.length > 0 ? start[0] : this.sections()[0]
	
	this.selected = ko.observable(start)
	this.selected.hash = ko.computed( function() { 
		var selected = this.selected()
		document.location.hash = selected.title.replace(/'/,' ').split(' ')[0].toLowerCase();
	},this)
	
	function ultraTrim(string) {
		var trimArray = string.split(' '), goodString = '';
		for(var i =0; i < trimArray.length; i++) {
			if( trimArray[i].length > 0 ) goodString += trimArray[i]+' ';
		}
		return goodString.trim();
	}
	
	function processGoogleContent(gstring) {
		var garray = gstring.split(','), gobject = {}, last = ''
		for(var i=0; i < garray.length; i++ ) {
			var gsplit = garray[i].split(': ')
			if( gsplit.length > 1 ) {
				var gkey = gsplit.shift().trim()
				gobject[ gkey ] = ultraTrim( gsplit.join(', ').trim().replace(/\t/g,'').replace(/\n/g,', ').replace(/\r/g,', ') )
				last = gkey;
			} else gobject[ last ] += ', '+ultraTrim( garray[i].trim().replace(/\t/g,'').replace(/\n/g,', ').replace(/\r/g,', ') )
		}
		return gobject
	}
	
	// Precinct lookup
	this.precinct = ko.observable( null )
	this.pollingPlace = ko.observable( null )
	this.pollingPlace.error = ko.observable( false )
	this.hasPollingPlace = ko.computed( function() { 
		var hasPollingPlace = ['Alamosa','Baca','Bent','Boulder','Cheyenne','Clear Creek','Costilla','County','Crowley','Custer','Delta','Denver','Dolores','Douglas','Eagle','El Paso','Elbert','Fremont','Grand','Gunnison','Hinsdale','Huerfano','Jackson','Jefferson','Kiowa','Kit Carson','La Plata','Las Animas','Lincoln','Logan','Mineral','Montezuma','Ouray','Park','Phillips','Pitkin','Prowers','Pueblo','Rio Blanco','Rio Grande','Routt','Saguache','San Juan','San Miguel','Sedgwick','Washington','Yuma'],
		county = this.address.county()
		return hasPollingPlace.indexOf( county ) !== -1;
	},this)
	
	this.fetchPollingPlace = ko.computed(function() {
		var precinct = this.precinct,
			precinctFlat = precinct() || '',
			pollingPlace = this.pollingPlace,
			pollingPlaceError = this.pollingPlace.error
		
		if( precinctFlat != '' ) {
			$.ajax({
				url: 'https://spreadsheets.google.com/feeds/list/0Ak0dQzYXW9EidGk5TkFHanJVMVp0Y0NfMy1PV3F2aVE/ocz/public/basic?alt=json-in-script&callback=?',
				data:'sq=precinct%3d'+precinctFlat,
				dataType:'jsonp', 
				success: function(r){ 
					if( r.feed.entry && r.feed.entry[0] )  for( var i in r.feed.entry[0].content ) {
						if( i != 'type' && typeof r.feed.entry[0].content[i] == 'string' ) pollingPlace(processGoogleContent( r.feed.entry[0].content[i]) );
					}
					else  {
						precinct( null )
						pollingPlace( null )
						pollingPlaceError( true )
					}
				}
			})
		}
	},this).extend({ throttle: 500 })
	
	
	// Early Vote and Mail Ballots
	
	this.earlyVote = ko.observableArray([])
	this.mailDrop = ko.observableArray([])
	this.voteCenters = ko.observableArray([])

	this.address.county.requests = ko.observable(false)
	
	this.waystoVote = ko.computed( function() { 
		var count = 0, amounts = [null,'one','two','three','four']
		count += this.earlyVote().length > 0 ? 1 : 0
		count += this.voteCenters().length > 0 ? 1 : 0
		count += this.mailDrop().length > 0 ? 1 : 0
		count += this.hasPollingPlace() ? 1 : 0
		return amounts[count]
	},this)

	this.votingOptions = [ 
		[ this.mailDrop, 'Ballot Drop Locations' ],
		[ this.voteCenters, 'Vote Centers' ]
	]

	this.fetchCounty = ko.computed(function() {
		var county = typeof this.address.county() == 'undefined' ? '' : this.address.county().replace(/ /g,''),
			mailDrop = this.mailDrop,
			earlyVote = this.earlyVote,
			voteCenters = this.voteCenters,
			alldone = this.address.county.requests
		
		function ajaxCounty(gid,observable) {
			return $.ajax({
				url: 'https://spreadsheets.google.com/feeds/list/0Ak0dQzYXW9EidGk5TkFHanJVMVp0Y0NfMy1PV3F2aVE/'+gid+'/public/basic?alt=json-in-script&callback=?',
				data:'sq=county%3d'+county,
				dataType:'jsonp', 
				success: function(r){
					if( r.feed.entry ) observable( $.map(r.feed.entry, function(el) {
						for( var i in el.content ) {
							if( i != 'type' && typeof el.content[i] == 'string' ) return processGoogleContent(el.content[i]);
						}
					}));
				}
			})
		}
		
		if( county != '' ) {
			var gets = [ 
				['od9',mailDrop],
				['od2',voteCenters]
			], ajaxReqs = []
			for( var i =0 ; i < gets.length; i++ ) {
				ajaxReqs.push( ajaxCounty(gets[i][0], gets[i][1],gets[i][2] ) )
			}
			
			$.when.apply($, ajaxReqs).then(function() {
				alldone( false );
			});
			

		}
	},this).extend({ throttle: 500 })
	
	this.fetchCounty.delay = ko.computed(function() {
		var county = this.address.county()
		
		this.voteCenters([])
		this.mailDrop([])
		this.earlyVote([])
		this.address.county.requests = ko.observable( true )

	},this)



	// Helpful functions
	this.next = function() { 
		var sections = this.sections()
		this.selected( sections[ sections.indexOf( this.selected() ) +1 ] )
	}
	this.prev = function() { 
		var sections = this.sections()
		this.selected( sections[ sections.indexOf( this.selected() ) -1 ] )
	}

	return this;
	
	
	function menuModel(data) {
		this.title = data.title
		this.template = data.template
		return this;
	}
}

$(document).ready( function() {
	if( vm ) {
		ko.applyBindings( vm ) 
		if( document.location.hash == '#es' ) {
			var $spanish = $('.spanish');
			$spanish.slideDown(function() { 
				setTimeout(function() { $spanish.slideUp(); }, 5000);
			});
		}
		$(window).bind('hashchange', function() {
			var state = document.location.hash.replace('#','').replace(/-/g,' ').toLowerCase(),
				start = vm.sections().filter(function(el) { return el.title.toLowerCase().search(state) !== -1 })
			if( start.length > 0 ) vm.selected(start[0])
	
	  	});
	  	$(this).on('click touchend','.next',function(e) {
			e.preventDefault();
			vm.next();
		})
		.on('click touchend','.not-me',function(e) {
			e.preventDefault();
			vm.status('Not Registered')
			var errors = { 
				'I know I am not registered':'You need to register to vote', 
				"I can't find myself in this list": 'We could not find your information - you should check your registration info with the Secretary of State',
				"I need to update my address":'You should update your information with the Secretary of State'
			}
			console.log( errors[ $(this).text() ] )
			vm.error( errors[ $(this).text() ] )
			vm.address('')
			vm.address.zip('')
			$(document).scrollTop(200)
		})
		.on('click touchend','.pick',function(e) {
			e.preventDefault();
			var voter = ko.dataFor(this)
			if( voter.status == 'Registered' ) {
				vm.status(voter.status)
			} else {
				vm.status( 'Not Registered' )
				vm.error( 'You need to register to vote!' )
			}
			vm.address(voter.address)
			vm.address.county(voter.county)
			vm.address.latlng( {lat: voter.lat, lng: voter.lng} )
			vm.precinct( voter.precinct )
		})
		.on('submit','.status-lookup',function(e) {
			e.preventDefault();
			var $this = $(this), good = false;
			$('input[type=text]',$this).removeClass('oops').each( function() { 
				$input = $(this);
				if( $input.val() == '' ) {
					$input.addClass('oops').prev('label').addClass('oops');
					good  = true;
				}
			})
			if( good ) return false;
			$('.loading',$this).show()
			$.post(
				'/justvote/voterlookup.php',
				{first: vm.first(), last: vm.last(), zip: vm.address.zip() },
				function(r) {
					$('.loading',$this).hide()
					if( r['success'] ) {
						var voter = r.results[0];
						vm.status(voter.status)
						vm.address(voter.address)
						vm.address.county(voter.county)
						vm.address.latlng( {lat: voter.lat, lng: voter.lng} )
						vm.precinct( voter.precinct )
					} else {
						vm.error( r['message'] )
						if( r.results instanceof Array ) { for( var i = 0; i < r.results.length; i++ ) {
							var voter = r.results[i]
							vm.error.voters.push( {first: voter.first, last: voter.last, county: voter.county, address: voter.address, status: voter.status, latlng: {lat: voter.lat, lng: voter.lng}, precinct: voter.precinct } )
						} 
						} else vm.status('Not Registered');
						
					}
				}
			)
		}).
		on('click touchend','.precinct-lookup',function(e) {
			e.preventDefault();
			$loading = $(this).parents('div').find('.loading').show()
			$.post(
				'/justvote/districtlookup.php',
				{ address: escape(vm.address()) },
				function(r) {
					$loading.hide();
					console.log(r);
					if( r['success'] ) {
						vm.precinct( r.precinct )
						vm.address.county( r.county )
					} else {
						vm.precinct( null )
						vm.pollingPlace.error( true )
					}
					
				}
			)
		});

	  }
})

