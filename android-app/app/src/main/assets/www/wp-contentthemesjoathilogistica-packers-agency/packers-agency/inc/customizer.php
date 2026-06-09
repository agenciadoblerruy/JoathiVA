<?php
/**
 * Packers Agency Theme Customizer.
 *
 * @link https://developer.wordpress.org/themes/basics/theme-functions/
 *
 * @package packers_agency
 */

if( ! function_exists( 'packers_agency_customize_register' ) ):  
/**
 * Add postMessage support for site title and description for the Theme Customizer.F
 *
 * @param WP_Customize_Manager $wp_customize Theme Customizer object.
 */
function packers_agency_customize_register( $wp_customize ) {
    require get_parent_theme_file_path('/inc/controls/changeable-icon.php');

    require get_parent_theme_file_path('/inc/controls/sortable-control.php');

    //Register the sortable control type.
    $wp_customize->register_control_type( 'Packers_Agency_Control_Sortable' ); 

    if ( version_compare( get_bloginfo('version'),'4.9', '>=') ) {
        $wp_customize->get_section( 'static_front_page' )->title = __( 'Static Front Page', 'packers-agency' );
    }
	
    /* Option list of all post */	
    $packers_agency_options_posts = array();
    $packers_agency_options_posts_obj = get_posts('posts_per_page=-1');
    $packers_agency_options_posts[''] = esc_html__( 'Choose Post', 'packers-agency' );
    foreach ( $packers_agency_options_posts_obj as $packers_agency_posts ) {
    	$packers_agency_options_posts[$packers_agency_posts->ID] = $packers_agency_posts->post_title;
    }
    
    /* Option list of all categories */
    $packers_agency_args = array(
	   'type'                     => 'post',
	   'orderby'                  => 'name',
	   'order'                    => 'ASC',
	   'hide_empty'               => 1,
	   'hierarchical'             => 1,
	   'taxonomy'                 => 'category'
    ); 
    $packers_agency_option_categories = array();
    $packers_agency_category_lists = get_categories( $packers_agency_args );
    $packers_agency_option_categories[''] = esc_html__( 'Choose Category', 'packers-agency' );
    foreach( $packers_agency_category_lists as $packers_agency_category ){
        $packers_agency_option_categories[$packers_agency_category->term_id] = $packers_agency_category->name;
    }
    
    /** Default Settings */    
    $wp_customize->add_panel( 
        'wp_default_panel',
         array(
            'priority' => 10,
            'capability' => 'edit_theme_options',
            'theme_supports' => '',
            'title' => esc_html__( 'Default Settings', 'packers-agency' ),
            'description' => esc_html__( 'Default section provided by wordpress customizer.', 'packers-agency' ),
        ) 
    );
    
    $wp_customize->get_section( 'title_tagline' )->panel                  = 'wp_default_panel';
    $wp_customize->get_section( 'colors' )->panel                         = 'wp_default_panel';
    $wp_customize->get_section( 'header_image' )->panel                   = 'wp_default_panel';
    $wp_customize->get_section( 'background_image' )->panel               = 'wp_default_panel';
    $wp_customize->get_section( 'static_front_page' )->panel              = 'wp_default_panel';
    
    $wp_customize->get_setting( 'blogname' )->transport         = 'postMessage';
	$wp_customize->get_setting( 'blogdescription' )->transport  = 'postMessage';
	$wp_customize->get_setting( 'header_textcolor' )->transport = 'postMessage';
    
    /** Default Settings Ends */
    
    /** Site Title control */
    $wp_customize->add_setting( 
        'header_site_title', 
        array(
            'default'           => true,
            'sanitize_callback' => 'packers_agency_sanitize_checkbox',
        ) 
    );

    $wp_customize->add_control(
        'header_site_title',
        array(
            'label'       => __( 'Show / Hide Site Title', 'packers-agency' ),
            'section'     => 'title_tagline',
            'type'        => 'checkbox',
        )
    );

    /** Tagline control */
    $wp_customize->add_setting( 
        'header_tagline', 
        array(
            'default'           => false,
            'sanitize_callback' => 'packers_agency_sanitize_checkbox',
        ) 
    );

    $wp_customize->add_control(
        'header_tagline',
        array(
            'label'       => __( 'Show / Hide Tagline', 'packers-agency' ),
            'section'     => 'title_tagline',
            'type'        => 'checkbox',
        )
    );

    $wp_customize->add_setting('logo_width', array(
        'sanitize_callback' => 'absint', 
    ));

    // Add a control for logo width
    $wp_customize->add_control('logo_width', array(
        'label' => __('Logo Width', 'packers-agency'),
        'section' => 'title_tagline',
        'type' => 'number',
        'input_attrs' => array(
            'min' => '50', 
            'max' => '500', 
            'step' => '5', 
    ),
        'default' => '100', 
    ));

    $wp_customize->add_setting( 'packers_agency_site_title_size', array(
        'default'           => 30, // Default font size in pixels
        'sanitize_callback' => 'absint', // Sanitize the input as a positive integer
    ) );

    // Add control for site title size
    $wp_customize->add_control( 'packers_agency_site_title_size', array(
        'type'        => 'number',
        'section'     => 'title_tagline', // You can change this section to your preferred section
        'label'       => __( 'Site Title Font Size (px)', 'packers-agency' ),
        'input_attrs' => array(
            'min'  => 10,
            'max'  => 100,
            'step' => 1,
        ),
    ) );

    /** Responsive Media settings */
    
    $wp_customize->add_section(
        'packers_agency_responsive_media_section',
        array(
            'title' => esc_html__( 'Responsive Media Settings', 'packers-agency' ),
            'priority' => 20,
            'capability' => 'edit_theme_options',
            'panel' => 'packers_agency_general_settings',
        )
    );

    /** Scroll to top Responsive control */
    $wp_customize->add_setting( 
        'packers_agency_resp_scroll_top', 
        array(
            'default' => 1,
            'sanitize_callback' => 'packers_agency_sanitize_checkbox',
        ) 
    );

    $wp_customize->add_control(
        'packers_agency_resp_scroll_top',
        array(
            'label'       => __( 'Show Scroll To Top', 'packers-agency' ),
            'section'     => 'packers_agency_responsive_media_section',
            'type'        => 'checkbox',
        )
    );

        /** Scroll to top Responsive control */
    $wp_customize->add_setting( 
        'packers_agency_resp_loader', 
        array(
            'default' => 0,
            'sanitize_callback' => 'packers_agency_sanitize_checkbox',
        ) 
    );

    $wp_customize->add_control(
        'packers_agency_resp_loader',
        array(
            'label'       => __( 'Show Preloader', 'packers-agency' ),
            'section'     => 'packers_agency_responsive_media_section',
            'type'        => 'checkbox',
        )
    );

    /** Responsive Media Ends */

    //Global Color
    $wp_customize->add_section(
        'packers_agency_global_color',
        array(
            'title' => esc_html__( 'Global Color Settings', 'packers-agency' ),
            'priority' => 20,
            'capability' => 'edit_theme_options',
            'panel' => 'packers_agency_general_settings',
        )
    );

    $wp_customize->add_setting('packers_agency_primary_color', array(
        'default'           => '#0E3B2E',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'packers_agency_primary_color', array(
        'label'    => __('Theme Primary Color', 'packers-agency'),
        'section'  => 'packers_agency_global_color',
        'settings' => 'packers_agency_primary_color',
    )));    

    $wp_customize->add_setting('packers_agency_second_color', array(
        'default'           => '#F2B200',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'packers_agency_second_color', array(
        'label'    => __('Theme Secondary Color', 'packers-agency'),
        'section'  => 'packers_agency_global_color',
        'settings' => 'packers_agency_second_color',
    )));

        /** Home Page Settings */
    $wp_customize->add_panel( 
        'packers_agency_post_settings',
         array(
            'priority' => 10,
            'capability' => 'edit_theme_options',
            'title' => esc_html__( 'Page & Post Settings', 'packers-agency' ),
            'description' => esc_html__( 'Customize Page & Post Settings', 'packers-agency' ),
        ) 
    );

    /** Post Layouts */

    /** Blog Content Alignment */
    $wp_customize->add_setting('packers_agency_blog_layout_option', array(
        'default'           => 'Left',
        'sanitize_callback' => 'packers_agency_sanitize_choices',
    ));

    $wp_customize->add_control('packers_agency_blog_layout_option', array(
        'label'    => __('Post Content Alignment', 'packers-agency'),
        'section'  => 'packers_agency_post_layout_section',
        'settings' => 'packers_agency_blog_layout_option',
        'type'     => 'select',
        'choices'  => array(
		   'Left'     => __('Left', 'packers-agency'),
		   'Center'     => __('Center', 'packers-agency'),
		   'Right'     => __('Right', 'packers-agency'),
        ),
    ));
    
    $wp_customize->add_section(
        'packers_agency_post_layout_section',
        array(
            'title' => esc_html__( 'Post Layout Settings', 'packers-agency' ),
            'priority' => 20,
            'capability' => 'edit_theme_options',
            'panel' => 'packers_agency_post_settings',
        )
    );

    $wp_customize->add_setting('packers_agency_post_layout_setting', array(
        'default'           => 'right-sidebar',
        'sanitize_callback' => 'packers_agency_sanitize_post_layout',
    ));

    $wp_customize->add_control('packers_agency_post_layout_setting', array(
        'label'    => __('Post Column Settings', 'packers-agency'),
        'section'  => 'packers_agency_post_layout_section',
        'settings' => 'packers_agency_post_layout_setting',
        'type'     => 'select',
        'choices'  => array(        
            'right-sidebar'   => __('Right Sidebar', 'packers-agency'),
            'left-sidebar'   => __('Left Sidebar', 'packers-agency'),
            'one-column'   => __('One Column', 'packers-agency'),
            'three-column'   => __('Three Columns', 'packers-agency'),
            'four-column'   => __('Four Columns', 'packers-agency'),
            'grid-layout'   => __('Grid Layout', 'packers-agency')
        ),
    ));

    $wp_customize->add_setting('packers_agency_archive_pagination_alignment',array(
        'default' => 'left-align',
        'sanitize_callback' => 'packers_agency_sanitize_pagination_alignment'
    ));
    $wp_customize->add_control('packers_agency_archive_pagination_alignment',array(
        'type' => 'select',
        'label' => __('Pagination Alignment','packers-agency'),
        'section' => 'packers_agency_post_layout_section',
        'choices' => array(
            'right-align' => __('Right Alignment','packers-agency'),
            'center-align' => __('Center Alignment','packers-agency'),
            'left-align' => __('Left Alignment','packers-agency'),
        ),
    ) );

     /** Post Layouts Ends */
     
    /** Post Settings */
    $wp_customize->add_section(
        'packers_agency_post_settings',
        array(
            'title' => esc_html__( 'Post Settings', 'packers-agency' ),
            'priority' => 20,
            'capability' => 'edit_theme_options',
            'panel' => 'packers_agency_post_settings',
        )
    );

    /** Post Heading control */
    $wp_customize->add_setting( 
        'packers_agency_post_heading_setting', 
        array(
            'default'           => true,
            'sanitize_callback' => 'packers_agency_sanitize_checkbox',
        ) 
    );

    $wp_customize->add_control(
        'packers_agency_post_heading_setting',
        array(
            'label'       => __( 'Show / Hide Post Heading', 'packers-agency' ),
            'section'     => 'packers_agency_post_settings',
            'type'        => 'checkbox',
        )
    );

    /** Post Meta control */
    $wp_customize->add_setting( 
        'packers_agency_post_meta_setting', 
        array(
            'default'           => true,
            'sanitize_callback' => 'packers_agency_sanitize_checkbox',
        ) 
    );

    $wp_customize->add_control(
        'packers_agency_post_meta_setting',
        array(
            'label'       => __( 'Show / Hide Post Meta', 'packers-agency' ),
            'section'     => 'packers_agency_post_settings',
            'type'        => 'checkbox',
        )
    );

    /** Post Image control */
    $wp_customize->add_setting( 
        'packers_agency_post_image_setting', 
        array(
            'default'           => true,
            'sanitize_callback' => 'packers_agency_sanitize_checkbox',
        ) 
    );

    $wp_customize->add_control(
        'packers_agency_post_image_setting',
        array(
            'label'       => __( 'Show / Hide Post Image', 'packers-agency' ),
            'section'     => 'packers_agency_post_settings',
            'type'        => 'checkbox',
        )
    );

    /** Post Content control */
    $wp_customize->add_setting( 
        'packers_agency_post_content_setting', 
        array(
            'default'           => true,
            'sanitize_callback' => 'packers_agency_sanitize_checkbox',
        ) 
    );

    $wp_customize->add_control(
        'packers_agency_post_content_setting',
        array(
            'label'       => __( 'Show / Hide Post Content', 'packers-agency' ),
            'section'     => 'packers_agency_post_settings',
            'type'        => 'checkbox',
        )
    );
    /** Post ReadMore control */
     $wp_customize->add_setting( 'packers_agency_read_more_setting`', array(
        'default'           => true,
        'sanitize_callback' => 'packers_agency_sanitize_checkbox',
    ) );

    $wp_customize->add_control( 'packers_agency_read_more_setting`', array(
        'type'        => 'checkbox',
        'section'     => 'packers_agency_post_settings', 
        'label'       => __( 'Display Read More Button', 'packers-agency' ),
    ) );

    $wp_customize->add_setting('packers_agency_blog_meta_order', array(
        'default' => array('heading', 'author', 'featured-image', 'content','button'),
        'sanitize_callback' => 'packers_agency_sanitize_sortable',
    ));
    $wp_customize->add_control(new Packers_Agency_Control_Sortable($wp_customize, 'packers_agency_blog_meta_order', array(
        'label' => esc_html__('Post Meta Ordering', 'packers-agency'),
        'description' => __('Drag & drop post items to rearrange the ordering ( this control will not function by post format )', 'packers-agency') ,
        'section' => 'packers_agency_post_settings',
        'choices' => array(
            'heading' => __('heading', 'packers-agency') ,
            'author' => __('author', 'packers-agency') ,
            'featured-image' => __('featured-image', 'packers-agency') ,
            'content' => __('content', 'packers-agency') ,
            'button' => __('button', 'packers-agency') ,
        ) ,
    )));

    /** Post Settings Ends */

     /** Single Post Settings */
    $wp_customize->add_section(
        'packers_agency_single_post_settings',
        array(
            'title' => esc_html__( 'Single Post Settings', 'packers-agency' ),
            'priority' => 20,
            'capability' => 'edit_theme_options',
            'panel' => 'packers_agency_post_settings',
        )
    );

    /** Single Post Meta control */
    $wp_customize->add_setting( 
        'packers_agency_single_post_meta_setting', 
        array(
            'default'           => true,
            'sanitize_callback' => 'packers_agency_sanitize_checkbox',
        ) 
    );

    $wp_customize->add_control(
        'packers_agency_single_post_meta_setting',
        array(
            'label'       => __( 'Show / Hide Single Post Meta', 'packers-agency' ),
            'section'     => 'packers_agency_single_post_settings',
            'type'        => 'checkbox',
        )
    );

    /** Single Post Content control */
    $wp_customize->add_setting( 
        'packers_agency_single_post_content_setting', 
        array(
            'default'           => true,
            'sanitize_callback' => 'packers_agency_sanitize_checkbox',
        ) 
    );

    $wp_customize->add_control(
        'packers_agency_single_post_content_setting',
        array(
            'label'       => __( 'Show / Hide Single Post Content', 'packers-agency' ),
            'section'     => 'packers_agency_single_post_settings',
            'type'        => 'checkbox',
        )
    );

    /** Single Post Settings Ends */

         // Typography Settings Section
    $wp_customize->add_section('packers_agency_typography_settings', array(
        'title'      => esc_html__('Typography Settings', 'packers-agency'),
        'priority'   => 30,
        'capability' => 'edit_theme_options',
        'panel' => 'packers_agency_general_settings',
    ));

    // Array of fonts to choose from
    $font_choices = array(
        ''               => __('Select', 'packers-agency'),
        'Arial'          => 'Arial, sans-serif',
        'Verdana'        => 'Verdana, sans-serif',
        'Helvetica'      => 'Helvetica, sans-serif',
        'Times New Roman'=> '"Times New Roman", serif',
        'Georgia'        => 'Georgia, serif',
        'Courier New'    => '"Courier New", monospace',
        'Trebuchet MS'   => '"Trebuchet MS", sans-serif',
        'Tahoma'         => 'Tahoma, sans-serif',
        'Palatino'       => '"Palatino Linotype", serif',
        'Garamond'       => 'Garamond, serif',
        'Impact'         => 'Impact, sans-serif',
        'Comic Sans MS'  => '"Comic Sans MS", cursive, sans-serif',
        'Lucida Sans'    => '"Lucida Sans Unicode", sans-serif',
        'Arial Black'    => '"Arial Black", sans-serif',
        'Gill Sans'      => '"Gill Sans", sans-serif',
        'Segoe UI'       => '"Segoe UI", sans-serif',
        'Open Sans'      => '"Open Sans", sans-serif',
        'Roboto'         => 'Roboto, sans-serif',
        'Lato'           => 'Lato, sans-serif',
        'Montserrat'     => 'Montserrat, sans-serif',
        'Libre Baskerville' => 'Libre Baskerville',
    );

    // Heading Font Setting
    $wp_customize->add_setting('packers_agency_heading_font_family', array(
        'default'           => '',
        'sanitize_callback' => 'packers_agency_sanitize_choicess',
    ));
    $wp_customize->add_control('packers_agency_heading_font_family', array(
        'type'    => 'select',
        'choices' => $font_choices,
        'label'   => __('Select Font for Heading', 'packers-agency'),
        'section' => 'packers_agency_typography_settings',
    ));

    // Body Font Setting
    $wp_customize->add_setting('packers_agency_body_font_family', array(
        'default'           => '',
        'sanitize_callback' => 'packers_agency_sanitize_choicess',
    ));
    $wp_customize->add_control('packers_agency_body_font_family', array(
        'type'    => 'select',
        'choices' => $font_choices,
        'label'   => __('Select Font for Body', 'packers-agency'),
        'section' => 'packers_agency_typography_settings',
    ));

    /** Typography Settings Section End */

    /** Home Page Settings */
    $wp_customize->add_panel( 
        'packers_agency_general_settings',
         array(
            'priority' => 10,
            'capability' => 'edit_theme_options',
            'title' => esc_html__( 'General Settings', 'packers-agency' ),
            'description' => esc_html__( 'Customize General Settings', 'packers-agency' ),
        ) 
    );

    /** General Settings */
    $wp_customize->add_section(
        'packers_agency_general_settings',
        array(
            'title' => esc_html__( 'Loader Settings', 'packers-agency' ),
            'priority' => 30,
            'capability' => 'edit_theme_options',
            'panel' => 'packers_agency_general_settings',
        )
    );

    /** Preloader control */
    $wp_customize->add_setting( 
        'packers_agency_header_preloader', 
        array(
            'default' => false,
            'sanitize_callback' => 'packers_agency_sanitize_checkbox',
        ) 
    );

    $wp_customize->add_control(
        'packers_agency_header_preloader',
        array(
            'label'       => __( 'Show Preloader', 'packers-agency' ),
            'section'     => 'packers_agency_general_settings',
            'type'        => 'checkbox',
        )
    );

    /** Header Section Settings */
    $wp_customize->add_section(
        'packers_agency_header_section_settings',
        array(
            'title' => esc_html__( 'Header Section Settings', 'packers-agency' ),
            'priority' => 30,
            'capability' => 'edit_theme_options',
            'panel' => 'packers_agency_home_page_settings',
        )
    );

     /** Topbar Text */
    $wp_customize->add_setting(
        'packers_agency_header_location',
        array( 
            'default' => '',
            'sanitize_callback' => 'sanitize_text_field',
            'transport'         => 'refresh'
        )
    );
    
    $wp_customize->add_control(
        'packers_agency_header_location',
        array(
            'label' => esc_html__( 'Add Topbar Text', 'packers-agency' ),
            'section' => 'packers_agency_header_section_settings',
            'type' => 'text',
        )
    );

     /** Email */
    $wp_customize->add_setting(
        'packers_agency_header_email',
        array( 
            'default' => '',
            'sanitize_callback' => 'sanitize_text_field',
            'transport'         => 'refresh'
        )
    );
    
    $wp_customize->add_control(
        'packers_agency_header_email',
        array(
            'label' => esc_html__( 'Add Mail Address', 'packers-agency' ),
            'section' => 'packers_agency_header_section_settings',
            'type' => 'text',
        )
    );

      /** Phone */
    $wp_customize->add_setting(
        'packers_agency_header_phone',
        array( 
            'default' => '',
            'sanitize_callback' => 'sanitize_text_field',
            'transport'         => 'refresh'
        )
    );
    
    $wp_customize->add_control(
        'packers_agency_header_phone',
        array(
            'label' => esc_html__( 'Add Phone', 'packers-agency' ),
            'section' => 'packers_agency_header_section_settings',
            'type' => 'text',
        )
    );

        /** Sign Up Button */
    $wp_customize->add_setting(
        'packers_agency_header_btn_text',
        array( 
            'default' => __( 'Ingresar a JoathiVA', 'packers-agency' ),
            'sanitize_callback' => 'sanitize_text_field',
            'transport'         => 'refresh'
        )
    );
    
    $wp_customize->add_control(
        'packers_agency_header_btn_text',
        array(
            'label' => esc_html__( 'Add Button Text', 'packers-agency' ),
            'section' => 'packers_agency_header_section_settings',
            'type' => 'text',
        )
    );

    /** Appointment Button */
    $wp_customize->add_setting(
        'packers_agency_header_btn_url',
        array( 
            'default' => home_url( '/v/' ),
            'sanitize_callback' => 'esc_url_raw',
            'transport'         => 'refresh'
        )
    );
    
    $wp_customize->add_control(
        'packers_agency_header_btn_url',
        array(
            'label' => esc_html__( 'Add Button URL', 'packers-agency' ),
            'section' => 'packers_agency_header_section_settings',
            'type' => 'url',
        )
    );


    $wp_customize->add_setting( 
        'packers_agency_show_hide_search', 
        array(
            'default' => false ,
            'sanitize_callback' => 'packers_agency_sanitize_checkbox',
        ) 
    );

    $wp_customize->add_control(
        'packers_agency_show_hide_search',
        array(
            'label'       => __( 'Show Search Icon', 'packers-agency' ),
            'section'     => 'packers_agency_header_section_settings',
            'type'        => 'checkbox',
        )
    );
    $wp_customize->add_setting('packers_agency_search_icon',array(
        'default'   => 'fas fa-search',
        'sanitize_callback' => 'sanitize_text_field'
    ));
    $wp_customize->add_control(new Packers_Agency_Changeable_Icon(
        $wp_customize,'packers_agency_search_icon',array(
        'label' => __('Search Icon','packers-agency'),
        'transport' => 'refresh',
        'section'   => 'packers_agency_header_section_settings',
        'type'      => 'icon'
    )));

    $wp_customize->add_setting( 
        'packers_agency_show_hide_header_sidebar', 
        array(
            'default' => false ,
            'sanitize_callback' => 'packers_agency_sanitize_checkbox',
        ) 
    );

    $wp_customize->add_control(
        'packers_agency_show_hide_header_sidebar',
        array(
            'label'       => __( 'Show Sidebar Icon', 'packers-agency' ),
            'section'     => 'packers_agency_header_section_settings',
            'type'        => 'checkbox',
        )
    );

    /** Sticky Header control */
    $wp_customize->add_setting( 
        'packers_agency_sticky_header', 
        array(
            'default' => false,
            'sanitize_callback' => 'packers_agency_sanitize_checkbox',
        ) 
    );

    $wp_customize->add_control(
        'packers_agency_sticky_header',
        array(
            'label'       => __( 'Show Sticky Header', 'packers-agency' ),
            'section'     => 'packers_agency_header_section_settings',
            'type'        => 'checkbox',
        )
    );

    // Add Setting for Menu Font Weight
    $wp_customize->add_setting( 'packers_agency_menu_font_weight', array(
        'default'           => 'Bold',
        'sanitize_callback' => 'packers_agency_sanitize_font_weight',
    ) );

    // Add Control for Menu Font Weight
    $wp_customize->add_control( 'packers_agency_menu_font_weight', array(
        'label'    => __( 'Menu Font Weight', 'packers-agency' ),
        'section'  => 'packers_agency_header_section_settings',
        'type'     => 'select',
        'choices'  => array(
            '100' => __( '100 - Thin', 'packers-agency' ),
            '200' => __( '200 - Extra Light', 'packers-agency' ),
            '300' => __( '300 - Light', 'packers-agency' ),
            '400' => __( '400 - Normal', 'packers-agency' ),
            '500' => __( '500 - Medium', 'packers-agency' ),
            '600' => __( '600 - Semi Bold', 'packers-agency' ),
            '700' => __( '700 - Bold', 'packers-agency' ),
            '800' => __( '800 - Extra Bold', 'packers-agency' ),
            '900' => __( '900 - Black', 'packers-agency' ),
        ),
    ) );

    // Add Setting for Menu Text Transform
    $wp_customize->add_setting( 'packers_agency_menu_text_transform', array(
        'default'           => 'Capitalize',
        'sanitize_callback' => 'packers_agency_sanitize_text_transform',
    ) );

    // Add Control for Menu Text Transform
    $wp_customize->add_control( 'packers_agency_menu_text_transform', array(
        'label'    => __( 'Menu Text Transform', 'packers-agency' ),
        'section'  => 'packers_agency_header_section_settings',
        'type'     => 'select',
        'choices'  => array(
            'none'       => __( 'None', 'packers-agency' ),
            'capitalize' => __( 'Capitalize', 'packers-agency' ),
            'uppercase'  => __( 'Uppercase', 'packers-agency' ),
            'lowercase'  => __( 'Lowercase', 'packers-agency' ),
        ),
    ) );

    $wp_customize->add_setting('packers_agency_menus_style',array(
        'default' => '',
        'sanitize_callback' => 'packers_agency_sanitize_choices'
	));
	$wp_customize->add_control('packers_agency_menus_style',array(
        'type' => 'select',
		'label' => __('Menu Hover Style','packers-agency'),
		'section' => 'packers_agency_header_section_settings',
		'choices' => array(
         'None' => __('None','packers-agency'),
         'Zoom In' => __('Zoom In','packers-agency'),
      ),
	));

    /** Socail Section Settings */
    $wp_customize->add_section(
        'packers_agency_social_section_settings',
        array(
            'title' => esc_html__( 'Social Media Section Settings', 'packers-agency' ),
            'priority' => 30,
            'capability' => 'edit_theme_options',
            'panel' => 'packers_agency_home_page_settings',
        )
    );

    /** Socail Section control */
    $wp_customize->add_setting( 
        'packers_agency_social_icon_setting', 
        array(
            'default' => false,
            'sanitize_callback' => 'packers_agency_sanitize_checkbox',
        ) 
    );

    $wp_customize->add_control(
        'packers_agency_social_icon_setting',
        array(
            'label'       => __( 'Show Social Icon', 'packers-agency' ),
            'section'     => 'packers_agency_social_section_settings',
            'type'        => 'checkbox',
        )
    );

    /**  Social Link 1 */
    $wp_customize->add_setting(
        'packers_agency_social_link_1',
        array( 
            'default' => '',
            'sanitize_callback' => 'esc_url_raw',
            'transport'         => 'refresh'
        )
    );
    
    $wp_customize->add_control(
        'packers_agency_social_link_1',
        array(
            'label' => esc_html__( 'Add Facebook Link', 'packers-agency' ),
            'section' => 'packers_agency_social_section_settings',
            'type' => 'url',
        )
    );

    /**  Social Link 2 */
    $wp_customize->add_setting(
        'packers_agency_social_link_2',
        array( 
            'default' => '',
            'sanitize_callback' => 'esc_url_raw',
            'transport'         => 'refresh'
        )
    );
    
    $wp_customize->add_control(
        'packers_agency_social_link_2',
        array(
            'label' => esc_html__( 'Add Twitter Link', 'packers-agency' ),
            'section' => 'packers_agency_social_section_settings',
            'type' => 'url',
        )
    );

    /**  Social Link 3 */
    $wp_customize->add_setting(
        'packers_agency_social_link_3',
        array( 
            'default' => '',
            'sanitize_callback' => 'esc_url_raw',
            'transport'         => 'refresh'
        )
    );
    
    $wp_customize->add_control(
        'packers_agency_social_link_3',
        array(
            'label' => esc_html__( 'Add Instagram Link', 'packers-agency' ),
            'section' => 'packers_agency_social_section_settings',
            'type' => 'url',
        )
    );

    /**  Social Link 4 */
    $wp_customize->add_setting(
        'packers_agency_social_link_4',
        array( 
            'default' => '',
            'sanitize_callback' => 'esc_url_raw',
            'transport'         => 'refresh'
        )
    );
    
    $wp_customize->add_control(
        'packers_agency_social_link_4',
        array(
            'label' => esc_html__( 'Add Pintrest Link', 'packers-agency' ),
            'section' => 'packers_agency_social_section_settings',
            'type' => 'url',
        )
    );

    /** Socail Section Settings End */


    /** Home Page Settings */
    $wp_customize->add_panel( 
        'packers_agency_home_page_settings',
         array(
            'priority' => 9,
            'capability' => 'edit_theme_options',
            'title' => esc_html__( 'Home Page Settings', 'packers-agency' ),
            'description' => esc_html__( 'Customize Home Page Settings', 'packers-agency' ),
        ) 
    );

    /** Slider Section Settings */
    $wp_customize->add_section(
        'packers_agency_slider_section_settings',
        array(
            'title' => esc_html__( 'Slider Section Settings', 'packers-agency' ),
            'priority' => 30,
            'capability' => 'edit_theme_options',
            'panel' => 'packers_agency_home_page_settings',
        )
    );

    /** Slider Section control */
    $wp_customize->add_setting( 
        'packers_agency_slider_setting', 
        array(
            'default' => false,
            'sanitize_callback' => 'packers_agency_sanitize_checkbox',
        ) 
    );

    $wp_customize->add_control(
        'packers_agency_slider_setting',
        array(
            'label'       => __( 'Show Slider', 'packers-agency' ),
            'section'     => 'packers_agency_slider_section_settings',
            'type'        => 'checkbox',
        )
    );
    
    $categories = get_categories();
        $cat_posts = array();
            $i = 0;
            $cat_posts[]='Select';
        foreach($categories as $category){
            if($i==0){
            $default = $category->slug;
            $i++;
        }
        $cat_posts[$category->slug] = $category->name;
    }

    $wp_customize->add_setting(
        'packers_agency_blog_slide_category',
        array(
            'default'   => 'select',
            'sanitize_callback' => 'packers_agency_sanitize_choices',
        )
    );
    $wp_customize->add_control(
        'packers_agency_blog_slide_category',
        array(
            'type'    => 'select',
            'choices' => $cat_posts,
            'label' => __('Select Category to display Slides','packers-agency'),
            'section' => 'packers_agency_slider_section_settings',
        )
    );

    // Section Text
    $wp_customize->add_setting('packers_agency_slider_text_extra', 
        array(
        'default'           => '',
        'type'              => 'theme_mod',
        'capability'        => 'edit_theme_options',    
        'sanitize_callback' => 'sanitize_text_field'
        )
    );

    $wp_customize->add_control('packers_agency_slider_text_extra', 
        array(
        'label'       => __('Slider Extra Title', 'packers-agency'),
        'section'     => 'packers_agency_slider_section_settings',   
        'settings'    => 'packers_agency_slider_text_extra',
        'type'        => 'text'
        )
    );

    $wp_customize->add_setting('packers_agency_slider_shortcode',array(
      'default' => '',
      'sanitize_callback' => 'sanitize_text_field'
    ));
    $wp_customize->add_control('packers_agency_slider_shortcode',array(
      'label' => __('Contact Form Shortcode','packers-agency'),
      'section' => 'packers_agency_slider_section_settings',
      'setting' => 'packers_agency_slider_shortcode',
      'type'    => 'text'
    ));

    /** About Section Settings */
    
    $wp_customize->add_section( 'packers_agency_section_featured_about',
        array(
        'title'      => __( 'Services Section', 'packers-agency' ),
        'priority'   => 110,
        'capability' => 'edit_theme_options',
        'panel'      => 'packers_agency_home_page_settings',
        )
    );

    /** Blog Section control */
    $wp_customize->add_setting( 
        'packers_agency_about_setting', 
        array(
            'default' => false ,
            'sanitize_callback' => 'packers_agency_sanitize_checkbox',
        ) 
    );

    $wp_customize->add_control(
        'packers_agency_about_setting',
        array(
            'label'       => __( 'Show Services', 'packers-agency' ),
            'section'     => 'packers_agency_section_featured_about',
            'type'        => 'checkbox',
        )
    );

    // Post Categories
    $categories = get_categories();
    $cat_posts = array();
    $default = '';
    $cat_posts[] = 'Select';
    foreach ($categories as $category) {
        $cat_posts[$category->slug] = $category->name;
    }

    $wp_customize->add_setting(
        'packers_agency_trending_post_slider_args_',
        array(
            'default'            => 'select',
            'sanitize_callback'  => 'packers_agency_sanitize_choices',
        )
    );
    $wp_customize->add_control(
        'packers_agency_trending_post_slider_args_',
        array(
            'type'     => 'select',
            'choices'  => $cat_posts,
            'label'    => __('Select Category to display Tab Details', 'packers-agency'),
            'section'  => 'packers_agency_section_featured_about',
        )
    );

        for ($i=1; $i <= 12; $i++) {

    // Discount Text
    $wp_customize->add_setting('packers_agency_category_discount_text'.$i, 
        array(
        'default'           => '',
        'type'              => 'theme_mod',
        'capability'        => 'edit_theme_options',    
        'sanitize_callback' => 'sanitize_text_field'
        )
    );

    $wp_customize->add_control('packers_agency_category_discount_text'.$i, 
        array(
        'label'       => __('Discount Text ', 'packers-agency').$i,
        'section'     => 'packers_agency_section_featured_about',   
        'settings'    => 'packers_agency_category_discount_text'.$i,
        'type'        => 'text'
        )
    );

        // Discount Text
    $wp_customize->add_setting('packers_agency_category_discounted_percentage'.$i, 
        array(
        'default'           => '',
        'type'              => 'theme_mod',
        'capability'        => 'edit_theme_options',    
        'sanitize_callback' => 'sanitize_text_field'
        )
    );

    $wp_customize->add_control('packers_agency_category_discounted_percentage'.$i, 
        array(
        'label'       => __('Discounted Percent ', 'packers-agency').$i,
        'section'     => 'packers_agency_section_featured_about',   
        'settings'    => 'packers_agency_category_discounted_percentage'.$i,
        'type'        => 'text'
        )
    );
}
    
    /** Home Page Settings Ends */
    
    /** Footer Section */
    $wp_customize->add_section(
        'packers_agency_footer_section',
        array(
            'title' => __( 'Footer Settings', 'packers-agency' ),
            'priority' => 1000,
            'panel' => 'packers_agency_home_page_settings',
        )
    );

    /** Footer Widget Columns */
    $wp_customize->add_setting('packers_agency_footer_widget_areas', array(
        'default'           => 4,
        'sanitize_callback' => 'packers_agency_sanitize_choices',
    ));

    $wp_customize->add_control('packers_agency_footer_widget_areas', array(
        'label'    => __('Footer Widget Columns', 'packers-agency'),
        'section'  => 'packers_agency_footer_section',
        'settings' => 'packers_agency_footer_widget_areas',
        'type'     => 'select',
        'choices'  => array(
		   '1'     => __('One', 'packers-agency'),
		   '2'     => __('Two', 'packers-agency'),
		   '3'     => __('Three', 'packers-agency'),
		   '4'     => __('Four', 'packers-agency')
        ),
    ));

    /** Footer Copyright control */
    $wp_customize->add_setting( 
        'packers_agency_footer_setting', 
        array(
            'default' => true,
            'sanitize_callback' => 'packers_agency_sanitize_checkbox',
        ) 
    );

    $wp_customize->add_control(
        'packers_agency_footer_setting',
        array(
            'label'       => __( 'Show Footer Copyright', 'packers-agency' ),
            'section'     => 'packers_agency_footer_section',
            'type'        => 'checkbox',
        )
    );
    
    /** Copyright Text */
    $wp_customize->add_setting(
        'packers_agency_footer_copyright_text',
        array(
            'default' => '',
            'sanitize_callback' => 'sanitize_text_field',
        )
    );
    
    $wp_customize->add_control(
        'packers_agency_footer_copyright_text',
        array(
            'label' => __( 'Copyright Info', 'packers-agency' ),
            'section' => 'packers_agency_footer_section',
            'type' => 'text',
        )
    );  
$wp_customize->add_setting('packers_agency_footer_background_image',
        array(
        'default' => '',
        'capability' => 'edit_theme_options',
        'sanitize_callback' => 'absint',
        )
    );


    $wp_customize->add_control(
         new WP_Customize_Cropped_Image_Control($wp_customize, 'packers_agency_footer_background_image',
            array(
                'label' => esc_html__('Footer Background Image', 'packers-agency'),
                /* translators: 1: image width in pixels, 2: image height in pixels */
                'description' => sprintf(esc_html__('Recommended Size %1$s px X %2$s px', 'packers-agency'), 1024, 800),
                'section' => 'packers_agency_footer_section',
                'width' => 1024,
                'height' => 800,
                'flex_width' => true,
                'flex_height' => true,
            )
        )
    );

    /** Footer Background Image Attachment */
    $wp_customize->add_setting('packers_agency_background_attatchment', array(
        'default'           => 'scroll',
        'sanitize_callback' => 'packers_agency_sanitize_choices',
    ));

    $wp_customize->add_control('packers_agency_background_attatchment', array(
        'label'    => __('Footer Background Attachment', 'packers-agency'),
        'section'  => 'packers_agency_footer_section',
        'settings' => 'packers_agency_background_attatchment',
        'type'     => 'select',
        'choices'  => array(
            'fixed' => __('fixed','packers-agency'),
            'scroll' => __('scroll','packers-agency'),
        ),
    ));

    /* Footer Background Color*/
    $wp_customize->add_setting(
        'packers_agency_footer_background_color',
        array(
            'default' => '',
            'sanitize_callback' => 'sanitize_hex_color',
        )
    );
    $wp_customize->add_control(
        new WP_Customize_Color_Control(
            $wp_customize,
            'packers_agency_footer_background_color',
            array(
                'label' => __('Footer Widget Area Background Color', 'packers-agency'),
                'section' => 'packers_agency_footer_section',
                'type' => 'color',
            )
        )
    );

 /** Scroll to top control */
    $wp_customize->add_setting( 
        'packers_agency_scroll_to_top', 
        array(
            'default' => 1,
            'sanitize_callback' => 'packers_agency_sanitize_checkbox',
        ) 
    );

    $wp_customize->add_control(
        'packers_agency_scroll_to_top',
        array(
            'label'       => __( 'Show Scroll To Top', 'packers-agency' ),
            'section'     => 'packers_agency_footer_section',
            'type'        => 'checkbox',
        )
    );

     $wp_customize->add_setting('packers_agency_scroll_icon',array(
        'default'   => 'fas fa-arrow-up',
        'sanitize_callback' => 'sanitize_text_field'
    ));
    $wp_customize->add_control(new Packers_Agency_Changeable_Icon(
        $wp_customize,'packers_agency_scroll_icon',array(
        'label' => __('Scroll Top Icon','packers-agency'),
        'transport' => 'refresh',
        'section'   => 'packers_agency_footer_section',
        'type'      => 'icon'
    )));

    $wp_customize->add_setting('packers_agency_scroll_top_alignment',array(
        'default' => 'right-align',
        'sanitize_callback' => 'packers_agency_sanitize_scroll_top_alignment'
    ));
    $wp_customize->add_control('packers_agency_scroll_top_alignment',array(
        'type' => 'select',
        'label' => __('Scroll Top Alignment','packers-agency'),
        'section' => 'packers_agency_footer_section',
        'choices' => array(
            'right-align' => __('Right Alignment','packers-agency'),
            'center-align' => __('Center Alignment','packers-agency'),
            'left-align' => __('Left Alignment','packers-agency'),
        ),
    ) );

    /** Scroll to top button shape */
    $wp_customize->add_setting('packers_agency_scroll_to_top_radius', array(
        'default'           => 'curved-box',
        'sanitize_callback' => 'packers_agency_sanitize_choices',
    ));

    $wp_customize->add_control('packers_agency_scroll_to_top_radius', array(
        'label'    => __('Scroll Top Button Shape', 'packers-agency'),
        'section'  => 'packers_agency_footer_section',
        'settings' => 'packers_agency_scroll_to_top_radius',
        'type'     => 'select',
        'choices'  => array(
            'box'        => __( 'Box', 'packers-agency' ),
            'curved-box' => __( 'Curved Box', 'packers-agency' ),
            'circle'     => __( 'Circle', 'packers-agency' ),
        ),
    ));

    // 404 PAGE SETTINGS
    $wp_customize->add_section(
        'packers_agency_404_section',
        array(
            'title' => __( '404 Page Settings', 'packers-agency' ),
            'priority' => 70,
            'panel' => 'packers_agency_general_settings',
        )
    );
   
    $wp_customize->add_setting('404_page_image', array(
        'default' => '',
        'transport' => 'refresh',
        'sanitize_callback' => 'esc_url_raw', // Sanitize as URL
    ));

    $wp_customize->add_control(new WP_Customize_Image_Control($wp_customize, '404_page_image', array(
        'label' => __('404 Page Image', 'packers-agency'),
        'section' => 'packers_agency_404_section',
        'settings' => '404_page_image',
    )));

    $wp_customize->add_setting('404_pagefirst_header', array(
        'default' => __('404', 'packers-agency'),
        'transport' => 'refresh',
        'sanitize_callback' => 'sanitize_text_field', // Sanitize as text field
    ));

    $wp_customize->add_control('404_pagefirst_header', array(
        'type' => 'text',
        'label' => __('Heading', 'packers-agency'),
        'section' => 'packers_agency_404_section',
    ));

    // Setting for 404 page header
    $wp_customize->add_setting('404_page_header', array(
        'default' => __('Sorry, that page can\'t be found!', 'packers-agency'),
        'transport' => 'refresh',
        'sanitize_callback' => 'sanitize_text_field', // Sanitize as text field
    ));

    $wp_customize->add_control('404_page_header', array(
        'type' => 'text',
        'label' => __('Heading', 'packers-agency'),
        'section' => 'packers_agency_404_section',
    ));

}
add_action( 'customize_register', 'packers_agency_customize_register' );
endif;

/**
 * Binds JS handlers to make Theme Customizer preview reload changes asynchronously.
 */
function packers_agency_customize_preview_js() {
    // Use minified libraries if SCRIPT_DEBUG is false
    $packers_agency_build  = ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ) ? '/build' : '';
    $packers_agency_suffix = ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ) ? '' : '.min';
	wp_enqueue_script( 'packers_agency_customizer', get_template_directory_uri() . '/js' . $packers_agency_build . '/customizer' . $packers_agency_suffix . '.js', array( 'customize-preview' ), '20130508', true );
}
add_action( 'customize_preview_init', 'packers_agency_customize_preview_js' );
