<?php header("Content-type: text/javascript"); ?>
<?php require_once('../nonce.php'); ?>


$.ajaxPrefilter( function( options, originalOptions, jqXHR ) {
  var justVote = <?php echo createNonce(); ?>;
  options.data += '&time='+justVote.time+'&nonce='+justVote.nonce
});