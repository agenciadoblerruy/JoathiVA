<?php
/**
 * The header for our theme.
 *
 * This is the template that displays all of the <head> section and everything up until <div id="content">
 *
 * @link https://developer.wordpress.org/themes/basics/template-files/#template-partials
 *
 * @package packers_agency
 */

?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="profile" href="http://gmpg.org/xfn/11">

	<?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
	<?php wp_body_open(); ?>

    <?php if ( get_theme_mod( 'packers_agency_header_preloader', false ) == 1 || get_theme_mod( 'packers_agency_resp_loader', false ) == 1 ) { ?>
        <div class="preloader">
            <div class="load">
              <div class="loader"></div>
            </div>
        </div>
   	<?php } ?>
	<a class="skip-link screen-reader-text" href="#acc-content"><?php esc_html_e( 'Skip to content (Press Enter)', 'packers-agency' ); ?></a>
    <div class="mobile-nav">
		<button class="toggle-button" data-toggle-target=".main-menu-modal" data-toggle-body-class="showing-main-menu-modal" aria-expanded="false" data-set-focus=".close-main-nav-toggle">
			<span class="toggle-bar"></span>
			<span class="toggle-bar"></span>
			<span class="toggle-bar"></span>
		</button>
		<div class="mobile-nav-wrap">
			<nav class="main-navigation" id="mobile-navigation"  role="navigation">
				<div class="primary-menu-list main-menu-modal cover-modal" data-modal-target-string=".main-menu-modal">
		            <button class="close close-main-nav-toggle" data-toggle-target=".main-menu-modal" data-toggle-body-class="showing-main-menu-modal" aria-expanded="false" data-set-focus=".main-menu-modal"></button>
		            <div class="mobile-menu" aria-label="<?php esc_attr_e( 'Mobile', 'packers-agency' ); ?>">
		                <?php
		                    wp_nav_menu( array(
		                        'theme_location' => 'primary',
		                        'menu_id'        => 'mobile-primary-menu',
		                        'menu_class'     => 'nav-menu main-menu-modal',
		                    ) );
		                ?>
		            </div>
		        </div>
			</nav>
		</div>
	</div>
	<div id="page" class="site">
		
		<?php
		/**
		 * packers_agency_top_header
		 * 
		 * @hooked packers_agency_top_header - 20
		*/
		do_action( 'packers_agency_top_header' );

		/**
		 * packers_agency Header
		 * 
		 * @hooked packers_agency_header - 20
		*/
		do_action( 'packers_agency_header' );
		
		echo '<div id="acc-content"><!-- done for accessiblity purpose -->';

		echo '<div class="single-header-img">';

		if (!is_front_page() || is_home()) {
			if (is_single() || is_page() || (function_exists('is_shop') && is_shop()) || is_archive() || is_search() || is_404() || is_home()) {
				if (!is_page_template('template-homepage.php')) {
					echo '<div class="post-thumbnail">';
					if (function_exists('is_shop') && (is_shop() || function_exists('is_product') && is_product())) {
						$packers_agency_default_image_url = get_template_directory_uri() . '/images/default-header.png'; 
						echo '<img src="' . esc_url($packers_agency_default_image_url) . '" alt="Default Image" itemprop="image">';
					} else {
						if (has_post_thumbnail()) {
							(is_active_sidebar('right-sidebar')) ? the_post_thumbnail('packers-agency-with-sidebar', array('itemprop' => 'image')) : the_post_thumbnail('packers-agency-without-sidebar', array('itemprop' => 'image'));
						} else {
							$packers_agency_default_image_url = get_template_directory_uri() . '/images/default-header.png'; 
							echo '<img src="' . esc_url($packers_agency_default_image_url) . '" alt="Default Image" itemprop="image">';
						}
					}
					echo '</div>';
					echo '<div class="single-header-heading">';
					packers_agency_custom_blog_banner_title();
					echo '</div>';
				}
			}
		}
	
		echo '</div>';
        echo '<div class="wrapper">';
        echo '<div class="container home-container">';
        echo '<div id="content" class="site-content">';
        ?>