<?php


// Setting the headers
header('Cache-Control: no-cache, must-revalidate');
header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
header('Content-type: application/json');



/*

if( !isset($_POST['address']) || !isset($_POST['nonce']) || !isset($_POST['time']) ):
 $result = array( 'success' => false, 'message' => 'No Data') ;
else:
	require_once('nonce.php');

	if( ! checkNonce($_POST['nonce'], $_POST['time']) ):
		$result = array( 'success' => false, 'message' => 'Bad Request') ;
	else:
*/
		$_POST = $_GET;
		// Google
		$address = isset($_POST['address']) ? $_POST['address'] : '309 West 11th Avenue, Denver';
		$address = str_replace(' ', '+', $address);

		$url = 'http://maps.googleapis.com/maps/api/geocode/json?address='.$address.'&sensor=true';

		$data = json_decode(file_get_contents($url));

		$lat = $data->results[0]->geometry->location->lat;
		$lng = $data->results[0]->geometry->location->lng;


		// All the Votesmart SHiiit
		date_default_timezone_set('GMT');
		$api = 'BDEA03016C347A5BC6DE';
		$secret = 'NRQl1Oiqy7dNJPrz2C480PRUreI=';

		// https://tsapis.com/services/district/doc
		$expires = time()+60*15; #expire in 15 minutes
		$signparts = "GET\n\n\n". $expires."\n/services/district";
		$hmac_sig = base64_encode( hash_hmac( 'sha1', $signparts, $secret, true) );



		$query = array(
			'search_type' => 'point',
		    'latitude' => $lat,
		    'longitude' => $lng,
		    'state' => 'CO',
		    'signature' => $hmac_sig,
		    'expires' => $expires,
		    'accesskey' => $api,
		    );
		$url = "https://tsapis.com/services/district?".http_build_query($query);

		$data = json_decode(file_get_contents($url),true);
		if( $data['match_data']['vb.vf_precinct_id'] != 'null' ) {
			$result = Array(
				'success' => true,
				'precinct' => $data['match_data']['vb.vf_precinct_id'],
				'county' => ucwords(strtolower( $data['match_data']['vb.vf_county_name'] ))
			);
		} else {
			$result = Array(
				'success' => false,
				'message' => 'null precinct'
			);
		}






/*
	endif;
endif;
*/


echo json_encode($result);

?>
