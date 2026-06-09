jQuery(document).ready(function($){ 
	// Tabs
	$( ".inline-list" ).each( function() {
		$( this ).find( "li" ).each( function(i) {
			$( this).on( 'click', function() {
				$( this ).addClass( "current" ).siblings().removeClass( "current" )
				.parents( "#wpbody" ).find( "div.panel-left" ).removeClass( "visible" ).end().find( 'div.panel-left:eq('+i+')' ).addClass( "visible" );
				return false;
			} );
		} );
	} );

	// Event listener for dismissing the "get-start" notice on button click
	$(document).on('click', '.notice[data-notice="get-start"] button.notice-dismiss', function () {
	    // Send AJAX request to dismiss the notice
	    $.ajax({
	        type: 'POST',
	        url: ajaxurl,
	        data: {
	            action: 'packers_agency_dismissable_notice',
	        },
	        success: function () {
	            // On successful AJAX request, remove the corresponding "example" notice
	            $('.notice[data-notice="example"]').remove();
	        },
	        error: function (xhr, status, error) {
	            // Log an error message if the AJAX request to dismiss the notice fails
	            console.error('Failed to dismiss notice:', status, error);
	        }
	    });
	});

	//Bundle Notice
	jQuery(document).ready(function ($) {
		$(document).on(
			'click',
			'.whizzie-notice[data-notice="whizzie"] .whizzie-dismiss',
			function () {

				$.post(ajaxurl, {
					action: 'packers_agency_dismiss_whizzie_notice'
				}, function () {
					$('.whizzie-notice[data-notice="whizzie"]').fadeOut(300);
				});

			}
		);
	});

	//faq toggle
	$('.toggle-block:not(.active) .toggle-content').hide();
	$('.toggle-block .toggle-title').on( 'click', function() {
		$(this).parent('.toggle-block').siblings().removeClass('active');
		$(this).parent('.toggle-block').addClass('active');
		$(this).parent('.toggle-block').siblings().children('.toggle-content').slideUp();
		$(this).siblings('.toggle-content').slideDown();
	});
});