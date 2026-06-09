<?php
/**
 * Packers Agency functions and definitions.
 *
 * @link https://developer.wordpress.org/themes/basics/theme-functions/
 *
 * @package packers_agency
 */

if ( ! defined( 'PACKERS_AGENCY_URL' ) ) {
    define( 'PACKERS_AGENCY_URL', esc_url( 'https://www.themeignite.com/products/movers-wordpress-theme', 'packers-agency') );
}
if ( ! defined( 'PACKERS_AGENCY_FREE_DOC_URL' ) ) {
    define( 'PACKERS_AGENCY_FREE_DOC_URL', esc_url( 'https://demo.themeignite.com/documentation/packers-agency-free/', 'packers-agency') );
}
if ( ! defined( 'PACKERS_AGENCY_PRO_DOC_URL' ) ) {
    define( 'PACKERS_AGENCY_PRO_DOC_URL', esc_url( 'https://demo.themeignite.com/documentation/packers-agency-pro/', 'packers-agency') );
}
if ( ! defined( 'PACKERS_AGENCY_DEMO_URL' ) ) {
    define( 'PACKERS_AGENCY_DEMO_URL', esc_url( 'https://demo.themeignite.com/packers-agency/', 'packers-agency') );
}
if ( ! defined( 'PACKERS_AGENCY_REVIEW_URL' ) ) {
    define( 'PACKERS_AGENCY_REVIEW_URL', esc_url( 'https://wordpress.org/support/theme/packers-agency/reviews/#new-post', 'packers-agency') );
}
if ( ! defined( 'PACKERS_AGENCY_SUPPORT_URL' ) ) {
    define( 'PACKERS_AGENCY_SUPPORT_URL', esc_url( 'https://wordpress.org/support/theme/packers-agency/', 'packers-agency') );
}
if ( ! defined( 'PACKERS_AGENCY_BUNDLE_URL' ) ) {
    define( 'PACKERS_AGENCY_BUNDLE_URL', esc_url( 'https://www.themeignite.com/products/wp-theme-bundle', 'packers-agency') );
}

$packers_agency_theme_data = wp_get_theme();
if( ! defined( 'PACKERS_AGENCY_THEME_VERSION' ) ) define ( 'PACKERS_AGENCY_THEME_VERSION', $packers_agency_theme_data->get( 'Version' ) );
if( ! defined( 'PACKERS_AGENCY_THEME_NAME' ) ) define( 'PACKERS_AGENCY_THEME_NAME', $packers_agency_theme_data->get( 'Name' ) );

if ( ! function_exists( 'packers_agency_setup' ) ) :
/**
 * Sets up theme defaults and registers support for various WordPress features.
 *
 * Note that this function is hooked into the after_setup_theme hook, which
 * runs before the init hook. The init hook is too late for some features, such
 * as indicating support for post thumbnails.
 */
function packers_agency_setup() {

	// Add default posts and comments RSS feed links to head.
	add_theme_support( 'automatic-feed-links' );

	/*
	 * Let WordPress manage the document title.
	 * By adding theme support, we declare that this theme does not use a
	 * hard-coded <title> tag in the document head, and expect WordPress to
	 * provide it for us.
	 */
	add_theme_support( 'title-tag' );

	/*
	 * Enable support for Post Thumbnails on posts and pages.
	 *
	 * @link https://developer.wordpress.org/themes/functionality/featured-images-post-thumbnails/
	 */
	add_theme_support( 'post-thumbnails' );

	// This theme uses wp_nav_menu() in one location.
	register_nav_menus( array(
		'primary' => esc_html__( 'Primary', 'packers-agency' ),
	) );

	/*
	 * Switch default core markup for search form, comment form, and comments
	 * to output valid HTML5.
	 */
	add_theme_support( 'html5', array(
		'search-form',
		'comment-list',
		'gallery',
		'caption',
	) );

	/*
	 * Enable support for Post Formats.
	 * See https://developer.wordpress.org/themes/functionality/post-formats/
	 */
	add_theme_support( 'post-formats', array(
		'aside',
		'image',
		'video',
		'quote',
		'link',
		'gallery',
        'status',
        'audio', 
        'chat'
	) );

	// Set up the WordPress core custom background feature.
	add_theme_support( 'custom-background', apply_filters( 'packers_agency_custom_background_args', array(
		'default-color' => 'ffffff',
		'default-image' => '',
	) ) );

	/* Custom Logo */
    add_theme_support( 'custom-logo', array(
    	'header-text' => array( 'site-title', 'site-description' ),
    ) );

    load_theme_textdomain( 'packers-agency' );

	add_theme_support( 'woocommerce' );

    /**
	 * Custom template tags for this theme.
	 */
	require get_template_directory() . '/inc/template-tags.php';

	/**
	 * Custom functions that act independently of the theme templates.
	 */
	require get_template_directory() . '/inc/extra.php';

	/**
	 * Customizer additions.
	 */
	require get_template_directory() . '/inc/customizer.php';

	/**
	 * Social Links Widget
	 */
	require get_template_directory() . '/inc/widget-social-links.php';

	/**
	 * Info Theme
	 */
	require get_template_directory() . '/inc/info.php';

	/**
	 * Info Theme
	 */
	require get_template_directory() . '/inc/sanitization.php';

	/**
	 * Getting Started
	*/
	require get_template_directory() . '/inc/getting-started/getting-started.php';

	/**
	 * setup wizard
	 */
	require get_parent_theme_file_path( '/theme-wizard/config.php' );
}
endif;
add_action( 'after_setup_theme', 'packers_agency_setup' );

	/**
	 * Implement the Custom Header feature.
	 */
	require get_template_directory() . '/inc/custom-header.php';

/**
 * Set the content width in pixels, based on the theme's design and stylesheet.
 *
 * Priority 0 to make it available to lower priority callbacks.
 *
 * @global int $packers_agency_content_width
 */
function packers_agency_content_width() {
	$GLOBALS['content_width'] = apply_filters( 'packers_agency_content_width', 780 );
}
add_action( 'after_setup_theme', 'packers_agency_content_width', 0 );


/**
 * Register widget area.
 *
 * @link https://developer.wordpress.org/themes/functionality/sidebars/#registering-a-sidebar
 */
function packers_agency_widgets_init() {
	register_sidebar( array(
		'name'          => esc_html__( 'Header Sidebar', 'packers-agency' ),
		'id'            => 'header-sidebar',
		'description'   => '',
		'before_widget' => '<section id="%1$s" class="widget %2$s">',
		'after_widget'  => '</section>',
		'before_title'  => '<h2 class="widget-title">',
		'after_title'   => '</h2>',
	) );
	register_sidebar( array(
		'name'          => esc_html__( 'Sidebar Option', 'packers-agency' ),
		'id'            => 'right-sidebar',
		'description'   => '',
		'before_widget' => '<section id="%1$s" class="widget %2$s">',
		'after_widget'  => '</section>',
		'before_title'  => '<h2 class="widget-title">',
		'after_title'   => '</h2>',
	) );
	register_sidebar( array(
		'name'          => esc_html__( 'Sidebar Two', 'packers-agency' ),
		'id'            => 'sidebar-2',
		'description'   => '',
		'before_widget' => '<section id="%1$s" class="widget %2$s">',
		'after_widget'  => '</section>',
		'before_title'  => '<h2 class="widget-title">',
		'after_title'   => '</h2>',
	) );
	register_sidebar( array(
		'name'          => esc_html__( 'Sidebar Three', 'packers-agency' ),
		'id'            => 'sidebar-3',
		'description'   => '',
		'before_widget' => '<section id="%1$s" class="widget %2$s">',
		'after_widget'  => '</section>',
		'before_title'  => '<h2 class="widget-title">',
		'after_title'   => '</h2>',
	) );
	register_sidebar( array(
		'name'          => esc_html__( 'Footer One', 'packers-agency' ),
		'id'            => 'footer-one',
		'description'   => '',
		'before_widget' => '<section id="%1$s" class="widget %2$s">',
		'after_widget'  => '</section>',
		'before_title'  => '<h2 class="widget-title">',
		'after_title'   => '</h2>',
	) );
    
    register_sidebar( array(
		'name'          => esc_html__( 'Footer Two', 'packers-agency' ),
		'id'            => 'footer-two',
		'description'   => '',
		'before_widget' => '<section id="%1$s" class="widget %2$s">',
		'after_widget'  => '</section>',
		'before_title'  => '<h2 class="widget-title">',
		'after_title'   => '</h2>',
	) );
    
    register_sidebar( array(
		'name'          => esc_html__( 'Footer Three', 'packers-agency' ),
		'id'            => 'footer-three',
		'description'   => '',
		'before_widget' => '<section id="%1$s" class="widget %2$s">',
		'after_widget'  => '</section>',
		'before_title'  => '<h2 class="widget-title">',
		'after_title'   => '</h2>',
	) );

	register_sidebar( array(
		'name'          => esc_html__( 'Footer Four', 'packers-agency' ),
		'id'            => 'footer-four',
		'description'   => '',
		'before_widget' => '<section id="%1$s" class="widget %2$s">',
		'after_widget'  => '</section>',
		'before_title'  => '<h2 class="widget-title">',
		'after_title'   => '</h2>',
	) );

}
add_action( 'widgets_init', 'packers_agency_widgets_init' );

if( ! function_exists( 'packers_agency_scripts' ) ) :

/**
 * Enqueue scripts and styles.
 */
function packers_agency_scripts() {

	// Use minified libraries if SCRIPT_DEBUG is false
    $packers_agency_build  = ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ) ? '/build' : '';
    $packers_agency_suffix = ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ) ? '' : '.min';

    wp_enqueue_style( 'bootstrap-style', get_template_directory_uri().'/css/build/bootstrap.css' );
    wp_enqueue_style( 'owl.carousel', get_template_directory_uri() . '/css/build/owl.carousel.css' );

	wp_enqueue_style( 'fontawesome-all', esc_url(get_template_directory_uri()).'/css/all.min.css');

	wp_enqueue_style( 'packers-agency-style', get_stylesheet_uri(), array(), PACKERS_AGENCY_THEME_VERSION );

	require get_parent_theme_file_path( '/inc/css_custom.php' );
	wp_add_inline_style( 'packers-agency-style',$packers_agency_custom_css );
	
  	wp_enqueue_script( 'packers-agency-all', get_template_directory_uri() . '/js' . $packers_agency_build . '/all' . $packers_agency_suffix . '.js', array( 'jquery' ), '6.1.1', true );
  	wp_enqueue_script( 'packers-agency-v4-shims', get_template_directory_uri() . '/js' . $packers_agency_build . '/v4-shims' . $packers_agency_suffix . '.js', array( 'jquery' ), '6.1.1', true );
  	wp_enqueue_script( 'packers-agency-modal-accessibility', get_template_directory_uri() . '/js' . $packers_agency_build . '/modal-accessibility' . $packers_agency_suffix . '.js', array( 'jquery' ), PACKERS_AGENCY_THEME_VERSION, true );
	wp_enqueue_script( 'owl.carousel', get_template_directory_uri() . '/js/build/owl.carousel.js', array('jquery'), '2.6.0', true );
	wp_enqueue_script( 'bootstrap', get_template_directory_uri() . '/js/build/bootstrap.js', array('jquery'), '2.6.0', true );
	wp_enqueue_script( 'packers-agency-js', get_template_directory_uri() . '/js/build/custom.js', array('jquery'), PACKERS_AGENCY_THEME_VERSION, true );
	// Wow script.
	wp_enqueue_script( 'wow-jquery', get_template_directory_uri() . '/js/build/wow.js', array('jquery'),'' ,true );
	// Animate CSS
	wp_enqueue_style( 'animate-style', get_template_directory_uri() . '/css/build/animate.css' );

	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}
}
endif;
add_action( 'wp_enqueue_scripts', 'packers_agency_scripts' );

if( ! function_exists( 'packers_agency_admin_scripts' ) ) :
/**
 * Admin scripts
*/
function packers_agency_admin_scripts() {
	wp_enqueue_style( 'packers-agency-admin-style',get_template_directory_uri().'/inc/css/admin.css', PACKERS_AGENCY_THEME_VERSION, 'screen' );
}
endif;
add_action( 'admin_enqueue_scripts', 'packers_agency_admin_scripts' );

function packers_agency_customize_enque_js(){
	wp_enqueue_script( 'customizer', get_template_directory_uri() . '/inc/js/customizer.js', array('jquery'), '2.6.0', true );
}
add_action( 'customize_controls_enqueue_scripts', 'packers_agency_customize_enque_js', 0 );


if( ! function_exists( 'packers_agency_block_editor_styles' ) ) :
/**
 * Enqueue editor styles for Gutenberg
 */
function packers_agency_block_editor_styles() {
	// Use minified libraries if SCRIPT_DEBUG is false
	$packers_agency_build  = ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ) ? '/build' : '';
	$packers_agency_suffix = ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ) ? '' : '.min';
	
	// Block styles.
	wp_enqueue_style( 'packers-agency-block-editor-style', get_template_directory_uri() . '/css' . $packers_agency_build . '/editor-block' . $packers_agency_suffix . '.css' );
}
endif;
add_action( 'enqueue_block_editor_assets', 'packers_agency_block_editor_styles' );

/**
 * Remove header text setting and control from the Customizer.
 */
function packers_agency_remove_customizer_setting($wp_customize) {
    // Replace 'your_setting_id' with the actual ID or name of the setting you want to remove
    $wp_customize->remove_control('display_header_text');
    $wp_customize->remove_setting('display_header_text');
}
add_action('customize_register', 'packers_agency_remove_customizer_setting');

/**
 * Detects whether the current page is using the themed home template.
 *
 * The theme has used both template filenames during different iterations.
 * Keep the check tolerant so header/body logic stays consistent.
 */
function packers_agency_is_home_template() {
	return is_page_template( 'template-home.php' ) || is_page_template( 'template-homepage.php' );
}

/**
 * Build a page if it does not already exist.
 *
 * @param string $slug Page slug.
 * @param string $title Page title.
 * @param string $template Optional page template file.
 * @param string $content Optional page content.
 * @return int Page ID.
 */
function packers_agency_create_page_if_missing( $slug, $title, $template = '', $content = '' ) {
	$page = get_page_by_path( $slug, OBJECT, 'page' );
	if ( ! $page ) {
		$page = get_page_by_title( $title );
	}

	if ( $page ) {
		$page_id = $page->ID;
	} else {
		$page_id = wp_insert_post(
			array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => $title,
				'post_name'    => $slug,
				'post_content' => $content,
				'post_author'  => 1,
			)
		);
	}

	if ( $page_id && $template ) {
		update_post_meta( $page_id, '_wp_page_template', $template );
	}

	return absint( $page_id );
}

/**
 * Seed a corporate site structure for JoathiLogística.
 */
function packers_agency_seed_corporate_site() {
	if ( get_option( 'packers_agency_corporate_site_seeded' ) ) {
		return;
	}

	if ( ! current_user_can( 'manage_options' ) && ! wp_doing_cron() ) {
		return;
	}

	$home_id = packers_agency_create_page_if_missing( 'home', 'Home' );
	if ( $home_id ) {
		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', $home_id );
	}

	$pages = array(
		array( 'slug' => 'quienes-somos', 'title' => 'Quiénes somos', 'template' => '/template-about.php', 'content' => '' ),
		array( 'slug' => 'servicios', 'title' => 'Servicios', 'template' => '/template-services.php', 'content' => '' ),
		array( 'slug' => 'operativa', 'title' => 'Operativa', 'template' => '/template-operativa.php', 'content' => '' ),
		array( 'slug' => 'contacto', 'title' => 'Contacto', 'template' => '/template-contacto.php', 'content' => '' ),
		array( 'slug' => 'acceso-joathiva', 'title' => 'Acceso JoathiVA', 'template' => '/template-acceso.php', 'content' => '' ),
	);

	$page_ids = array();
	foreach ( $pages as $packers_agency_page ) {
		$page_ids[ $packers_agency_page['slug'] ] = packers_agency_create_page_if_missing(
			$packers_agency_page['slug'],
			$packers_agency_page['title'],
			$packers_agency_page['template'],
			$packers_agency_page['content']
		);
	}

	$menu_name = 'Primary Menu';
	$menu = wp_get_nav_menu_object( $menu_name );
	if ( ! $menu ) {
		$menu_id = wp_create_nav_menu( $menu_name );
		$items = array(
			array( 'title' => 'Inicio', 'url' => home_url( '/' ) ),
			array( 'title' => 'Quiénes somos', 'url' => get_permalink( $page_ids['quienes-somos'] ) ),
			array( 'title' => 'Servicios', 'url' => get_permalink( $page_ids['servicios'] ) ),
			array( 'title' => 'Operativa', 'url' => get_permalink( $page_ids['operativa'] ) ),
			array( 'title' => 'Contacto', 'url' => get_permalink( $page_ids['contacto'] ) ),
			array( 'title' => 'JoathiVA', 'url' => home_url( '/v/' ) ),
		);

		foreach ( $items as $packers_agency_item ) {
			wp_update_nav_menu_item(
				$menu_id,
				0,
				array(
					'menu-item-title'     => $packers_agency_item['title'],
					'menu-item-url'       => $packers_agency_item['url'],
					'menu-item-status'    => 'publish',
					'menu-item-type'      => 'custom',
					'menu-item-object'    => 'custom',
					'menu-item-parent-id' => 0,
				)
			);
		}

		$locations = get_theme_mod( 'nav_menu_locations', array() );
		$locations['primary'] = $menu_id;
		set_theme_mod( 'nav_menu_locations', $locations );
	}

	set_theme_mod( 'packers_agency_primary_color', '#0E3B2E' );
	set_theme_mod( 'packers_agency_second_color', '#F2B200' );
	set_theme_mod( 'packers_agency_header_btn_text', 'Ingresar a JoathiVA' );
	set_theme_mod( 'packers_agency_header_btn_url', home_url( '/v/' ) );
	set_theme_mod( 'header_site_title', false );
	set_theme_mod( 'packers_agency_show_hide_search', false );

	update_option( 'packers_agency_corporate_site_seeded', 1, false );
}
add_action( 'admin_init', 'packers_agency_seed_corporate_site' );
add_action( 'after_switch_theme', 'packers_agency_seed_corporate_site' );

function packers_agency_custom_blog_banner_title() {
    if (is_404()) {
        echo '<h1 class="entry-title">'. esc_html__( 'Comments are closed.', 'packers-agency' ).'</h1>';
    } elseif (is_search()) {
        echo '<h1 class="entry-title">'. esc_html__( 'Search Result For.', 'packers-agency' ).' ' . get_search_query() . '</h1>';
    } elseif (is_home() && !is_front_page()) {
        echo '<h1 class="entry-title">'. esc_html__( 'Blogs', 'packers-agency' ).'</h1>';
    } elseif (function_exists('is_shop') && is_shop()) {
        echo '<h1 class="entry-title">'. esc_html__( 'Shop', 'packers-agency' ).'</h1>';
    } elseif (packers_agency_is_home_template()) {
    } elseif (is_page()) {
        the_title('<h1 class="entry-title">', '</h1>');
    } elseif (is_single()) {
        the_title('<h1 class="entry-title">', '</h1>');
    } elseif (is_archive()) {
        the_archive_title('<h1 class="entry-title">', '</h1>');
    } else {
        the_archive_title('<h1 class="entry-title">', '</h1>');
    }
	packers_agency_the_breadcrumb();
}

function packers_agency_the_breadcrumb() {
    echo '<div class="breadcrumb justify-content-center align-items-center mt-5">';

    if (!is_home()) {
        echo '<a class="home-main align-self-center" href="' . esc_url(home_url()) . '">';
        bloginfo('name');
        echo "</a> >> ";

        if (is_category() || is_single()) {
            the_category(' >> ');
            if (is_single()) {
                echo ' >> <span class="current-breadcrumb">' . esc_html(get_the_title()) . '</span>';
            }
        } elseif (is_page()) {
            echo '<span class="current-breadcrumb">' . esc_html(get_the_title()) . '</span>';
        }
    }

    echo '</div>';
}

function packers_agency_enqueue_google_fontss() {
    $packers_agency_heading_font_family = get_theme_mod('packers_agency_heading_font_family', '');
    $packers_agency_body_font_family = get_theme_mod('packers_agency_body_font_family', '');

    // Google Fonts URL builder
    $google_fonts = array(
        'Arial'          => '',
        'Verdana'        => '',
        'Helvetica'      => '',
        'Times New Roman'=> '',
        'Georgia'        => '',
        'Courier New'    => '',
        'Trebuchet MS'   => '',
        'Tahoma'         => '',
        'Palatino'       => '',
        'Garamond'       => '',
        'Impact'         => '',
        'Comic Sans MS'  => '',
        'Lucida Sans'    => '',
        'Arial Black'    => '',
        'Gill Sans'      => '',
        'Segoe UI'       => '',
        'Open Sans'      => 'Open+Sans:wght@400;700',
        'Roboto'         => 'Roboto:wght@400;700',
        'Lato'           => 'Lato:wght@400;700',
        'Montserrat'     => 'Montserrat:wght@400;700',
        'Libre Baskerville' => 'Libre+Baskerville:wght@400;700'
    );

    $packers_agency_google_fonts_url = '';

    if (!empty($google_fonts[$packers_agency_heading_font_family]) || !empty($google_fonts[$packers_agency_body_font_family])) {
        $fonts = array();

        if (!empty($google_fonts[$packers_agency_heading_font_family])) {
            $fonts[] = $google_fonts[$packers_agency_heading_font_family];
        }

        if (!empty($google_fonts[$packers_agency_body_font_family])) {
            $fonts[] = $google_fonts[$packers_agency_body_font_family];
        }

        // Build Google Fonts URL
        $packers_agency_google_fonts_url = add_query_arg(
            'family',
            implode('|', $fonts),
            'https://fonts.googleapis.com/css2'
        );
    }

    if ($packers_agency_google_fonts_url) {
        wp_enqueue_style('packers-agency-google-fonts', $packers_agency_google_fonts_url, false);
    }
}
add_action('wp_enqueue_scripts', 'packers_agency_enqueue_google_fontss');


/*-----------------------Typography Function---------------------------------------*/

function packers_agency_apply_typography() {
    $packers_agency_heading_font_family = get_theme_mod('packers_agency_heading_font_family');
    $packers_agency_body_font_family = get_theme_mod('packers_agency_body_font_family');

    $packers_agency_custom_css = '';

    if ($packers_agency_body_font_family) {
        $packers_agency_custom_css .= "body, a, a:active, a:hover { font-family: " . esc_html($packers_agency_body_font_family) . " !important; }";
    }

    if ($packers_agency_heading_font_family) {
        $packers_agency_custom_css .= "h1, h2, h3, h4, h5, h6 { font-family: " . esc_html($packers_agency_heading_font_family) . " !important; }";
    }

    if (!empty($packers_agency_custom_css)) {
        wp_add_inline_style('packers-agency-style', $packers_agency_custom_css);
    }
}
add_action('wp_enqueue_scripts', 'packers_agency_apply_typography');


/*-----------------------Menu Typography Start---------------------------------------*/

function packers_agency_menu_customizer_css() {
    $packers_agency_menu_font_weight = get_theme_mod('packers_agency_menu_font_weight', 'bold');
    $packers_agency_menu_text_transform = get_theme_mod('packers_agency_menu_text_transform', 'capitalize');

    $packers_agency_custom_css = "
        .main-navigation ul li a {
            font-weight: " . esc_html($packers_agency_menu_font_weight) . ";
            text-transform: " . esc_html($packers_agency_menu_text_transform) . ";
        }
    ";

    wp_add_inline_style('packers-agency-style', $packers_agency_custom_css);
}
add_action('wp_enqueue_scripts', 'packers_agency_menu_customizer_css');

/*-----------------------Menu Typography End---------------------------------------*/

/**
 * AJAX handler to dismiss Whizzie notice
 */
if ( ! function_exists( 'packers_agency_dismiss_whizzie_notice' ) ) {
    function packers_agency_dismiss_whizzie_notice() {

        update_user_meta(
            get_current_user_id(),
            'packers_agency_whizzie_dismissed',
            true
        );

        wp_die();
    }
}
add_action(
    'wp_ajax_packers_agency_dismiss_whizzie_notice',
    'packers_agency_dismiss_whizzie_notice'
);

/**
 * Check if Whizzie notice is dismissed
 */
if ( ! function_exists( 'packers_agency_is_whizzie_dismissed' ) ) {
    function packers_agency_is_whizzie_dismissed() {

        return (bool) get_user_meta(
            get_current_user_id(),
            'packers_agency_whizzie_dismissed',
            true
        );

    }
}

/**
 * Reset Whizzie notice when theme is activated
 */
add_action( 'after_switch_theme', function () {

    $users = get_users( array(
        'fields' => 'ID',
    ) );

    foreach ( $users as $user_id ) {
        delete_user_meta( $user_id, 'packers_agency_whizzie_dismissed' );
    }

});

/**
 * Display the admin notice unless dismissed.
 */
function packers_agency_dashboard_notice() {
    // Check if the notice is dismissed
    $dismissed = get_user_meta(get_current_user_id(), 'packers_agency_dismissable_notice', true);

    // Display the notice only if not dismissed
    if (!$dismissed) {
        ?>
        <div class="updated notice notice-success is-dismissible notice-get-started-class" data-notice="get-start">
            <div class="notice-details">
                <div class="notice-content">
                    <h2><?php /* translators: %s: Theme name */printf( esc_html__( 'Thanks you for installing %s.', 'packers-agency' ), '<strong>Packers Agency</strong>' );?></h2>
                    <p><?php echo esc_html('Your journey to a powerful and stylish website begins here. Let’s get everything set up in just a few clicks!', 'packers-agency'); ?></p>
                    <div class="notice-btns">
                        <a class="button button-primary getstart"
                           href="<?php echo esc_url(admin_url('themes.php?page=packers-agency')); ?>"><?php esc_html_e('Getting Started', 'packers-agency') ?></a>
                       	<a class="button button-primary premium" target="_blank" href="<?php echo esc_url(PACKERS_AGENCY_URL); ?>"><?php esc_html_e('Go To Premium', 'packers-agency') ?></a>
						<a class="button button-primary demo" target="_blank" href="<?php echo esc_url(PACKERS_AGENCY_DEMO_URL); ?>"><?php esc_html_e('View Demo', 'packers-agency') ?></a>
                    </div>
                </div>
                <div class="notice-img">
                    <a href="<?php echo esc_url( PACKERS_AGENCY_BUNDLE_URL ); ?>" target="_blank"><img src="<?php echo esc_url( get_template_directory_uri() . '/images/notice.png' ); ?>"></a>
                </div>
                
            </div>
        </div>
        <?php
    }
}

// Hook to display the notice
add_action('admin_notices', 'packers_agency_dashboard_notice');

/**
 * AJAX handler to dismiss the notice.
 */
function packers_agency_dismissable_notice() {
    // Set user meta to indicate the notice is dismissed
    update_user_meta(get_current_user_id(), 'packers_agency_dismissable_notice', true);
    die();
}

// Hook for the AJAX action
add_action('wp_ajax_packers_agency_dismissable_notice', 'packers_agency_dismissable_notice');

/**
 * Clear dismissed notice state when switching themes.
 */
function packers_agency_switch_theme() {
    // Clear the dismissed notice state when switching themes
    delete_user_meta(get_current_user_id(), 'packers_agency_dismissable_notice');
}

// Hook for switching themes
add_action('after_switch_theme', 'packers_agency_switch_theme');

add_filter( 'woocommerce_enable_setup_wizard', '__return_false' );
