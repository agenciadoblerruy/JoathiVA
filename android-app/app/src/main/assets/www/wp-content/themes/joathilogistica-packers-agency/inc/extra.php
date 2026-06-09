<?php
/**
 * Custom functions that act independently of the theme templates.
 *
 * Eventually, some of the functionality here could be replaced by core features.
 *
 * @package packers_agency
 */

/**
 * Adds custom classes to the array of body classes.
 *
 * @param array $classes Classes for the body element.
 * @return array
 */
function packers_agency_body_classes( $classes ) {
  global $packers_agency_post;
  
    if( !packers_agency_is_home_template() ){
        $classes[] = 'inner';
        // Adds a class of group-blog to blogs with more than 1 published author.
    }

    if ( is_multi_author() ) {
        $classes[] = 'group-blog ';
    }

    // Adds a class of custom-background-image to sites with a custom background image.
    if ( get_background_image() ) {
        $classes[] = 'custom-background-image';
    }
    
    // Adds a class of custom-background-color to sites with a custom background color.
    if ( get_background_color() != 'ffffff' ) {
        $classes[] = 'custom-background-color';
    }
    

    if( packers_agency_woocommerce_activated() && ( is_shop() || is_product_category() || is_product_tag() || 'product' === get_post_type() ) && ! is_active_sidebar( 'shop-sidebar' ) ){
        $classes[] = 'full-width';
    }    

    // Adds a class of hfeed to non-singular pages.
    if ( ! is_page() ) {
        $classes[] = 'hfeed ';
    }
  
    if( is_404() ||  is_search() ){
        $classes[] = 'full-width';
    }
  
    if( ! is_active_sidebar( 'right-sidebar' ) ) {
        $classes[] = 'full-width'; 
    }

    return $classes;
}
add_filter( 'body_class', 'packers_agency_body_classes' );

 /**
 * 
 * @link http://www.altafweb.com/2011/12/remove-specific-tag-from-php-string.html
 */
function packers_agency_strip_single( $tag, $string ){
    $string=preg_replace('/<'.$tag.'[^>]*>/i', '', $string);
    $string=preg_replace('/<\/'.$tag.'>/i', '', $string);
    return $string;
}

if ( ! function_exists( 'packers_agency_excerpt_more' ) ) :
/**
 * Replaces "[...]" (appended to automatically generated excerpts) with ... * 
 */
function packers_agency_excerpt_more($more) {
  return is_admin() ? $more : ' &hellip; ';
}
endif;
add_filter( 'excerpt_more', 'packers_agency_excerpt_more' );


if( ! function_exists( 'packers_agency_footer_credit' ) ):
/**
 * Footer Credits
*/
function packers_agency_footer_credit() {
  
    // Check if footer copyright is enabled
    $packers_agency_show_footer_copyright = get_theme_mod( 'packers_agency_footer_setting', true );

    if ( ! $packers_agency_show_footer_copyright ) {
        return; 
    }

    $packers_agency_copyright_text = get_theme_mod('packers_agency_footer_copyright_text');

    $packers_agency_text = '<div class="site-info"><div class="container"><span class="copyright">';
    if ($packers_agency_copyright_text) {
        $packers_agency_text .= wp_kses_post($packers_agency_copyright_text); 
    } else {
        $packers_agency_text .= esc_html__('&copy; ', 'packers-agency') . date_i18n(esc_html__('Y', 'packers-agency')); 
        $packers_agency_text .= ' <a href="' . esc_url(home_url('/')) . '">' . esc_html(get_bloginfo('name')) . '</a>' . esc_html__('. All Rights Reserved.', 'packers-agency');
    }
    $packers_agency_text .= '</span>';
    $packers_agency_text .= '<span class="by"> <a href="' . esc_url('https://www.themeignite.com/products/free-packers-wordpress-theme') . '" rel="nofollow" target="_blank">' . PACKERS_AGENCY_THEME_NAME . '</a>' . esc_html__(' By ', 'packers-agency') . '<a href="' . esc_url('https://themeignite.com/') . '" rel="nofollow" target="_blank">' . esc_html__('Themeignite', 'packers-agency') . '</a>.';
    /* translators: %s: link to WordPress.org */
    $packers_agency_text .= sprintf(esc_html__(' Powered By %s', 'packers-agency'), '<a href="' . esc_url(__('https://wordpress.org/', 'packers-agency')) . '" target="_blank">WordPress</a>.');
    if (function_exists('the_privacy_policy_link')) {
        $packers_agency_text .= get_the_privacy_policy_link();
    }
    $packers_agency_text .= '</span></div></div>';
    echo apply_filters('packers_agency_footer_text', $packers_agency_text);
}
add_action('packers_agency_footer', 'packers_agency_footer_credit');
endif;

/**
 * Is Woocommerce activated
*/
if ( ! function_exists( 'packers_agency_woocommerce_activated' ) ) {
  function packers_agency_woocommerce_activated() {
    if ( class_exists( 'woocommerce' ) ) { return true; } else { return false; }
  }
}

if( ! function_exists( 'packers_agency_change_comment_form_default_fields' ) ) :
/**
 * Change Comment form default fields i.e. author, email & url.
 * https://blog.josemcastaneda.com/2016/08/08/copy-paste-hurting-theme/
*/
function packers_agency_change_comment_form_default_fields( $fields ){    
    // get the current commenter if available
    $packers_agency_commenter = wp_get_current_commenter();
 
    // core functionality
    $req      = get_option( 'require_name_email' );
    $packers_agency_aria_req = ( $req ? " aria-required='true'" : '' );
    $packers_agency_required = ( $req ? " required" : '' );
    $packers_agency_author   = ( $req ? __( 'Name*', 'packers-agency' ) : __( 'Name', 'packers-agency' ) );
    $packers_agency_email    = ( $req ? __( 'Email*', 'packers-agency' ) : __( 'Email', 'packers-agency' ) );
 
    // Change just the author field
    $fields['author'] = '<p class="comment-form-author"><label class="screen-reader-text" for="author">' . esc_html__( 'Name', 'packers-agency' ) . '<span class="required">*</span></label><input id="author" name="author" placeholder="' . esc_attr( $packers_agency_author ) . '" type="text" value="' . esc_attr( $packers_agency_commenter['comment_author'] ) . '" size="30"' . $packers_agency_aria_req . $packers_agency_required . ' /></p>';
    
    $fields['email'] = '<p class="comment-form-email"><label class="screen-reader-text" for="email">' . esc_html__( 'Email', 'packers-agency' ) . '<span class="required">*</span></label><input id="email" name="email" placeholder="' . esc_attr( $packers_agency_email ) . '" type="text" value="' . esc_attr(  $packers_agency_commenter['comment_author_email'] ) . '" size="30"' . $packers_agency_aria_req . $packers_agency_required. ' /></p>';
    
    $fields['url'] = '<p class="comment-form-url"><label class="screen-reader-text" for="url">' . esc_html__( 'Website', 'packers-agency' ) . '</label><input id="url" name="url" placeholder="' . esc_attr__( 'Website', 'packers-agency' ) . '" type="text" value="' . esc_attr( $packers_agency_commenter['comment_author_url'] ) . '" size="30" /></p>'; 
    
    return $fields;    
}
endif;
add_filter( 'comment_form_default_fields', 'packers_agency_change_comment_form_default_fields' );

if( ! function_exists( 'packers_agency_change_comment_form_defaults' ) ) :
/**
 * Change Comment Form defaults
 * https://blog.josemcastaneda.com/2016/08/08/copy-paste-hurting-theme/
*/
function packers_agency_change_comment_form_defaults( $defaults ){    
    $defaults['comment_field'] = '<p class="comment-form-comment"><label class="screen-reader-text" for="comment">' . esc_html__( 'Comment', 'packers-agency' ) . '</label><textarea id="comment" name="comment" placeholder="' . esc_attr__( 'Comment', 'packers-agency' ) . '" cols="45" rows="8" aria-required="true" required></textarea></p>';
    
    return $defaults;    
}
endif;
add_filter( 'comment_form_defaults', 'packers_agency_change_comment_form_defaults' );

if( ! function_exists( 'packers_agency_escape_text_tags' ) ) :
/**
 * Remove new line tags from string
 *
 * @param $text
 * @return string
 */
function packers_agency_escape_text_tags( $text ) {
    return (string) str_replace( array( "\r", "\n" ), '', strip_tags( $text ) );
}
endif;

if( ! function_exists( 'wp_body_open' ) ) :
/**
 * Fire the wp_body_open action.
 * Added for backwards compatibility to support pre 5.2.0 WordPress versions.
*/
function wp_body_open() {
    /**
     * Triggered after the opening <body> tag.
    */
    do_action( 'wp_body_open' );
}
endif;

if ( ! function_exists( 'packers_agency_get_fallback_svg' ) ) :    
/**
 * Get Fallback SVG
*/
function packers_agency_get_fallback_svg( $packers_agency_post_thumbnail ) {
    if( ! $packers_agency_post_thumbnail ){
        return;
    }
    
    $packers_agency_image_size = packers_agency_get_image_sizes( $packers_agency_post_thumbnail );
     
    if( $packers_agency_image_size ){ ?>
        <div class="svg-holder">
             <svg class="fallback-svg" viewBox="0 0 <?php echo esc_attr( $packers_agency_image_size['width'] ); ?> <?php echo esc_attr( $packers_agency_image_size['height'] ); ?>" preserveAspectRatio="none">
                    <rect width="<?php echo esc_attr( $packers_agency_image_size['width'] ); ?>" height="<?php echo esc_attr( $packers_agency_image_size['height'] ); ?>" style="fill:#dedddd;"></rect>
            </svg>
        </div>
        <?php
    }
}
endif;

function packers_agency_enqueue_google_fonts() {

    require get_template_directory() . '/inc/wptt-webfont-loader.php';

    wp_enqueue_style(
        'google-fonts-jockey-one',
        wptt_get_webfont_url( 'https://fonts.googleapis.com/css2?family=Jockey+One&display=swap' ),
        array(),
        '1.0'
    );

    wp_enqueue_style(
        'google-fonts-inter',
        wptt_get_webfont_url( 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap' ),
        array(),
        '1.0'
    );

    wp_enqueue_style(
        'google-fonts-kalam',
        wptt_get_webfont_url( 'https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&display=swap' ),
        array(),
        '1.0'
    );
}
add_action( 'wp_enqueue_scripts', 'packers_agency_enqueue_google_fonts' );


if( ! function_exists( 'packers_agency_site_branding' ) ) :
/**
 * Site Branding
*/
function packers_agency_site_branding(){
    $packers_agency_logo_site_title = get_theme_mod( 'header_site_title', 1 );
    $packers_agency_tagline = get_theme_mod( 'header_tagline', false );
    $packers_agency_logo_width = get_theme_mod('logo_width', 100); // Retrieve the logo width setting
    $packers_agency_fallback_logo = get_template_directory_uri() . '/images/joathi-logo.svg';

    ?>
    <div class="site-branding" style="max-width: <?php echo esc_attr(get_theme_mod('logo_width', '-1'))?>px;">
        <?php 
        // Check if custom logo is set and display it
        if (function_exists('has_custom_logo') && has_custom_logo()) {
            the_custom_logo();
        } else {
            ?>
            <a href="<?php echo esc_url(home_url('/')); ?>" class="custom-logo-link fallback-custom-logo" rel="home">
                <img src="<?php echo esc_url( $packers_agency_fallback_logo ); ?>" class="custom-logo" alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>">
            </a>
            <?php
        }
        if ($packers_agency_logo_site_title):
             if (is_front_page()): ?>
            <h1 class="site-title" style="font-size: <?php echo esc_attr(get_theme_mod('packers_agency_site_title_size', '30')); ?>px;">
            <a href="<?php echo esc_url(home_url('/')); ?>" rel="home"><?php bloginfo('name'); ?></a>
          </h1>
            <?php else: ?>
                <p class="site-title" itemprop="name">
                    <a href="<?php echo esc_url(home_url('/')); ?>" rel="home"><?php bloginfo('name'); ?></a>
                </p>
            <?php endif; ?>
        <?php endif; 
    
        if ($packers_agency_tagline) :
            $packers_agency_description = get_bloginfo('description', 'display');
            if ($packers_agency_description || is_customize_preview()) :
        ?>
                <p class="site-description" itemprop="description"><?php echo $packers_agency_description; ?></p>
            <?php endif;
        endif;
        ?>
    </div> 
    <?php
}
endif;
if( ! function_exists( 'packers_agency_navigation' ) ) :
    /**
     * Site Navigation
    */
    function packers_agency_navigation(){
        ?>
        <nav class="main-navigation" id="site-navigation" role="navigation">
            <?php 
            wp_nav_menu( array( 
                'theme_location' => 'primary', 
                'menu_id' => 'primary-menu' 
            ) ); 
            ?>
        </nav>
        <?php
    }
endif;

if( ! function_exists( 'packers_agency_header' ) ) :
    /**
     * Header Start
    */
function packers_agency_header(){
        $packers_agency_header_image = get_header_image();
        $packers_agency_sticky_header = get_theme_mod('packers_agency_sticky_header');
        $packers_agency_header_btn_text     = get_theme_mod( 'packers_agency_header_btn_text', __( 'Ingresar a JoathiVA', 'packers-agency' ) );
        $packers_agency_header_btn_url       = get_theme_mod( 'packers_agency_header_btn_url', home_url( '/v/' ) );
        $packers_agency_location     = get_theme_mod( 'packers_agency_header_location' );
        $packers_agency_phone        = get_theme_mod( 'packers_agency_header_phone' );
        $packers_agency_social_icon = get_theme_mod( 'packers_agency_social_icon_setting', false);
        $packers_agency_email        = get_theme_mod( 'packers_agency_header_email' );
        ?>
        <div id="page-site-header" class="main-header">
            <header id="masthead" style="background-image: url('<?php echo esc_url( $packers_agency_header_image ); ?>');" class="site-header header-inner" role="banner">
                    <div class="topbar">
                        <?php if ( $packers_agency_location ){?>
                            <p class="topbar-text text-center py-2"><?php echo esc_html( $packers_agency_location );?></p>
                        <?php } ?>
                    </div> 
                    <div class="mid-head">
                        <div class="container">
                            <div class="row">
                                <div class="col-xl-3 col-lg-3 col-md-5 align-self-center">
                                    <?php if ( $packers_agency_email ){?>
                                        <div class="location">
                                            <span class="contact-icon">
                                                <i class="fas fa-envelope-open-text"></i>
                                            </span>
                                            <span class="contact-box">
                                                <span class="location-text">
                                                    <a href="mailto:<?php echo esc_attr($packers_agency_email);?>">
                                                        <?php echo esc_html($packers_agency_email);?>
                                                    </a>
                                                </span>
                                            </span>
                                            
                                        </div>
                                    <?php } ?>
                                </div>
                                <div class="col-xl-3 col-lg-3 col-md-3 align-self-center text-md-left">
                                    <?php if ( $packers_agency_phone ){?>
                                        <div class="location">
                                            <span class="contact-icon">
                                                <i class="fas fa-phone-alt"></i>
                                            </span>
                                            <span class="contact-box">
                                                 <span class="location-text">
                                                    <a href="tel:<?php echo esc_attr($packers_agency_phone);?>">
                                                        <?php echo esc_html( $packers_agency_phone);?>
                                                    </a>
                                                </span>
                                            </span>
                                        </div>
                                    <?php } ?>
                                </div>
                                <div class="col-xl-4 col-lg-4 col-md-2 align-self-center">
                                    <?php if ( $packers_agency_social_icon ){?>
                                        <div class="social-links">
                                            <?php 
                                            $packers_agency_social_link1 = get_theme_mod( 'packers_agency_social_link_1' );
                                            $packers_agency_social_link2 = get_theme_mod( 'packers_agency_social_link_2' );
                                            $packers_agency_social_link3 = get_theme_mod( 'packers_agency_social_link_3' );
                                            $packers_agency_social_link4 = get_theme_mod( 'packers_agency_social_link_4' );

                                            if ( ! empty( $packers_agency_social_link1 ) ) {
                                                echo '<a class="social1" href="' . esc_url( $packers_agency_social_link1 ) . '" target="_blank"><i class="fab fa-facebook-f"></i></a>';
                                            }
                                            if ( ! empty( $packers_agency_social_link2 ) ) {
                                                echo '<a class="social2" href="' . esc_url( $packers_agency_social_link2 ) . '" target="_blank"><i class="fab fa-twitter"></i></a>';
                                            } 
                                            if ( ! empty( $packers_agency_social_link3 ) ) {
                                                echo '<a class="social3" href="' . esc_url( $packers_agency_social_link3 ) . '" target="_blank"><i class="fab fa-instagram"></i></a>';
                                            }
                                            if ( ! empty( $packers_agency_social_link4 ) ) {
                                                echo '<a class="social4" href="' . esc_url( $packers_agency_social_link4 ) . '" target="_blank"><i class="fab fa-pinterest-p"></i></a>';
                                            }
                                            ?>
                                        </div>
                                    <?php } ?>
                                </div>
                                <div class="col-xl-2 col-lg-2 col-md-2 align-self-center">
                                    <?php if ( $packers_agency_header_btn_text ){?>
                                        <div class="menudiv-button">
                                            <a href="<?php echo esc_url($packers_agency_header_btn_url);?>"><?php echo esc_html($packers_agency_header_btn_text);?></a>
                                        </div>
                                    <?php } ?>
                                </div>
                            </div>
                        </div> 
                    </div>
                    <div class="theme-menu head_bg" data-sticky="<?php echo $packers_agency_sticky_header; ?>">
                        <div class="container">
                            <div class="row">
                            <div class="col-xl-3 col-lg-3 col-md-5 align-self-center">
                               <?php packers_agency_site_branding(); ?> 
                            </div>
                            <div class="col-xl-7 col-lg-7 col-md-1 align-self-center">
                               <?php packers_agency_navigation(); ?> 
                            </div>
                            <div class="col-xl-2 col-lg-2 col-md-6 align-self-center position-relative admin-detail">
                                <?php if( get_theme_mod('packers_agency_show_hide_search', false) ) { ?>
                                    <div class="search-body">
                                        <button type="button" class="search-show">
                                            <i class="<?php echo esc_attr(get_theme_mod('packers_agency_search_icon', 'fas fa-search')); ?>"></i>
                                        </button>
                                    </div>
                                    <div class="searchform-inner">
                                        <?php get_search_form(); ?>
                                        <button type="button" class="close" aria-label="<?php esc_attr_e( 'Close', 'packers-agency' ); ?>"><span aria-hidden="true">X</span></button>
                                    </div> 
                                <?php } ?>
                                <?php if (class_exists('woocommerce')) { ?>
                                    <span class="user-btn">
                                        <?php if (is_user_logged_in()) { ?>
                                            <a class="account-btn" href="<?php echo esc_url(get_permalink(get_option('woocommerce_myaccount_page_id'))); ?>" title="<?php esc_attr_e('My Account','packers-agency'); ?>">
                                                <i class="far fa-user"></i>
                                            </a>
                                        <?php } else { ?>
                                            <a class="account-btn" href="<?php echo esc_url(get_permalink(get_option('woocommerce_myaccount_page_id'))); ?>" title="<?php esc_attr_e('My Account','packers-agency'); ?>"></a>
                                        <?php } ?>
                                    </span>
                                    <span class="product-cart text-center position-relative">
                                      <a href="<?php if(function_exists('wc_get_cart_url')){ echo esc_url(wc_get_cart_url()); } ?>" title="<?php esc_attr_e( 'shopping cart','packers-agency' ); ?>"><i class="fas fa-shopping-bag"></i></a>
                                      <?php 
                                        $packers_agency_cart_count = WC()->cart->get_cart_contents_count(); 
                                        if($packers_agency_cart_count > 0): ?>
                                        <span class="cart-count"><?php echo $packers_agency_cart_count; ?></span>
                                      <?php endif; ?>
                                    </span>
                                <?php } ?>
                                <?php if( get_theme_mod('packers_agency_show_hide_header_sidebar', false) ) { ?>
                                    <div class="offcanvas-div d-flex">
                                        <button type="button" data-bs-toggle="offcanvas" data-bs-target="#demo">
                                            <i class="fas fa-bars"></i>
                                        </button>
                                        <div class="offcanvas offcanvas-end" id="demo">
                                            <div class="offcanvas-header"> 
                                                <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
                                            </div>
                                            <div class="offcanvas-body">
                                                <?php dynamic_sidebar('header-sidebar'); ?>
                                            </div>
                                        </div>
                                    </div>
                                <?php } ?> 
                            </div>
                        </div>
                        </div>
                    </div>
                    
            </header>
        </div>
        <?php
    }
endif;
add_action( 'packers_agency_header', 'packers_agency_header', 20 );
