<?php


function createNonce($json=true) {
	$salt = "a-fistful-of-dollars-and-a-few-dollars-more";
	$time = time()+60*15;
	if( $json ) return json_encode( array( 'time' => $time, 'nonce' => md5($time.$salt) ) );
	else return array( 'time' => $time, 'nonce' => md5($time.$salt) );
}

function checkNonce($hash,$time) {
	$salt = "a-fistful-of-dollars-and-a-few-dollars-more";
	return md5($time.$salt) === $hash && $time > Time();
}



?>