<?php

$packers_agency_custom_css = "";

$packers_agency_primary_color = get_theme_mod('packers_agency_primary_color', '#0E3B2E');
$packers_agency_second_color = get_theme_mod('packers_agency_second_color', '#F2B200');

/*------------------ Primary Global Color -----------*/

if ($packers_agency_primary_color) {
  $packers_agency_custom_css .= ':root {';
  $packers_agency_custom_css .= '--primary-color: ' . esc_attr($packers_agency_primary_color) . ' !important;';
  $packers_agency_custom_css .= '} ';
}

/*------------------ Secondary Global Color -----------*/

if ($packers_agency_second_color) {
  $packers_agency_custom_css .= ':root {';
  $packers_agency_custom_css .= '--secondary-color: ' . esc_attr($packers_agency_second_color) . ' !important;';
  $packers_agency_custom_css .= '} ';
}

/*-------------------- Scroll Top Alignment-------------------*/

$packers_agency_scroll_top_alignment = get_theme_mod( 'packers_agency_scroll_top_alignment','right-align');

if($packers_agency_scroll_top_alignment == 'right-align'){
$packers_agency_custom_css .='#button{';
	$packers_agency_custom_css .='right: 3%;';
$packers_agency_custom_css .='}';
}else if($packers_agency_scroll_top_alignment == 'center-align'){
$packers_agency_custom_css .='#button{';
	$packers_agency_custom_css .='right:0; left:0; margin: 0 auto;';
$packers_agency_custom_css .='}';
}else if($packers_agency_scroll_top_alignment == 'left-align'){
$packers_agency_custom_css .='#button{';
	$packers_agency_custom_css .='left: 3%;';
$packers_agency_custom_css .='}';
}

/*-------------------- Archive Page Pagination Alignment-------------------*/

$packers_agency_archive_pagination_alignment = get_theme_mod( 'packers_agency_archive_pagination_alignment','left-align');

if($packers_agency_archive_pagination_alignment == 'right-align'){
$packers_agency_custom_css .='.pagination{';
	$packers_agency_custom_css .='justify-content: end;';
$packers_agency_custom_css .='}';
}else if($packers_agency_archive_pagination_alignment == 'center-align'){
$packers_agency_custom_css .='.pagination{';
	$packers_agency_custom_css .='justify-content: center;';
$packers_agency_custom_css .='}';
}else if($packers_agency_archive_pagination_alignment == 'left-align'){
$packers_agency_custom_css .='.pagination{';
	$packers_agency_custom_css .='justify-content: start;';
$packers_agency_custom_css .='}';
}

/*-------------------- Scroll Top Responsive-------------------*/

$packers_agency_resp_scroll_top = get_theme_mod( 'packers_agency_resp_scroll_top',true);
if($packers_agency_resp_scroll_top == true && get_theme_mod( 'packers_agency_scroll_to_top',true) != true){
	$packers_agency_custom_css .='#button.show{';
		$packers_agency_custom_css .='visibility:hidden !important;';
	$packers_agency_custom_css .='} ';
}
if($packers_agency_resp_scroll_top == true){
	$packers_agency_custom_css .='@media screen and (max-width:575px) {';
	$packers_agency_custom_css .='#button.show{';
		$packers_agency_custom_css .='visibility:visible !important;';
	$packers_agency_custom_css .='} }';
}else if($packers_agency_resp_scroll_top == false){
	$packers_agency_custom_css .='@media screen and (max-width:575px){';
	$packers_agency_custom_css .='#button.show{';
		$packers_agency_custom_css .='visibility:hidden !important;';
	$packers_agency_custom_css .='} }';
}

/*-------------------- Preloader Responsive-------------------*/

	$packers_agency_resp_loader = get_theme_mod('packers_agency_resp_loader',false);
	if($packers_agency_resp_loader == true && get_theme_mod('packers_agency_header_preloader',false) == false){
		$packers_agency_custom_css .='@media screen and (min-width:575px){
			.preloader{';
			$packers_agency_custom_css .='display:none !important;';
		$packers_agency_custom_css .='} }';
	}

	if($packers_agency_resp_loader == false){
		$packers_agency_custom_css .='@media screen and (max-width:575px){
			.preloader{';
			$packers_agency_custom_css .='display:none !important;';
		$packers_agency_custom_css .='} }';
	}


	// Scroll to top button shape 

	$packers_agency_scroll_border_radius = get_theme_mod( 'packers_agency_scroll_to_top_radius','curved-box');
    if($packers_agency_scroll_border_radius == 'box'){
		$packers_agency_custom_css .='#button{';
			$packers_agency_custom_css .='border-radius: 0px;';
		$packers_agency_custom_css .='}';
	}else if($packers_agency_scroll_border_radius == 'curved-box'){
		$packers_agency_custom_css .='#button{';
			$packers_agency_custom_css .='border-radius: 4px;';
		$packers_agency_custom_css .='}';
	}
	else if($packers_agency_scroll_border_radius == 'circle'){
		$packers_agency_custom_css .='#button{';
			$packers_agency_custom_css .='border-radius: 50%;';
		$packers_agency_custom_css .='}';
	}

  // Footer Background Image Attatchment 

	$packers_agency_footer_attatchment = get_theme_mod( 'packers_agency_background_attatchment','scroll');
	if($packers_agency_footer_attatchment == 'fixed'){
		$packers_agency_custom_css .='.site-footer{';
			$packers_agency_custom_css .='background-attachment: fixed;';
		$packers_agency_custom_css .='}';
	}elseif ($packers_agency_footer_attatchment == 'scroll'){
		$packers_agency_custom_css .='.site-footer{';
			$packers_agency_custom_css .='background-attachment: scroll;';
		$packers_agency_custom_css .='}';
	}

  // Menu Hover Style	

  $packers_agency_menus_item = get_theme_mod( 'packers_agency_menus_style','None');
  if($packers_agency_menus_item == 'None'){
	  $packers_agency_custom_css .='#site-navigation .menu ul li a:hover, .main-navigation .menu li a:hover{';
		  $packers_agency_custom_css .='';
	  $packers_agency_custom_css .='}';
  }else if($packers_agency_menus_item == 'Zoom In'){
	  $packers_agency_custom_css .='#site-navigation .menu ul li a:hover, .main-navigation .menu li a:hover{';
	  $packers_agency_custom_css .= 'transition: all 0.3s ease-in-out !important; transform: scale(1.2) !important;';
	  $packers_agency_custom_css .= '}';
	  
	  $packers_agency_custom_css .= '.main-navigation ul ul li a:hover {';
	  $packers_agency_custom_css .= 'margin-left: 20px;';
	  $packers_agency_custom_css .= '}';
  }	
  
	// Post Content Alignment

	$packers_agency_blog_layout_option = get_theme_mod( 'packers_agency_blog_layout_option','Left');
	if($packers_agency_blog_layout_option == 'Left'){
		$packers_agency_custom_css .='.post{';
			$packers_agency_custom_css .='text-align: left;';
		$packers_agency_custom_css .='}';
	}elseif ($packers_agency_blog_layout_option == 'Right'){
		$packers_agency_custom_css .='.post{';
			$packers_agency_custom_css .='text-align: right;';
		$packers_agency_custom_css .='}';
	}elseif ($packers_agency_blog_layout_option == 'Center'){
		$packers_agency_custom_css .='.post{';
			$packers_agency_custom_css .='text-align: center;';
		$packers_agency_custom_css .='}';
	}
